import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { mapCycleValue } from "./cycleHelper";

const formatCurrency = (val) => `$ ${parseFloat(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const norm = (v) => (v == null ? "" : String(v).trim());

export const exportExecutiveReport = async (dataset, appliedFiltersText = [], userName = "", selectedColumns = ["Todas"], fullDatasetHoy = null) => {
    try {
        if (!dataset || !Array.isArray(dataset)) {
            console.error("Dataset invalido para reporte");
            return;
        }

        const workbook = new ExcelJS.Workbook();
        const hoy = new Date();
        const dateStr = hoy.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

        // --- 1. HOJA: RESUMEN EJECUTIVO (VISUAL/DASHBOARD) ---
        const dashSheet = workbook.addWorksheet("Dashboard Ejecutivo");
        
        // Configuración estética de la hoja
        dashSheet.getColumn('B').width = 40;
        dashSheet.getColumn('C').width = 15;
        dashSheet.getColumn('D').width = 15;
        dashSheet.getColumn('E').width = 15;
        dashSheet.getColumn('F').width = 15;
        dashSheet.getColumn('G').width = 15;
        dashSheet.getColumn('H').width = 15;
        dashSheet.getColumn('I').width = 15;
        dashSheet.getColumn('J').width = 15;
        dashSheet.getColumn('K').width = 18;

        // TÍTULO PRINCIPAL
        dashSheet.mergeCells('B2:K3');
        const titleCell = dashSheet.getCell('B2');
        titleCell.value = "REPORTE EJECUTIVO DE GESTIÓN COMERCIAL (DASHBOARD)";
        titleCell.font = { name: 'Calibri', size: 20, bold: true, color: { argb: 'FFFFFFFF' } };
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

        dashSheet.mergeCells('B4:K4');
        const subTitleCell = dashSheet.getCell('B4');
        subTitleCell.value = `Analista: ${userName} | Reporte Comparativo Cierre Diario | Corte: ${dateStr}`;
        subTitleCell.font = { italic: true, size: 11, color: { argb: 'FF595959' } };
        subTitleCell.alignment = { horizontal: 'right' };

        // FILTROS APLICADOS (Contexto)
        dashSheet.getCell('B6').value = "CRITERIOS DE FILTRADO EN DETALLE:";
        dashSheet.getCell('B6').font = { bold: true, size: 10, color: { argb: 'FF1F4E78' } };
        dashSheet.mergeCells('B7:K7');
        dashSheet.getCell('B7').value = appliedFiltersText.join(" | ") || "Vista Global (Sin filtros)";
        dashSheet.getCell('B7').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
        dashSheet.getCell('B7').font = { italic: true, size: 9 };

        // --- CÁLCULOS DE DATA (Comercial: Pyme/Residencial) ---
        // Para los KPI usamos la data filtrada (lo que el usuario está viendo actualmente)
        const pymeClientes = dataset.filter(c => (c.client_subdivision || c.client_type_name || '').toUpperCase().includes("PYME"));
        const resClientes = dataset.filter(c => (c.client_subdivision || c.client_type_name || '').toUpperCase().includes("RESIDENCIAL"));
        
        const ingresoPyme = pymeClientes.reduce((acc, c) => acc + parseFloat(c.plan?.cost || 0), 0);
        const ingresoRes = resClientes.reduce((acc, c) => acc + parseFloat(c.plan?.cost || 0), 0);
        const totalIngreso = ingresoPyme + ingresoRes;
        const totalCount = pymeClientes.length + resClientes.length;

        // --- KPI CARDS ---
        const kpi1Start = 9;
        
        dashSheet.mergeCells(`B${kpi1Start}:C${kpi1Start + 2}`);
        const kpi1 = dashSheet.getCell(`B${kpi1Start}`);
        kpi1.value = `CONTRATOS VISTA\n${totalCount.toLocaleString()}`;
        kpi1.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
        kpi1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF34495E' } };
        kpi1.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

        dashSheet.mergeCells(`D${kpi1Start}:F${kpi1Start + 2}`);
        const kpi2 = dashSheet.getCell(`D${kpi1Start}`);
        kpi2.value = `INGRESO PROYECTADO VISTA\n${formatCurrency(totalIngreso)}`;
        kpi2.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
        kpi2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF27AE60' } };
        kpi2.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

        dashSheet.mergeCells(`G${kpi1Start}:K${kpi1Start + 2}`);
        const kpi3 = dashSheet.getCell(`G${kpi1Start}`);
        const avg = totalCount > 0 ? (totalIngreso / totalCount) : 0;
        kpi3.value = `TICKET PROMEDIO\n${formatCurrency(avg)}`;
        kpi3.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
        kpi3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2980B9' } };
        kpi3.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

        // --- DESGLOSE POR TIPO ---
        const tableStart = 14;
        dashSheet.getCell(`B${tableStart}`).value = "📦 RESUMEN POR CATEGORÍA COMERCIAL (VISTA ACTUAL)";
        dashSheet.getCell(`B${tableStart}`).font = { bold: true, size: 12, color: { argb: 'FF1F4E78' } };

        const headers = ["Tipo de Cliente", "Cantidad", "Ingreso Proyectado", "% Participación"];
        headers.forEach((h, i) => {
            const cell = dashSheet.getCell(tableStart + 1, 2 + (i === 0 ? 0 : i === 1 ? 1 : i === 2 ? 3 : 6));
            if (i === 1) dashSheet.mergeCells(tableStart + 1, 3, tableStart + 1, 4);
            if (i === 2) dashSheet.mergeCells(tableStart + 1, 5, tableStart + 1, 7);
            if (i === 3) dashSheet.mergeCells(tableStart + 1, 8, tableStart + 1, 11);
            
            cell.value = h;
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });

        const dataRows = [
            ["RESIDENCIAL", resClientes.length, ingresoRes, totalIngreso > 0 ? (ingresoRes / totalIngreso) : 0],
            ["PYME", pymeClientes.length, ingresoPyme, totalIngreso > 0 ? (ingresoPyme / totalIngreso) : 0],
        ];

        dataRows.forEach((row, i) => {
            const rowNum = tableStart + 2 + i;
            dashSheet.getCell(`B${rowNum}`).value = row[0];
            dashSheet.mergeCells(rowNum, 3, rowNum, 4);
            dashSheet.getCell(`C${rowNum}`).value = row[1];
            dashSheet.mergeCells(rowNum, 5, rowNum, 7);
            dashSheet.getCell(`E${rowNum}`).value = row[2];
            dashSheet.getCell(`E${rowNum}`).numFmt = '"$ "#,##0.00';
            dashSheet.mergeCells(rowNum, 8, rowNum, 11);
            dashSheet.getCell(`H${rowNum}`).value = row[3];
            dashSheet.getCell(`H${rowNum}`).numFmt = '0.0%';
            dashSheet.getRow(rowNum).alignment = { horizontal: 'center' };
            dashSheet.getCell(`B${rowNum}`).alignment = { horizontal: 'left' };
        });

        // --- 2. HOJA: ANÁLISIS POR URBANISMO ---
        const urbSheet = workbook.addWorksheet("Análisis por Urbanismo");
        
        // Configuración de columnas
        urbSheet.getColumn('A').width = 8;   // N°
        urbSheet.getColumn('B').width = 35;  // Urbanismo / Sector
        urbSheet.getColumn('C').width = 18;  // Clientes Activos
        urbSheet.getColumn('D').width = 22;  // Ingreso Activo (USD)
        urbSheet.getColumn('E').width = 18;  // Clientes Retirados
        urbSheet.getColumn('F').width = 22;  // Dinero Retirado (Pérdida USD)
        urbSheet.getColumn('G').width = 22;  // Pérdida Promedio (USD)

        // TÍTULO PRINCIPAL DE LA HOJA
        urbSheet.mergeCells('B2:G3');
        const urbTitleCell = urbSheet.getCell('B2');
        urbTitleCell.value = "ANÁLISIS DE INGRESOS Y RETIROS POR URBANIZACIÓN";
        urbTitleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
        urbTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } }; // Azul oscuro corporativo
        urbTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };

        // Subtítulo
        urbSheet.mergeCells('B4:G4');
        const urbSubTitleCell = urbSheet.getCell('B4');
        urbSubTitleCell.value = `Detalle general e histórico de bajas por sector`;
        urbSubTitleCell.font = { italic: true, size: 10, color: { argb: 'FF595959' } };
        urbSubTitleCell.alignment = { horizontal: 'right' };

        // Cabeceras de tabla
        const urbHeaders = ["N°", "Urbanización / Sector", "Clientes Activos", "Ingreso Activo", "Clientes Retirados", "Dinero Retirado", "Pérdida Promedio"];
        urbHeaders.forEach((h, i) => {
            const cell = urbSheet.getCell(6, 1 + i);
            cell.value = h;
            cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF333333' } }; // Gris oscuro
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });

        // Obtener data base (preferir base completa de hoy para ver todos los retirados reales)
        const baseData = fullDatasetHoy || dataset;
        
        // Filtrar clientes comerciales (Residenciales o Pymes) únicamente
        const clientesComerciales = baseData.filter(c => {
            const type = (c.client_subdivision || c.client_type_name || '').toUpperCase();
            return type.includes("PYME") || type.includes("RESIDENCIAL");
        });

        // Agrupar por sector
        const sectorGroup = {};
        clientesComerciales.forEach(c => {
            const sector = norm(c.sector_name) || "Sin Sector";
            const status = norm(c.status_name).toUpperCase();
            const cost = parseFloat(c.plan?.cost) || 0;

            if (!sectorGroup[sector]) {
                sectorGroup[sector] = {
                    sectorName: sector,
                    activeCount: 0,
                    activeRevenue: 0,
                    retiredCount: 0,
                    retiredRevenue: 0
                };
            }

            if (status === "ACTIVO" || status === "ACTIVOS") {
                sectorGroup[sector].activeCount += 1;
                sectorGroup[sector].activeRevenue += cost;
            } else if (status === "CANCELADO" || status === "CANCELADOS" || status === "SUSPENDIDO" || status === "SUSPENDIDOS") {
                sectorGroup[sector].retiredCount += 1;
                sectorGroup[sector].retiredRevenue += cost;
            }
        });

        // Convertir a array y calcular promedios
        const urbRows = Object.values(sectorGroup).map(u => {
            const avgLost = u.retiredCount > 0 ? (u.retiredRevenue / u.retiredCount) : 0;
            return {
                sectorName: u.sectorName,
                activeCount: u.activeCount,
                activeRevenue: u.activeRevenue,
                retiredCount: u.retiredCount,
                retiredRevenue: u.retiredRevenue,
                avgLost: avgLost
            };
        });

        // Ordenar por Ingreso Activo de mayor a menor
        urbRows.sort((a, b) => b.activeRevenue - a.activeRevenue);

        // Rellenar filas
        let currentUrbRow = 7;
        urbRows.forEach((row, idx) => {
            urbSheet.getCell(`A${currentUrbRow}`).value = idx + 1;
            urbSheet.getCell(`B${currentUrbRow}`).value = row.sectorName;
            urbSheet.getCell(`C${currentUrbRow}`).value = row.activeCount;
            urbSheet.getCell(`D${currentUrbRow}`).value = row.activeRevenue;
            urbSheet.getCell(`E${currentUrbRow}`).value = row.retiredCount;
            urbSheet.getCell(`F${currentUrbRow}`).value = row.retiredRevenue;
            urbSheet.getCell(`G${currentUrbRow}`).value = row.avgLost;

            // Formatos
            urbSheet.getCell(`A${currentUrbRow}`).alignment = { horizontal: 'center' };
            urbSheet.getCell(`B${currentUrbRow}`).alignment = { horizontal: 'left' };
            urbSheet.getCell(`C${currentUrbRow}`).alignment = { horizontal: 'center' };
            urbSheet.getCell(`D${currentUrbRow}`).alignment = { horizontal: 'right' };
            urbSheet.getCell(`E${currentUrbRow}`).alignment = { horizontal: 'center' };
            urbSheet.getCell(`F${currentUrbRow}`).alignment = { horizontal: 'right' };
            urbSheet.getCell(`G${currentUrbRow}`).alignment = { horizontal: 'right' };

            // Formato de moneda
            urbSheet.getCell(`D${currentUrbRow}`).numFmt = '"$ "#,##0.00';
            urbSheet.getCell(`F${currentUrbRow}`).numFmt = '"$ "#,##0.00';
            urbSheet.getCell(`G${currentUrbRow}`).numFmt = '"$ "#,##0.00';

            // Estilo de línea (bordes delgados)
            const borderStyle = {
                top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
            };
            for (let col = 1; col <= 7; col++) {
                urbSheet.getCell(currentUrbRow, col).border = borderStyle;
            }

            // Fila de cebra (sutil gris)
            if (idx % 2 === 1) {
                for (let col = 1; col <= 7; col++) {
                    urbSheet.getCell(currentUrbRow, col).fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFF9F9F9' }
                    };
                }
            }

            currentUrbRow++;
        });

        // FILA DE TOTALES
        const totalRowIndex = currentUrbRow;
        urbSheet.getCell(`A${totalRowIndex}`).value = "";
        urbSheet.getCell(`B${totalRowIndex}`).value = "TOTAL COMERCIAL Taurus";
        urbSheet.getCell(`B${totalRowIndex}`).font = { bold: true };
        
        // Sumas por fórmulas de Excel
        urbSheet.getCell(`C${totalRowIndex}`).value = { formula: `SUM(C7:C${totalRowIndex - 1})` };
        urbSheet.getCell(`D${totalRowIndex}`).value = { formula: `SUM(D7:D${totalRowIndex - 1})` };
        urbSheet.getCell(`E${totalRowIndex}`).value = { formula: `SUM(E7:E${totalRowIndex - 1})` };
        urbSheet.getCell(`F${totalRowIndex}`).value = { formula: `SUM(F7:F${totalRowIndex - 1})` };
        
        // Pérdida Promedio General (Fórmula)
        urbSheet.getCell(`G${totalRowIndex}`).value = { formula: `IF(E${totalRowIndex}>0, F${totalRowIndex}/E${totalRowIndex}, 0)` };

        // Formatos de fila de total
        for (let col = 1; col <= 7; col++) {
            const cell = urbSheet.getCell(totalRowIndex, col);
            cell.font = { bold: true };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAEAEA' } };
            cell.border = {
                top: { style: 'thin', color: { argb: 'FF000000' } },
                bottom: { style: 'double', color: { argb: 'FF000000' } }
            };
            if (col === 3 || col === 5) cell.alignment = { horizontal: 'center' };
            if (col === 4 || col === 6 || col === 7) cell.alignment = { horizontal: 'right' };
        }
        urbSheet.getCell(`D${totalRowIndex}`).numFmt = '"$ "#,##0.00';
        urbSheet.getCell(`F${totalRowIndex}`).numFmt = '"$ "#,##0.00';
        urbSheet.getCell(`G${totalRowIndex}`).numFmt = '"$ "#,##0.00';

        // --- DETALLE SHEET ---
        const detailSheet = workbook.addWorksheet("Detalle de Clientes (Filtrado)");
        const allDetailColumns = [
            { header: "ESTATUS", key: "status_name", width: 18, ui: "Estatus" },
            { header: "CONTRATO", key: "id", width: 12, ui: "Contrato" },
            { header: "CLIENTE", key: "client_name", width: 35, ui: "Cliente" },
            { header: "CI/RIF", key: "client_identification", width: 15, ui: "Cedula" },
            { header: "TELÉFONO", key: "client_mobile", width: 15, ui: "Teléfono" },
            { header: "DIRECCIÓN", key: "address", width: 35, ui: "Dirección" },
            { header: "INTERFACE", key: "interface", width: 25, ui: "Interface" },
            { header: "SECTOR", key: "sector_name", width: 25, ui: "Sector" },
            { header: "MIGRADO", key: "migrado", width: 10, ui: "Migrado" },
            { header: "CICLO", key: "ciclo", width: 8, ui: "Ciclo" },
            { header: "PLAN", key: "plan_name", width: 25, ui: "Plan" },
            { header: "COSTO", key: "costo", width: 14, ui: "Costo" },
            { header: "IP", key: "ip", width: 15, ui: "IP" },
            { header: "MAC", key: "mac", width: 20, ui: "MAC" },
            { header: "FECHA CREACIÓN", key: "fecha_creacion", width: 15, ui: "Fecha_Creación" },
            { header: "TIPO CLIENTE", key: "tipo_cliente", width: 15, ui: "Tipo_Cliente" }
        ];

        const isAll = selectedColumns.includes("Todas");
        const finalDetailColumns = isAll ? allDetailColumns : allDetailColumns.filter(c => selectedColumns.includes(c.ui) || selectedColumns.includes(c.header));
        detailSheet.columns = [{ header: "N°", key: "num", width: 5 }, ...finalDetailColumns];
        detailSheet.getRow(1).height = 25;
        detailSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        detailSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } };
        detailSheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };

        dataset.forEach((cliente, idx) => {
            const rowData = {
                num: idx + 1,
                status_name: cliente.status_name,
                id: cliente.id,
                client_name: cliente.client_name,
                client_identification: cliente.client_identification,
                client_mobile: cliente.client_mobile,
                address: norm(cliente.address_tax || cliente.address),
                interface: cliente.service_detail?.interface || "N/A",
                sector_name: norm(cliente.sector_name || cliente._displaySector),
                migrado: cliente.migrate ? "si" : "No",
                ciclo: mapCycleValue(cliente.cycle),
                plan_name: cliente.plan?.name || "N/A",
                costo: parseFloat(cliente.plan?.cost || 0),
                ip: cliente.service_detail?.ip || cliente.ip_name || "N/A",
                mac: cliente.service_detail?.mac || cliente.mac_address || "N/A",
                fecha_creacion: cliente.created_at ? new Date(cliente.created_at).toLocaleDateString() : "N/A",
                tipo_cliente: cliente.client_type_name
            };
            detailSheet.addRow(rowData);
        });

        if (detailSheet.columns) {
            detailSheet.columns.forEach(col => { if (col && col.key === 'costo') col.numFmt = '"$ "#,##0.00'; });
        }
        detailSheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: detailSheet.columns.length } };

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `Reporte_Ejecutivo_Taurus_${hoy.toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
        console.error("CRITICAL ERROR IN EXCEL GEN:", err);
        alert("Error crítico al generar el Excel Ejecutivo: " + err.message);
    }
};


