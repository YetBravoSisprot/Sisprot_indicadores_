import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

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

export const exportPlanesToExcel = async (planesData) => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("CLIENTES POR PLAN");

    const totalClientesGeneral = planesData.reduce((acc, p) => acc + p.count, 0);

    const sortedPlanes = [...planesData].sort((a, b) => {
        if (a.category === b.category) {
            return a.cost - b.cost;
        }
        return a.category === "PYME" ? -1 : 1;
    });

    const BLUE_THEME = 'FF0070C0'; // Azul profesional
    const LIGHT_BLUE_BORDER = 'FFBFDBFE';

    // Título
    sheet.insertRow(1, ["REPORTE DE CLIENTES PYMES Y RESIDENCIALES ACTIVOS"]);
    sheet.mergeCells('A1:E1');
    sheet.getRow(1).font = { bold: true, size: 14, color: { argb: BLUE_THEME } };
    sheet.getRow(1).height = 35;
    sheet.getRow(1).alignment = { horizontal: 'left', vertical: 'middle' };

    // Cabeceras (Fila 3)
    const headerRow = sheet.getRow(3);
    headerRow.values = ["Plan", "Precio ($)", "Cantidad de clientes", "Monto total por plan ($)", "% participación"];
    sheet.columns = [
        { key: "name", width: 40 },
        { key: "cost", width: 15 },
        { key: "count", width: 22 },
        { key: "revenue", width: 25 },
        { key: "participation", width: 20 }
    ];

    headerRow.height = 25;
    headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: '000000' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFC' } };
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
        cell.border = {
            top: { style: 'thin', color: { argb: BLUE_THEME } },
            bottom: { style: 'medium', color: { argb: BLUE_THEME } },
            left: { style: 'thin', color: { argb: LIGHT_BLUE_BORDER } },
            right: { style: 'thin', color: { argb: LIGHT_BLUE_BORDER } }
        };
    });

    // Filtros
    sheet.autoFilter = 'A3:E3';

    // Datos
    sortedPlanes.forEach(plan => {
        const row = sheet.addRow({
            name: plan.name,
            cost: plan.cost,
            count: plan.count,
            revenue: plan.revenue,
            participation: plan.count / totalClientesGeneral
        });

        row.eachCell((cell, colNumber) => {
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
            cell.border = {
                bottom: { style: 'thin', color: { argb: LIGHT_BLUE_BORDER } },
                left: { style: 'thin', color: { argb: LIGHT_BLUE_BORDER } },
                right: { style: 'thin', color: { argb: LIGHT_BLUE_BORDER } }
            };
            
            // Si es la columna de ingresos, poner en negrita (como en la imagen)
            if (colNumber === 4) {
                cell.font = { bold: true };
            }
        });
    });

    // Formatos
    sheet.getColumn('B').numFmt = '"$ "#,##0.00';
    sheet.getColumn('D').numFmt = '"$ "#,##0.00';
    sheet.getColumn('E').numFmt = '0.00%';

    // Fila TOTAL
    const lastRowIndex = sheet.rowCount + 1;
    const totalRevenueGeneral = planesData.reduce((acc, p) => acc + p.revenue, 0);

    const totalRow = sheet.addRow({
        name: "Total mensual",
        cost: null,
        count: totalClientesGeneral,
        revenue: totalRevenueGeneral,
        participation: 1
    });

    totalRow.height = 25;
    totalRow.font = { bold: true };
    totalRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
        cell.border = {
            top: { style: 'medium', color: { argb: BLUE_THEME } },
            bottom: { style: 'medium', color: { argb: BLUE_THEME } }
        };
    });
    
    sheet.getCell(`D${lastRowIndex}`).numFmt = '"$ "#,##0.00';
    sheet.getCell(`E${lastRowIndex}`).numFmt = '0.00%'; // Sincronizado para mostrar 100% correctamente

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Reporte de ingresos de planes.xlsx`);
};

/**
 * Genera el reporte de Clientes Activos (exclusivamente PYMES y RESIDENCIALES)
 * con dos hojas de trabajo:
 * 1. "Resumen por Plan": Cantidad de clientes activos y facturación agrupados por plan y tipo (PYME / RESIDENCIAL) con subtotales y total general.
 * 2. "Detalle Clientes": Listado individualizado y filtrable de todos los clientes activos.
 */
export const exportActiveClientsReport = async (activeClients, customFileName = "Reporte_Clientes_Activos.xlsx") => {
    if (!activeClients || activeClients.length === 0) {
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
        // Cabecera de Sección Residencial
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
        // Cabecera de Sección PYME
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
        customFileName
    );
};

