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
        urbSheet.getColumn('E').width = 18;  // Clientes Suspendidos
        urbSheet.getColumn('F').width = 22;  // Ingreso Suspendido (USD)
        urbSheet.getColumn('G').width = 18;  // Clientes Cancelados
        urbSheet.getColumn('H').width = 22;  // Pérdida Cancelados (USD)
        urbSheet.getColumn('I').width = 22;  // Pérdida Promedio (USD)

        // TÍTULO PRINCIPAL DE LA HOJA
        urbSheet.mergeCells('B2:I3');
        const urbTitleCell = urbSheet.getCell('B2');
        urbTitleCell.value = "ANÁLISIS DE INGRESOS Y RETIROS POR URBANIZACIÓN";
        urbTitleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
        urbTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } }; // Azul oscuro corporativo
        urbTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };

        // Subtítulo
        urbSheet.mergeCells('B4:I4');
        const urbSubTitleCell = urbSheet.getCell('B4');
        urbSubTitleCell.value = `Detalle general e histórico de bajas por sector`;
        urbSubTitleCell.font = { italic: true, size: 10, color: { argb: 'FF595959' } };
        urbSubTitleCell.alignment = { horizontal: 'right' };

        // Cabeceras de tabla
        const urbHeaders = ["N°", "Urbanización / Sector", "Clientes Activos", "Ingreso Activo", "Clientes Suspendidos", "Ingreso Suspendido", "Clientes Cancelados", "Pérdida Cancelados", "Pérdida Promedio"];
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
                    suspendedCount: 0,
                    suspendedRevenue: 0,
                    canceledCount: 0,
                    canceledRevenue: 0
                };
            }

            if (status === "ACTIVO" || status === "ACTIVOS") {
                sectorGroup[sector].activeCount += 1;
                sectorGroup[sector].activeRevenue += cost;
            } else if (status === "SUSPENDIDO" || status === "SUSPENDIDOS") {
                sectorGroup[sector].suspendedCount += 1;
                sectorGroup[sector].suspendedRevenue += cost;
            } else if (status === "CANCELADO" || status === "CANCELADOS") {
                sectorGroup[sector].canceledCount += 1;
                sectorGroup[sector].canceledRevenue += cost;
            }
        });

        // Convertir a array y calcular promedios
        const urbRows = Object.values(sectorGroup).map(u => {
            const avgLost = u.canceledCount > 0 ? (u.canceledRevenue / u.canceledCount) : 0;
            return {
                sectorName: u.sectorName,
                activeCount: u.activeCount,
                activeRevenue: u.activeRevenue,
                suspendedCount: u.suspendedCount,
                suspendedRevenue: u.suspendedRevenue,
                canceledCount: u.canceledCount,
                canceledRevenue: u.canceledRevenue,
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
            urbSheet.getCell(`E${currentUrbRow}`).value = row.suspendedCount;
            urbSheet.getCell(`F${currentUrbRow}`).value = row.suspendedRevenue;
            urbSheet.getCell(`G${currentUrbRow}`).value = row.canceledCount;
            urbSheet.getCell(`H${currentUrbRow}`).value = row.canceledRevenue;
            urbSheet.getCell(`I${currentUrbRow}`).value = row.avgLost;

            // Formatos
            urbSheet.getCell(`A${currentUrbRow}`).alignment = { horizontal: 'center' };
            urbSheet.getCell(`B${currentUrbRow}`).alignment = { horizontal: 'left' };
            urbSheet.getCell(`C${currentUrbRow}`).alignment = { horizontal: 'center' };
            urbSheet.getCell(`D${currentUrbRow}`).alignment = { horizontal: 'right' };
            urbSheet.getCell(`E${currentUrbRow}`).alignment = { horizontal: 'center' };
            urbSheet.getCell(`F${currentUrbRow}`).alignment = { horizontal: 'right' };
            urbSheet.getCell(`G${currentUrbRow}`).alignment = { horizontal: 'center' };
            urbSheet.getCell(`H${currentUrbRow}`).alignment = { horizontal: 'right' };
            urbSheet.getCell(`I${currentUrbRow}`).alignment = { horizontal: 'right' };

            // Formato de moneda
            urbSheet.getCell(`D${currentUrbRow}`).numFmt = '"$ "#,##0.00';
            urbSheet.getCell(`F${currentUrbRow}`).numFmt = '"$ "#,##0.00';
            urbSheet.getCell(`H${currentUrbRow}`).numFmt = '"$ "#,##0.00';
            urbSheet.getCell(`I${currentUrbRow}`).numFmt = '"$ "#,##0.00';

            // Estilo de línea (bordes delgados)
            const borderStyle = {
                top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
            };
            for (let col = 1; col <= 9; col++) {
                urbSheet.getCell(currentUrbRow, col).border = borderStyle;
            }

            // Fila de cebra (sutil gris)
            if (idx % 2 === 1) {
                for (let col = 1; col <= 9; col++) {
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
        urbSheet.getCell(`G${totalRowIndex}`).value = { formula: `SUM(G7:G${totalRowIndex - 1})` };
        urbSheet.getCell(`H${totalRowIndex}`).value = { formula: `SUM(H7:H${totalRowIndex - 1})` };
        
        // Pérdida Promedio General (Fórmula)
        urbSheet.getCell(`I${totalRowIndex}`).value = { formula: `IF(G${totalRowIndex}>0, H${totalRowIndex}/G${totalRowIndex}, 0)` };

        // Formatos de fila de total
        for (let col = 1; col <= 9; col++) {
            const cell = urbSheet.getCell(totalRowIndex, col);
            cell.font = { bold: true };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAEAEA' } };
            cell.border = {
                top: { style: 'thin', color: { argb: 'FF000000' } },
                bottom: { style: 'double', color: { argb: 'FF000000' } }
            };
            if (col === 3 || col === 5 || col === 7) cell.alignment = { horizontal: 'center' };
            if (col === 4 || col === 6 || col === 8 || col === 9) cell.alignment = { horizontal: 'right' };
        }
        urbSheet.getCell(`D${totalRowIndex}`).numFmt = '"$ "#,##0.00';
        urbSheet.getCell(`F${totalRowIndex}`).numFmt = '"$ "#,##0.00';
        urbSheet.getCell(`H${totalRowIndex}`).numFmt = '"$ "#,##0.00';
        urbSheet.getCell(`I${totalRowIndex}`).numFmt = '"$ "#,##0.00';

        // --- 3. HOJA: PEGAR REPORTE ANTERIOR (AUXILIAR DE CARGA) ---
        const pasteSheet = workbook.addWorksheet("Pegar Reporte Anterior");
        
        // Estilo de ayuda
        pasteSheet.getColumn('A').width = 8;
        pasteSheet.getColumn('B').width = 35;
        pasteSheet.getColumn('C').width = 18;
        pasteSheet.getColumn('D').width = 22;
        pasteSheet.getColumn('E').width = 18;
        pasteSheet.getColumn('F').width = 22;
        pasteSheet.getColumn('G').width = 18;
        pasteSheet.getColumn('H').width = 22;
        pasteSheet.getColumn('I').width = 22;

        pasteSheet.mergeCells('B2:I4');
        const pasteBanner = pasteSheet.getCell('B2');
        pasteBanner.value = "INSTRUCCIONES DE COMPARACIÓN:\n1. Abre tu reporte ejecutivo de un día anterior.\n2. Ve a la pestaña 'Análisis por Urbanismo'.\n3. Selecciona TODA la tabla (desde la fila 6 de cabeceras o fila 7 de datos hasta el final) y pégala aquí a partir de la celda A6.\n4. La pestaña 'Comparativa de Cierres' calculará la diferencia de Activos, Suspendidos y Cancelados automáticamente.";
        pasteBanner.font = { name: 'Calibri', size: 11, italic: true, bold: true, color: { argb: 'FF5C5C5C' } };
        pasteBanner.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } }; // Fondo amarillo pastel
        pasteBanner.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

        // Cabeceras simuladas
        const pasteHeaders = ["N°", "Urbanización / Sector", "Clientes Activos", "Ingreso Activo", "Clientes Suspendidos", "Ingreso Suspendido", "Clientes Cancelados", "Pérdida Cancelados", "Pérdida Promedio"];
        pasteHeaders.forEach((h, i) => {
            const cell = pasteSheet.getCell(6, 1 + i);
            cell.value = h;
            cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF9C9C9C' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });

        // --- 4. HOJA: COMPARATIVA DE CIERRES ---
        const compSheet = workbook.addWorksheet("Comparativa de Cierres");
        
        compSheet.getColumn('A').width = 8;   // N°
        compSheet.getColumn('B').width = 35;  // Urbanismo / Sector
        
        // C, D, E (Hoy)
        compSheet.getColumn('C').width = 15;
        compSheet.getColumn('D').width = 15;
        compSheet.getColumn('E').width = 15;
        
        // F, G, H (Anterior)
        compSheet.getColumn('F').width = 15;
        compSheet.getColumn('G').width = 15;
        compSheet.getColumn('H').width = 15;
        
        // I, J, K (Variación)
        compSheet.getColumn('I').width = 15;
        compSheet.getColumn('J').width = 15;
        compSheet.getColumn('K').width = 15;

        // TÍTULO
        compSheet.mergeCells('B2:K3');
        const compTitleCell = compSheet.getCell('B2');
        compTitleCell.value = "TABLERO COMPARATIVO DE CIERRES COMERCIALES";
        compTitleCell.font = { name: 'Calibri', size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
        compTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } }; // Azul oscuro
        compTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };

        // Subtítulo descriptivo
        compSheet.mergeCells('B4:K4');
        const compDescCell = compSheet.getCell('B4');
        compDescCell.value = "Variaciones automáticas de clientes Activos, Suspendidos y Cancelados. (Requiere pegar los datos históricos en la pestaña correspondiente)";
        compDescCell.font = { italic: true, size: 9, color: { argb: 'FF7F7F7F' } };
        compDescCell.alignment = { horizontal: 'center' };

        // Cabeceras agrupadas - Fila 5
        compSheet.mergeCells('B5:B6');
        compSheet.getCell('B5').value = "Urbanización / Sector";
        
        compSheet.mergeCells('C5:E5');
        compSheet.getCell('C5').value = "CIFRAS REPORTE ACTUAL (HOY)";
        
        compSheet.mergeCells('F5:H5');
        compSheet.getCell('F5').value = "CIFRAS REPORTE ANTERIOR (COMPARACIÓN)";
        
        compSheet.mergeCells('I5:K5');
        compSheet.getCell('I5').value = "VARIACIÓN DETECTADA (HOY vs HISTÓRICO)";

        // Cabeceras específicas - Fila 6
        const specificHeaders = [
            { col: 3, val: "Activos" },
            { col: 4, val: "Suspendidos" },
            { col: 5, val: "Cancelados" },
            { col: 6, val: "Activos" },
            { col: 7, val: "Suspendidos" },
            { col: 8, val: "Cancelados" },
            { col: 9, val: "Activos" },
            { col: 10, val: "Suspendidos" },
            { col: 11, val: "Cancelados" }
        ];

        // Aplicar estilos a cabeceras
        compSheet.getCell('B5').font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        compSheet.getCell('B5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF333333' } };
        compSheet.getCell('B5').alignment = { horizontal: 'center', vertical: 'middle' };

        // Fila 5 Agrupadores
        const groupFills = [
            { range: 'C5', fg: 'FF2A4D69' }, // Azul sutil
            { range: 'F5', fg: 'FF4B86B4' }, // Azul claro
            { range: 'I5', fg: 'FF333333' }  // Gris oscuro
        ];
        groupFills.forEach(gf => {
            const cell = compSheet.getCell(gf.range);
            cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: gf.fg } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });

        // Fila 6 Detalles
        specificHeaders.forEach(sh => {
            const cell = compSheet.getCell(6, sh.col);
            cell.value = sh.val;
            cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF333333' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAEAEA' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });

        // Poblar filas comparativas
        let currentCompRow = 7;
        urbRows.forEach((row, idx) => {
            const r = currentCompRow;
            compSheet.getCell(`A${r}`).value = idx + 1;
            compSheet.getCell(`B${r}`).value = row.sectorName;

            // Datos actuales (Referenciados a la primera pestaña)
            compSheet.getCell(`C${r}`).value = { formula: `'Análisis por Urbanismo'!C${r}` };
            compSheet.getCell(`D${r}`).value = { formula: `'Análisis por Urbanismo'!E${r}` };
            compSheet.getCell(`E${r}`).value = { formula: `'Análisis por Urbanismo'!G${r}` };

            // Datos anteriores (Búsqueda VLOOKUP en pestaña de pegado)
            compSheet.getCell(`F${r}`).value = { formula: `=IFERROR(VLOOKUP(B${r}, 'Pegar Reporte Anterior'!B:I, 2, FALSE), 0)` };
            compSheet.getCell(`G${r}`).value = { formula: `=IFERROR(VLOOKUP(B${r}, 'Pegar Reporte Anterior'!B:I, 4, FALSE), 0)` };
            compSheet.getCell(`H${r}`).value = { formula: `=IFERROR(VLOOKUP(B${r}, 'Pegar Reporte Anterior'!B:I, 6, FALSE), 0)` };

            // Variación (Cálculo directo de diferencias)
            compSheet.getCell(`I${r}`).value = { formula: `=C${r}-F${r}` };
            compSheet.getCell(`J${r}`).value = { formula: `=D${r}-G${r}` };
            compSheet.getCell(`K${r}`).value = { formula: `=E${r}-H${r}` };

            // Formatos de visualización numérica
            for (let c = 3; c <= 11; c++) {
                const cell = compSheet.getCell(r, c);
                cell.alignment = { horizontal: 'center' };
                if (c >= 9) {
                    // Variaciones: Mostrar el signo + y el signo - explícitamente
                    cell.numFmt = '+0;-0;0';
                } else {
                    cell.numFmt = '#,##0';
                }
            }
            compSheet.getCell(`A${r}`).alignment = { horizontal: 'center' };
            compSheet.getCell(`B${r}`).alignment = { horizontal: 'left' };

            // Bordes delgados
            const borderStyle = {
                top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
            };
            for (let col = 1; col <= 11; col++) {
                compSheet.getCell(r, col).border = borderStyle;
            }

            // Cebra sutil
            if (idx % 2 === 1) {
                for (let col = 1; col <= 11; col++) {
                    compSheet.getCell(r, col).fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFF9F9F9' }
                    };
                }
            }

            currentCompRow++;
        });

        // Fila de totales en comparativa
        const compTotalIndex = currentCompRow;
        compSheet.getCell(`A${compTotalIndex}`).value = "";
        compSheet.getCell(`B${compTotalIndex}`).value = "TOTALES DE CIERRE";
        compSheet.getCell(`B${compTotalIndex}`).font = { bold: true };

        for (let col = 3; col <= 11; col++) {
            const colLetter = String.fromCharCode(64 + col);
            compSheet.getCell(`${colLetter}${compTotalIndex}`).value = { formula: `SUM(${colLetter}7:${colLetter}${compTotalIndex - 1})` };
        }

        // Estilos para la fila de totales comparativa
        for (let col = 1; col <= 11; col++) {
            const cell = compSheet.getCell(compTotalIndex, col);
            cell.font = { bold: true };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAEAEA' } };
            cell.border = {
                top: { style: 'thin', color: { argb: 'FF000000' } },
                bottom: { style: 'double', color: { argb: 'FF000000' } }
            };
            if (col >= 3) {
                cell.alignment = { horizontal: 'center' };
                if (col >= 9) {
                    cell.numFmt = '+0;-0;0';
                } else {
                    cell.numFmt = '#,##0';
                }
            }
        }

        // --- 5. HOJA: DETALLE SHEET ---
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


