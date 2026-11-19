import React, { useContext, useMemo, useState } from "react";
import PageNav from "../../Componentes/PageNav";
import LogoTitulo from "../../Componentes/LogoTitulo";
import DropdownMenu from "../../Componentes/DropdownMenu";
import { PasswordContext } from "../../PasswordContext/PasswordContext";
import LogingForm from "../../Componentes/LogingForm";
import { exportPlanesToExcel } from "../../utils/ExcelExportPlan";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import "./ventas.css";

const norm = (v) => (v == null ? "" : String(v).trim());

const getClientType = (cliente) => {
  if (!cliente) return "";
  let tipo = "";
  if (cliente.client_subdivision && cliente.client_subdivision !== "") {
    const partes = String(cliente.client_subdivision).split("_");
    if (partes.length >= 2 && partes[1]) {
      tipo = partes[1].toUpperCase();
    }
  }
  if (!tipo && cliente.client_type_name) {
    tipo = String(cliente.client_type_name).trim().toUpperCase();
  }
  return tipo;
};

const mapCycleValue = (val, cliente) => {
  if (val === null || val === undefined) return "N/A";
  const tipo = getClientType(cliente);
  if (tipo !== "PYME") {
    return "1";
  }
  const cycle = String(val).trim();
  if (cycle === "10") return "15";
  if (cycle === "25") return "30";
  return cycle;
};

const cleanPlanName = (rawName) => {
  return String(rawName || "Sin Plan")
    .replace(/RECURRENTE\s+/gi, "")
    .replace(/PLAN\s+/gi, "")
    .trim();
};

const getExportTimestamp = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const d = pad(now.getDate());
  const m = pad(now.getMonth() + 1);
  const y = now.getFullYear();
  const h = pad(now.getHours());
  const min = pad(now.getMinutes());
  return `${d}/${m}/${y} ${h}:${min}`;
};

function Ventas() {
  const { showPasswordState, data } = useContext(PasswordContext);

  const [lastUpdatedTime] = useState(() => {
    const now = new Date();
    const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
    const day = now.getDate();
    const month = months[now.getMonth()];
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, "0");
    const mins = String(now.getMinutes()).padStart(2, "0");
    return `${day} ${month} ${year}, ${hours}:${mins}`;
  });

  const stats = useMemo(() => {
    if (!data || !data.results) return null;
    const clientes = data.results;

    // Filter active PYME and RESIDENCIAL clients
    const activeClients = clientes.filter(curr => {
      let isActive = false;
      if (curr.client_subdivision && curr.client_subdivision !== "") {
        isActive = String(curr.client_subdivision).includes("ACTIVO");
      } else if (curr.status_name) {
        isActive = curr.status_name === "Activo" || curr.status_name === "Activos";
      }
      if (!isActive) return false;

      let tipoServicio = null;
      if (curr.client_subdivision && curr.client_subdivision !== "") {
        const partes = String(curr.client_subdivision).split("_");
        if (partes.length >= 2 && partes[1]) {
          tipoServicio = partes[1].toUpperCase();
        }
      }
      if (!tipoServicio && curr.client_type_name) {
        tipoServicio = String(curr.client_type_name).trim().toUpperCase();
      }

      return tipoServicio === "PYME" || tipoServicio === "RESIDENCIAL";
    });

    // Agrupación por plan con detalles de ingresos
    const planesData = activeClients.reduce((acc, curr) => {
      let planName = curr.plan?.name || "Sin Plan";
      planName = planName.replace(/RECURRENTE\s+/gi, "").replace(/PLAN\s+/gi, "").trim();
      const planCost = parseFloat(curr.plan?.cost) || 0;

      let category = null;
      let tipoServicio = null;
      if (curr.client_subdivision && curr.client_subdivision !== "") {
        const partes = String(curr.client_subdivision).split("_");
        if (partes.length >= 2 && partes[1]) {
          tipoServicio = partes[1].toUpperCase();
        }
      }
      if (!tipoServicio && curr.client_type_name) {
        tipoServicio = String(curr.client_type_name).trim().toUpperCase();
      }

      if (tipoServicio === "PYME") {
        category = "PYME";
      } else if (tipoServicio === "RESIDENCIAL") {
        category = "RESIDENCIAL";
      }

      if (!category) return acc;

      if (!acc[planName]) {
        acc[planName] = {
          name: planName,
          count: 0,
          activeCount: 0,
          cost: planCost,
          revenue: 0,
          category: category
        };
      }
      
      acc[planName].count += 1;
      acc[planName].activeCount += 1;
      acc[planName].revenue += planCost;
      return acc;
    }, {});

    const allPlanes = Object.values(planesData).sort((a, b) => b.count - a.count);
    const topPlanes = allPlanes.slice(0, 5);

    const total = activeClients.length;
    const nuevos = clientes.filter(c => c.status_name === "Activo").length;
    
    const categoryStats = Object.values(planesData).reduce((acc, curr) => {
      if (curr.category === "PYME") {
        acc.pymeRevenue += curr.revenue;
        acc.pymeCount += curr.count;
      } else {
        acc.residencialRevenue += curr.revenue;
        acc.residencialCount += curr.count;
      }
      acc.totalRevenue += curr.revenue;
      return acc;
    }, { pymeRevenue: 0, pymeCount: 0, residencialRevenue: 0, residencialCount: 0, totalRevenue: 0 });

    return { topPlanes, allPlanes, nuevos, total, ...categoryStats };
  }, [data]);

  const formatCurrency = (val) => new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true }).format(val) + " US$";

  const handleExportActiveClientsExcel = async () => {
    if (!data || !data.results) return;

    // Filtramos clientes activos de tipo PYME o RESIDENCIAL
    const activeClients = data.results.filter((curr) => {
      let isActive = false;
      if (curr.client_subdivision && curr.client_subdivision !== "") {
        isActive = String(curr.client_subdivision).includes("ACTIVO");
      } else if (curr.status_name) {
        isActive = curr.status_name === "Activo" || curr.status_name === "Activos";
      }
      if (!isActive) return false;

      const tipoServicio = getClientType(curr);
      return tipoServicio === "PYME" || tipoServicio === "RESIDENCIAL";
    });

    if (activeClients.length === 0) {
      console.warn("No hay clientes activos para exportar.");
      return;
    }

    // Filtro de exclusión de cuentas de prueba / whitelist corporativo
    const whitelist = ["ELISAUL REYES", "THAIS BEJAS"];
    const validClients = activeClients.filter((cliente) => {
      if (!cliente) return false;
      const name = String(cliente.client_name || "").toUpperCase().replace(/\s+/g, " ");
      if (name.includes("FREDDY CARRILLO") || name.includes("BRYANT REYES")) return false;
      if (whitelist.some((w) => name.includes(w.toUpperCase().replace(/\s+/g, " ")))) return true;
      return !name.includes("PRUEBA");
    });

    if (validClients.length === 0) {
      console.warn("No hay clientes válidos tras aplicar filtros de prueba.");
      return;
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Sisprot BI - Operaciones";
    workbook.created = new Date();

    const BLUE_THEME = "FF0070C0";
    const NAVY_HEADER = "FF0F172A";
    const LIGHT_BORDER = "FFCBD5E1";
    const SUB_RES_BG = "FFE0F2FE";
    const SUB_PYME_BG = "FFEDE9FE";
    const TOTAL_BG = "FFDCE6F1";
    const currencyFmt = '"$ "#,##0.00';

    // Agrupación por Plan y Categoría (PYME / RESIDENCIAL)
    const planesMap = {};
    validClients.forEach((c) => {
      const tipo = getClientType(c) || "RESIDENCIAL";
      const planName = cleanPlanName(c.plan?.name);
      const cost = parseFloat(c.plan?.cost || 0);
      const key = `${tipo}_${planName}`;

      if (!planesMap[key]) {
        planesMap[key] = {
          name: planName,
          category: tipo,
          cost: cost,
          count: 0,
          revenue: 0
        };
      }
      planesMap[key].count += 1;
      planesMap[key].revenue += cost;
    });

    const planesList = Object.values(planesMap);
    const residencialPlanes = planesList
      .filter((p) => p.category === "RESIDENCIAL")
      .sort((a, b) => b.count - a.count);

    const pymePlanes = planesList
      .filter((p) => p.category === "PYME")
      .sort((a, b) => b.count - a.count);

    const totalClientesGeneral = validClients.length;
    const totalIngresosGeneral = validClients.reduce((acc, c) => acc + (parseFloat(c.plan?.cost) || 0), 0);

    // =========================================================================
    // HOJA 1: RESUMEN POR PLAN
    // =========================================================================
    const sheetResumen = workbook.addWorksheet("Resumen por Plan", {
      views: [{ showGridLines: true }]
    });

    sheetResumen.columns = [
      { key: "num", width: 8 },
      { key: "name", width: 36 },
      { key: "category", width: 20 },
      { key: "cost", width: 18 },
      { key: "count", width: 26 },
      { key: "revenue", width: 26 },
      { key: "participation", width: 20 }
    ];

    // Fila 1: Título principal
    sheetResumen.mergeCells("A1:G1");
    const titleCell = sheetResumen.getCell("A1");
    titleCell.value = "CANTIDAD DE CLIENTES ACTIVOS POR PLAN (PYMES Y RESIDENCIALES)";
    titleCell.font = { name: "Segoe UI", size: 14, bold: true, color: { argb: BLUE_THEME } };
    titleCell.alignment = { horizontal: "left", vertical: "middle" };
    sheetResumen.getRow(1).height = 36;

    // Fila 2: Subtítulo con fecha y detalles
    sheetResumen.mergeCells("A2:G2");
    const subCell = sheetResumen.getCell("A2");
    subCell.value = `Filtro aplicado: Clientes Activos (Únicamente PYMES y RESIDENCIALES) | Generado: ${getExportTimestamp()} | Sisprot BI`;
    subCell.font = { name: "Segoe UI", size: 9, italic: true, color: { argb: "FF64748B" } };
    subCell.alignment = { horizontal: "left", vertical: "middle" };
    sheetResumen.getRow(2).height = 20;

    // Fila 4: Cabecera de la tabla
    const headerRowResumen = sheetResumen.getRow(4);
    headerRowResumen.values = [
      "N°",
      "Plan",
      "Tipo de Cliente",
      "Precio ($)",
      "Cantidad de Clientes Activos",
      "Monto Total ($)",
      "% Participación"
    ];
    headerRowResumen.height = 28;
    headerRowResumen.eachCell((cell) => {
      cell.font = { name: "Segoe UI", bold: true, size: 10, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY_HEADER } };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border = {
        top: { style: "thin", color: { argb: BLUE_THEME } },
        bottom: { style: "medium", color: { argb: BLUE_THEME } },
        left: { style: "thin", color: { argb: LIGHT_BORDER } },
        right: { style: "thin", color: { argb: LIGHT_BORDER } }
      };
    });

    let currentResumenRow = 5;

    // --- BLOQUE 1: PLANES RESIDENCIALES ---
    if (residencialPlanes.length > 0) {
      sheetResumen.mergeCells(`A${currentResumenRow}:G${currentResumenRow}`);
      const secResCell = sheetResumen.getCell(`A${currentResumenRow}`);
      secResCell.value = `PLANES RESIDENCIALES (${residencialPlanes.length} planes)`;
      secResCell.font = { name: "Segoe UI", bold: true, size: 10, color: { argb: "FF0284C7" } };
      secResCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F9FF" } };
      secResCell.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
      sheetResumen.getRow(currentResumenRow).height = 24;
      sheetResumen.getRow(currentResumenRow).eachCell((c) => {
        c.border = {
          top: { style: "thin", color: { argb: LIGHT_BORDER } },
          bottom: { style: "thin", color: { argb: LIGHT_BORDER } }
        };
      });
      currentResumenRow++;

      const startResRow = currentResumenRow;
      residencialPlanes.forEach((plan, idx) => {
        const row = sheetResumen.getRow(currentResumenRow);
        row.values = [
          idx + 1,
          plan.name,
          plan.category,
          plan.cost,
          plan.count,
          plan.revenue,
          totalClientesGeneral > 0 ? plan.count / totalClientesGeneral : 0
        ];
        row.height = 22;

        row.eachCell((cell, colNumber) => {
          cell.font = { name: "Segoe UI", size: 10 };
          cell.border = {
            top: { style: "thin", color: { argb: LIGHT_BORDER } },
            bottom: { style: "thin", color: { argb: LIGHT_BORDER } },
            left: { style: "thin", color: { argb: LIGHT_BORDER } },
            right: { style: "thin", color: { argb: LIGHT_BORDER } }
          };
          if (colNumber === 1 || colNumber === 3) {
            cell.alignment = { horizontal: "center", vertical: "middle" };
          } else if (colNumber === 2) {
            cell.alignment = { horizontal: "left", vertical: "middle" };
          } else if (colNumber === 4 || colNumber === 6) {
            cell.alignment = { horizontal: "right", vertical: "middle" };
            cell.numFmt = currencyFmt;
          } else if (colNumber === 5) {
            cell.alignment = { horizontal: "right", vertical: "middle" };
            cell.numFmt = "#,##0";
          } else if (colNumber === 7) {
            cell.alignment = { horizontal: "center", vertical: "middle" };
            cell.numFmt = "0.00%";
          }
        });
        currentResumenRow++;
      });

      const endResRow = currentResumenRow - 1;
      const subResRow = sheetResumen.getRow(currentResumenRow);
      const subResCount = residencialPlanes.reduce((acc, p) => acc + p.count, 0);
      const subResRev = residencialPlanes.reduce((acc, p) => acc + p.revenue, 0);

      subResRow.values = [
        "",
        "SUBTOTAL RESIDENCIAL",
        "RESIDENCIAL",
        "",
        { formula: `SUM(E${startResRow}:E${endResRow})`, result: subResCount },
        { formula: `SUM(F${startResRow}:F${endResRow})`, result: subResRev },
        totalClientesGeneral > 0 ? subResCount / totalClientesGeneral : 0
      ];
      subResRow.height = 24;
      subResRow.eachCell((cell, colNumber) => {
        cell.font = { name: "Segoe UI", bold: true, size: 10, color: { argb: "FF0369A1" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: SUB_RES_BG } };
        cell.border = {
          top: { style: "thin", color: { argb: "FF0284C7" } },
          bottom: { style: "medium", color: { argb: "FF0284C7" } },
          left: { style: "thin", color: { argb: LIGHT_BORDER } },
          right: { style: "thin", color: { argb: LIGHT_BORDER } }
        };
        if (colNumber === 2 || colNumber === 3) {
          cell.alignment = { horizontal: "left", vertical: "middle" };
        } else if (colNumber === 5) {
          cell.alignment = { horizontal: "right", vertical: "middle" };
          cell.numFmt = "#,##0";
        } else if (colNumber === 6) {
          cell.alignment = { horizontal: "right", vertical: "middle" };
          cell.numFmt = currencyFmt;
        } else if (colNumber === 7) {
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.numFmt = "0.00%";
        }
      });
      currentResumenRow++;
    }

    // Fila de separación
    sheetResumen.getRow(currentResumenRow).height = 12;
    currentResumenRow++;

    // --- BLOQUE 2: PLANES PYME ---
    if (pymePlanes.length > 0) {
      sheetResumen.mergeCells(`A${currentResumenRow}:G${currentResumenRow}`);
      const secPymeCell = sheetResumen.getCell(`A${currentResumenRow}`);
      secPymeCell.value = `PLANES PYME (${pymePlanes.length} planes)`;
      secPymeCell.font = { name: "Segoe UI", bold: true, size: 10, color: { argb: "FF7C3AED" } };
      secPymeCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F3FF" } };
      secPymeCell.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
      sheetResumen.getRow(currentResumenRow).height = 24;
      sheetResumen.getRow(currentResumenRow).eachCell((c) => {
        c.border = {
          top: { style: "thin", color: { argb: LIGHT_BORDER } },
          bottom: { style: "thin", color: { argb: LIGHT_BORDER } }
        };
      });
      currentResumenRow++;

      const startPymeRow = currentResumenRow;
      pymePlanes.forEach((plan, idx) => {
        const row = sheetResumen.getRow(currentResumenRow);
        row.values = [
          idx + 1,
          plan.name,
          plan.category,
          plan.cost,
          plan.count,
          plan.revenue,
          totalClientesGeneral > 0 ? plan.count / totalClientesGeneral : 0
        ];
        row.height = 22;

        row.eachCell((cell, colNumber) => {
          cell.font = { name: "Segoe UI", size: 10 };
          cell.border = {
            top: { style: "thin", color: { argb: LIGHT_BORDER } },
            bottom: { style: "thin", color: { argb: LIGHT_BORDER } },
            left: { style: "thin", color: { argb: LIGHT_BORDER } },
            right: { style: "thin", color: { argb: LIGHT_BORDER } }
          };
          if (colNumber === 1 || colNumber === 3) {
            cell.alignment = { horizontal: "center", vertical: "middle" };
          } else if (colNumber === 2) {
            cell.alignment = { horizontal: "left", vertical: "middle" };
          } else if (colNumber === 4 || colNumber === 6) {
            cell.alignment = { horizontal: "right", vertical: "middle" };
            cell.numFmt = currencyFmt;
          } else if (colNumber === 5) {
            cell.alignment = { horizontal: "right", vertical: "middle" };
            cell.numFmt = "#,##0";
          } else if (colNumber === 7) {
            cell.alignment = { horizontal: "center", vertical: "middle" };
            cell.numFmt = "0.00%";
          }
        });
        currentResumenRow++;
      });

      const endPymeRow = currentResumenRow - 1;
      const subPymeRow = sheetResumen.getRow(currentResumenRow);
      const subPymeCount = pymePlanes.reduce((acc, p) => acc + p.count, 0);
      const subPymeRev = pymePlanes.reduce((acc, p) => acc + p.revenue, 0);

      subPymeRow.values = [
        "",
        "SUBTOTAL PYME",
        "PYME",
        "",
        { formula: `SUM(E${startPymeRow}:E${endPymeRow})`, result: subPymeCount },
        { formula: `SUM(F${startPymeRow}:F${endPymeRow})`, result: subPymeRev },
        totalClientesGeneral > 0 ? subPymeCount / totalClientesGeneral : 0
      ];
      subPymeRow.height = 24;
      subPymeRow.eachCell((cell, colNumber) => {
        cell.font = { name: "Segoe UI", bold: true, size: 10, color: { argb: "FF6D28D9" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: SUB_PYME_BG } };
        cell.border = {
          top: { style: "thin", color: { argb: "FF7C3AED" } },
          bottom: { style: "medium", color: { argb: "FF7C3AED" } },
          left: { style: "thin", color: { argb: LIGHT_BORDER } },
          right: { style: "thin", color: { argb: LIGHT_BORDER } }
        };
        if (colNumber === 2 || colNumber === 3) {
          cell.alignment = { horizontal: "left", vertical: "middle" };
        } else if (colNumber === 5) {
          cell.alignment = { horizontal: "right", vertical: "middle" };
          cell.numFmt = "#,##0";
        } else if (colNumber === 6) {
          cell.alignment = { horizontal: "right", vertical: "middle" };
          cell.numFmt = currencyFmt;
        } else if (colNumber === 7) {
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.numFmt = "0.00%";
        }
      });
      currentResumenRow++;
    }

    // Fila de separación antes del total
    sheetResumen.getRow(currentResumenRow).height = 14;
    currentResumenRow++;

    // --- FILA TOTAL GENERAL ---
    const totalRow = sheetResumen.getRow(currentResumenRow);
    totalRow.values = [
      "",
      "TOTAL GENERAL (RESIDENCIAL + PYME)",
      "TODOS",
      "",
      totalClientesGeneral,
      totalIngresosGeneral,
      1
    ];
    totalRow.height = 28;
    totalRow.eachCell((cell, colNumber) => {
      cell.font = { name: "Segoe UI", bold: true, size: 11, color: { argb: "FF0F172A" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TOTAL_BG } };
      cell.border = {
        top: { style: "medium", color: { argb: BLUE_THEME } },
        bottom: { style: "double", color: { argb: BLUE_THEME } },
        left: { style: "thin", color: { argb: LIGHT_BORDER } },
        right: { style: "thin", color: { argb: LIGHT_BORDER } }
      };
      if (colNumber === 2 || colNumber === 3) {
        cell.alignment = { horizontal: "left", vertical: "middle" };
      } else if (colNumber === 5) {
        cell.alignment = { horizontal: "right", vertical: "middle" };
        cell.numFmt = "#,##0";
      } else if (colNumber === 6) {
        cell.alignment = { horizontal: "right", vertical: "middle" };
        cell.numFmt = currencyFmt;
      } else if (colNumber === 7) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.numFmt = "0.00%";
      }
    });

    // =========================================================================
    // HOJA 2: DETALLE CLIENTES
    // =========================================================================
    const sheetDetalle = workbook.addWorksheet("Detalle Clientes", {
      views: [{ showGridLines: true }]
    });

    const columnsDetalle = [
      { header: "N°", key: "num", width: 6 },
      { header: "CONTRATO", key: "contrato", width: 14 },
      { header: "CÉDULA / RIF", key: "ci_rif", width: 16 },
      { header: "CLIENTE", key: "cliente", width: 38 },
      { header: "TELÉFONO", key: "telefono", width: 16 },
      { header: "CORREO", key: "email", width: 30 },
      { header: "SECTOR", key: "sector", width: 24 },
      { header: "PARROQUIA", key: "parroquia", width: 22 },
      { header: "PLAN", key: "plan", width: 28 },
      { header: "COSTO ($)", key: "costo", width: 15 },
      { header: "TIPO CLIENTE", key: "tipo_cliente", width: 16 },
      { header: "ESTATUS", key: "estatus", width: 14 },
      { header: "CICLO", key: "ciclo", width: 10 },
      { header: "MIGRADO", key: "migrado", width: 12 }
    ];

    sheetDetalle.columns = columnsDetalle;

    // Estilo de la cabecera
    const headerDetalleRow = sheetDetalle.getRow(1);
    headerDetalleRow.height = 30;
    headerDetalleRow.eachCell((cell) => {
      cell.font = { name: "Segoe UI", bold: true, size: 10, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY_HEADER } };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border = {
        top: { style: "thin", color: { argb: BLUE_THEME } },
        bottom: { style: "medium", color: { argb: BLUE_THEME } },
        left: { style: "thin", color: { argb: LIGHT_BORDER } },
        right: { style: "thin", color: { argb: LIGHT_BORDER } }
      };
    });

    // AutoFiltro en la fila de cabecera
    sheetDetalle.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: columnsDetalle.length }
    };

    // Filas de detalle (exclusivamente datos reales provistos por la API)
    validClients.forEach((cliente, index) => {
      const tipoCliente = getClientType(cliente);

      const resolvedEmail =
        (cliente.client_email && String(cliente.client_email).toUpperCase() !== "N/A")
          ? norm(cliente.client_email)
          : (cliente.email && String(cliente.email).toUpperCase() !== "N/A")
            ? norm(cliente.email)
            : "N/A";

      const resolvedMobile =
        norm(cliente.client_mobile) && norm(cliente.client_mobile) !== "N/A"
          ? norm(cliente.client_mobile)
          : norm(cliente.mobile) || "N/A";

      const resolvedIdentification =
        norm(cliente.client_identification) && norm(cliente.client_identification) !== "N/A"
          ? norm(cliente.client_identification)
          : norm(cliente.identification) || "N/A";

      const row = sheetDetalle.addRow({
        num: index + 1,
        contrato: cliente.id || "N/A",
        ci_rif: resolvedIdentification,
        cliente: norm(cliente.client_name) || "N/A",
        telefono: resolvedMobile,
        email: resolvedEmail,
        sector: norm(cliente._displaySector || cliente.sector_name || cliente.sector?.name) || "N/A",
        parroquia: norm(cliente.parish_name || cliente.sector?.parish?.name) || "N/A",
        plan: cleanPlanName(cliente.plan?.name),
        costo: parseFloat(cliente.plan?.cost || 0),
        tipo_cliente: tipoCliente,
        estatus: norm(cliente.status_name || cliente.status?.name) || "Activo",
        ciclo: mapCycleValue(cliente.cycle, cliente),
        migrado: cliente.migrate !== undefined ? (cliente.migrate ? "Si" : "No") : "Si"
      });

      row.height = 20;

      row.eachCell((cell, colIndex) => {
        cell.font = { name: "Segoe UI", size: 9.5 };
        cell.border = {
          top: { style: "thin", color: { argb: LIGHT_BORDER } },
          bottom: { style: "thin", color: { argb: LIGHT_BORDER } },
          left: { style: "thin", color: { argb: LIGHT_BORDER } },
          right: { style: "thin", color: { argb: LIGHT_BORDER } }
        };

        const key = columnsDetalle[colIndex - 1]?.key;
        if (["num", "contrato", "ci_rif", "telefono", "tipo_cliente", "estatus", "ciclo", "migrado"].includes(key)) {
          cell.alignment = { horizontal: "center", vertical: "middle" };
        } else if (key === "costo") {
          cell.alignment = { horizontal: "right", vertical: "middle" };
          cell.numFmt = currencyFmt;
        } else {
          cell.alignment = { horizontal: "left", vertical: "middle" };
        }
      });
    });

    // Fila total al pie de Detalle Clientes
    const lastDetailRow = sheetDetalle.rowCount;
    const totalDetailRow = sheetDetalle.addRow({
      num: "",
      contrato: "TOTAL CLIENTES:",
      ci_rif: `${validClients.length}`,
      cliente: "",
      telefono: "",
      email: "",
      sector: "",
      parroquia: "",
      plan: "TOTAL FACTURADO:",
      costo: { formula: `SUM(J2:J${lastDetailRow})`, result: totalIngresosGeneral },
      tipo_cliente: "",
      estatus: "",
      ciclo: "",
      migrado: ""
    });

    totalDetailRow.height = 26;
    totalDetailRow.eachCell((cell, colIndex) => {
      cell.font = { name: "Segoe UI", bold: true, size: 10, color: { argb: "FF0F172A" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
      cell.border = {
        top: { style: "medium", color: { argb: BLUE_THEME } },
        bottom: { style: "double", color: { argb: BLUE_THEME } },
        left: { style: "thin", color: { argb: LIGHT_BORDER } },
        right: { style: "thin", color: { argb: LIGHT_BORDER } }
      };

      const key = columnsDetalle[colIndex - 1]?.key;
      if (key === "costo") {
        cell.alignment = { horizontal: "right", vertical: "middle" };
        cell.numFmt = currencyFmt;
      } else if (key === "contrato" || key === "ci_rif") {
        cell.alignment = { horizontal: "center", vertical: "middle" };
      } else if (key === "plan") {
        cell.alignment = { horizontal: "right", vertical: "middle" };
      }
    });

    // Generar archivo binario y descargar
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(
      new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      }),
      "Reporte_Clientes_Activos.xlsx"
    );
  };

  if (showPasswordState) {
    return <LogingForm />;
  }

  return (
    <div>
      <LogoTitulo />
      <DropdownMenu />
      <PageNav />

      {/* SVG Gradients definitions */}
      <svg width="0" height="0" style={{ position: "absolute", pointerEvents: "none" }} aria-hidden="true">
        <defs>
          <linearGradient id="goldCoinGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="40%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          <linearGradient id="goldBagGradHead" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="35%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
        </defs>
      </svg>

      <div className="ventas-dashboard animate-slide-up">
        {/* ENCABEZADO SUPERIOR */}
        <div className="ventas-header-container">
          <div className="ventas-header-left">
            <div className="ventas-header-icon-box">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#38bdf8" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2.5" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>
            <div className="ventas-header-texts">
              <h2 className="ventas-title-main">
                Monitor de <span className="title-highlight">Operaciones</span>
              </h2>
              <p className="ventas-subtitle">
                Seguimiento en tiempo real de los ingresos por plan.
              </p>
            </div>
          </div>

          <div className="header-update-badge">
            <div className="update-badge-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#38bdf8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div className="update-badge-texts">
              <span className="update-badge-label">Última actualización</span>
              <span className="update-badge-date">{lastUpdatedTime}</span>
            </div>
          </div>
        </div>

        {stats ? (
          <div className="ventas-content-layout">
            {/* TARJETA PRINCIPAL: INGRESOS POR PLAN */}
            <div className="ventas-main-card">
              <div className="card-top-header-row">
                <div className="card-title-col">
                  <div className="card-title-headline-wrap">
                    <div className="card-title-icon-wrap">
                      <svg viewBox="0 0 28 28" width="26" height="26" fill="none">
                        <path d="M10 5.2C10 3.8 12 3 14 3s4 .8 4 2.2c0 .6-.5 1-1.2 1h-5.6c-.7 0-1.2-.4-1.2-1z" fill="url(#goldBagGradHead)" />
                        <rect x="10.5" y="6.2" width="7" height="2" rx="1" fill="#fde047" />
                        <path d="M14 8.2c-5 0-9.2 4.2-9.2 9.8 0 4.2 4 7 9.2 7s9.2-2.8 9.2-7c0-5.6-4.2-9.8-9.2-9.8z" fill="url(#goldBagGradHead)" />
                        <text x="14" y="19.8" textAnchor="middle" fontSize="11" fontWeight="900" fontFamily="sans-serif" fill="#78350f">$</text>
                      </svg>
                    </div>
                    <h3 className="card-section-title">
                      Ingresos <span className="title-highlight">por Plan</span>
                    </h3>
                  </div>
                  <p className="card-section-subtitle">
                    Detalle de ingresos según tipo de plan residencial.
                  </p>
                </div>

                <div className="card-actions-row">
                  <button 
                    className="btn-action-tab active"
                    onClick={() => exportPlanesToExcel(stats.allPlanes)}
                    title="Descargar Resumen de Planes"
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="20" x2="18" y2="10" />
                      <line x1="12" y1="20" x2="12" y2="4" />
                      <line x1="6" y1="20" x2="6" y2="14" />
                    </svg>
                    <span>Resumen</span>
                  </button>
                  <button 
                    className="btn-action-tab"
                    onClick={handleExportActiveClientsExcel}
                    title="Descargar Reporte de Clientes Activos (Resumen por Plan y Detalle)"
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    <span>Clientes</span>
                  </button>
                </div>
              </div>

              {/* LISTADO DE PLANES */}
              <div className="operaciones-plans-list">
                {stats.allPlanes.map((plan, index) => {
                  const percent = stats.total > 0 ? Math.round((plan.count / stats.total) * 100) : 0;
                  return (
                    <div key={plan.name} className="operaciones-plan-card">
                      <div className="plan-card-left">
                        <span className="plan-number-index">{String(index + 1).padStart(2, "0")}</span>
                        <div className="plan-details-col">
                          <div className="plan-info-top-row">
                            <span className="plan-title-text">{plan.name}</span>
                            <span className={`plan-category-badge-pill ${plan.category?.toLowerCase()}`}>
                              {plan.category}
                            </span>
                            <span className="plan-cost-pill">${plan.cost}</span>
                            <span className="plan-clients-pill">{plan.count} cl</span>
                          </div>
                          <div className="plan-progress-bar-row">
                            <span className="progress-label-text">INGRESOS:</span>
                            <div className="progress-track-bg">
                              <div 
                                className="progress-fill-bar" 
                                style={{ width: `${Math.min(100, Math.max(3, percent))}%` }} 
                              />
                            </div>
                            <span className="progress-percentage-text">{percent}%</span>
                          </div>
                        </div>
                      </div>

                      <div className="plan-card-right">
                        <div className="plan-revenue-badge-card">
                          <div className="revenue-icon-gold-circle">
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
                              <circle cx="12" cy="12" r="10" fill="url(#goldCoinGrad)" />
                              <text x="12" y="16.5" textAnchor="middle" fontSize="12" fontWeight="900" fontFamily="sans-serif" fill="#78350f">$</text>
                            </svg>
                          </div>
                          <div className="revenue-texts-wrap">
                            <span className="revenue-sub-label">Ingreso total</span>
                            <span className="revenue-total-amount">{formatCurrency(plan.revenue)}</span>
                          </div>
                          <div className="revenue-decorative-bars" aria-hidden="true">
                            <span className="rev-bar b1" />
                            <span className="rev-bar b2" />
                            <span className="rev-bar b3" />
                            <span className="rev-bar b4" />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* FILA DE 3 TARJETAS RESUMEN AL FONDO */}
            <div className="operaciones-bottom-summary-grid">
              {/* Card 1: Total Residencial */}
              <div className="summary-stat-card card-residencial">
                <div className="summary-icon-squircle icon-cyan-bg">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#38bdf8" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 10.5l9-7.5 9 7.5v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9z" />
                    <polyline points="9 21 9 12 15 12 15 21" />
                  </svg>
                </div>
                <div className="summary-info-col">
                  <span className="summary-stat-label">Total Residencial</span>
                  <span className="summary-stat-value">{formatCurrency(stats.residencialRevenue)}</span>
                </div>
                <div className="summary-ambient-bars bars-cyan" aria-hidden="true">
                  <span className="abar a1" />
                  <span className="abar a2" />
                  <span className="abar a3" />
                  <span className="abar a4" />
                </div>
              </div>

              {/* Card 2: Total PYME */}
              <div className="summary-stat-card card-pyme">
                <div className="summary-icon-squircle icon-purple-bg">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#c084fc" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="2" width="16" height="20" rx="2" />
                    <line x1="9" y1="6" x2="9" y2="6.01" />
                    <line x1="15" y1="6" x2="15" y2="6.01" />
                    <line x1="9" y1="10" x2="9" y2="10.01" />
                    <line x1="15" y1="10" x2="15" y2="10.01" />
                    <line x1="9" y1="14" x2="9" y2="14.01" />
                    <line x1="15" y1="14" x2="15" y2="14.01" />
                    <line x1="9" y1="18" x2="15" y2="18" />
                  </svg>
                </div>
                <div className="summary-info-col">
                  <span className="summary-stat-label">Total PYME</span>
                  <span className="summary-stat-value">{formatCurrency(stats.pymeRevenue)}</span>
                </div>
                <div className="summary-ambient-bars bars-purple" aria-hidden="true">
                  <span className="abar a1" />
                  <span className="abar a2" />
                  <span className="abar a3" />
                  <span className="abar a4" />
                </div>
              </div>

              {/* Card 3: INGRESO TOTAL */}
              <div className="summary-stat-card card-total">
                <div className="summary-icon-squircle icon-gold-bg">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
                    <circle cx="12" cy="12" r="10" fill="url(#goldCoinGrad)" />
                    <text x="12" y="16.5" textAnchor="middle" fontSize="12" fontWeight="900" fontFamily="sans-serif" fill="#78350f">$</text>
                  </svg>
                </div>
                <div className="summary-info-col">
                  <span className="summary-stat-label text-gold-label">INGRESO TOTAL</span>
                  <span className="summary-stat-value text-cyan-amount">{formatCurrency(stats.totalRevenue)}</span>
                </div>
                <div className="summary-ambient-bars bars-gold" aria-hidden="true">
                  <span className="abar a1" />
                  <span className="abar a2" />
                  <span className="abar a3" />
                  <span className="abar a4" />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="ventas-loading-box">
            <div className="status-spinner-circle" />
            <p>Cargando datos de operaciones...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Ventas;
