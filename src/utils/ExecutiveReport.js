import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { mapCycleValue } from "./cycleHelper";

const formatCurrency = (val) => `$ ${parseFloat(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const norm = (v) => (v == null ? "" : String(v).trim());

export const exportExecutiveReport = async (dataset, appliedFiltersText = [], userName = "", selectedColumns = ["Todas"]) => {
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
    dashSheet.getColumn('C').width = 20;
    dashSheet.getColumn('D').width = 25;
    dashSheet.getColumn('E').width = 15;
    dashSheet.getColumn('F').width = 15;
    dashSheet.getColumn('G').width = 15;

    // TÍTULO PRINCIPAL
    dashSheet.mergeCells('B2:G3');
    const titleCell = dashSheet.getCell('B2');
    titleCell.value = "REPORTE EJECUTIVO DE GESTIÓN COMERCIAL";
    titleCell.font = { name: 'Calibri', size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    dashSheet.mergeCells('B4:G4');
    const subTitleCell = dashSheet.getCell('B4');
    subTitleCell.value = `Generado para: ${userName} | Fecha: ${dateStr}`;
    subTitleCell.font = { italic: true, size: 11 };
    subTitleCell.alignment = { horizontal: 'right' };

    // FILTROS APLICADOS (Contexto)
    dashSheet.getCell('B6').value = "CRITERIOS DE BÚSQUEDA:";
    dashSheet.getCell('B6').font = { bold: true };
    dashSheet.mergeCells('B7:G7');
    dashSheet.getCell('B7').value = appliedFiltersText.join(" | ") || "Sin filtros específicos";
    dashSheet.getCell('B7').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };

    // --- CÁLCULOS DE DATA (Comercial: Pyme/Residencial) ---
    const pymeClientes = dataset.filter(c => (c.client_subdivision || c.client_type_name || '').toUpperCase().includes("PYME"));
    const resClientes = dataset.filter(c => (c.client_subdivision || c.client_type_name || '').toUpperCase().includes("RESIDENCIAL"));
    
    const ingresoPyme = pymeClientes.reduce((acc, c) => acc + parseFloat(c.plan?.cost || 0), 0);
    const ingresoRes = resClientes.reduce((acc, c) => acc + parseFloat(c.plan?.cost || 0), 0);
    const totalIngreso = ingresoPyme + ingresoRes;
    const totalCount = pymeClientes.length + resClientes.length;

    // --- KPI CARDS (Simulados con celdas) ---
    // Recuadro 1: Total Clientes
    const kpi1Start = 9;
    dashSheet.mergeCells(`B${kpi1Start}:C${kpi1Start + 2}`);
    const kpi1 = dashSheet.getCell(`B${kpi1Start}`);
    kpi1.value = `CLIENTES TOTALES\n${totalCount}`;
    kpi1.font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    kpi1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF34495E' } };
    kpi1.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

    // Recuadro 2: Ingreso Total
    dashSheet.mergeCells(`D${kpi1Start}:E${kpi1Start + 2}`);
    const kpi2 = dashSheet.getCell(`D${kpi1Start}`);
    kpi2.value = `INGRESO PROYECTADO\n${formatCurrency(totalIngreso)}`;
    kpi2.font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    kpi2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF27AE60' } };
    kpi2.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

    // Recuadro 3: Ticket Promedio
    dashSheet.mergeCells(`F${kpi1Start}:G${kpi1Start + 2}`);
    const kpi3 = dashSheet.getCell(`F${kpi1Start}`);
    const avg = totalCount > 0 ? (totalIngreso / totalCount) : 0;
    kpi3.value = `TICKET PROMEDIO\n${formatCurrency(avg)}`;
    kpi3.font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    kpi3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2980B9' } };
    kpi3.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

    // --- DESGLOSE POR TIPO (TABLA INTERNA) ---
    const tableStart = 14;
    dashSheet.getCell(`B${tableStart}`).value = "DESGLOSE POR MODELO COMERCIAL";
    dashSheet.getCell(`B${tableStart}`).font = { bold: true, size: 12 };

    const headers = ["Tipo de Cliente", "Cantidad", "Ingreso Mensual", "% Participación"];
    headers.forEach((h, i) => {
        const cell = dashSheet.getCell(tableStart + 1, 2 + i);
        cell.value = h;
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } };
        cell.alignment = { horizontal: 'center' };
    });

    const dataRows = [
        ["RESIDENCIAL", resClientes.length, ingresoRes, totalIngreso > 0 ? (ingresoRes / totalIngreso) : 0],
        ["PYME", pymeClientes.length, ingresoPyme, totalIngreso > 0 ? (ingresoPyme / totalIngreso) : 0],
    ];

    dataRows.forEach((row, i) => {
        const rowNum = tableStart + 2 + i;
        dashSheet.getCell(`B${rowNum}`).value = row[0];
        dashSheet.getCell(`C${rowNum}`).value = row[1];
        dashSheet.getCell(`D${rowNum}`).value = row[2];
        dashSheet.getCell(`D${rowNum}`).numFmt = '"$ "#,##0.00';
        dashSheet.getCell(`E${rowNum}`).value = row[3];
        dashSheet.getCell(`E${rowNum}`).numFmt = '0.0%';
        
        dashSheet.getRow(rowNum).alignment = { horizontal: 'center' };
    });

    // --- GRÁFICO DE BARRAS "ARTESANAL" (Usando celdas y rellenos) (FILA 20-25) ---
    // Distribución por Estatus
    const statusStart = 19;
    dashSheet.getCell(`B${statusStart}`).value = "DISTRIBUCIÓN POR ESTATUS (Visualización)";
    dashSheet.getCell(`B${statusStart}`).font = { bold: true, size: 12 };

    const statusCounts = dataset.reduce((acc, c) => {
        const s = c.status_name || 'OTROS';
        acc[s] = (acc[s] || 0) + 1;
        return acc;
    }, {});

    let curRow = statusStart + 1;
    Object.entries(statusCounts).sort((a,b) => b[1] - a[1]).slice(0, 5).forEach(([status, count]) => {
        dashSheet.getCell(`B${curRow}`).value = status;
        dashSheet.getCell(`C${curRow}`).value = count;
        
        // Simular barra
        const maxBarWidth = 4;
        const ratio = count / dataset.length;
        const barCells = Math.max(1, Math.round(ratio * 4));
        
        for (let col = 0; col < barCells; col++) {
            const cell = dashSheet.getCell(curRow, 4 + col);
            let color = 'FFBDC3C7';
            if (status === 'Activo') color = 'FF2ECC71';
            else if (status === 'Suspendido') color = 'FFF1C40F';
            else if (status === 'Cancelado') color = 'FFE74C3C';

            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
        }
        curRow++;
    });

    // --- TOP URBANISMOS (FILA 28+) ---
    const urbStart = 27;
    dashSheet.getCell(`B${urbStart}`).value = "TOP 5 SECTORES POR CLIENTES";
    dashSheet.getCell(`B${urbStart}`).font = { bold: true, size: 12 };

    const urbCounts = dataset.reduce((acc, c) => {
        const u = norm(c.sector_name || c._displaySector);
        if (u) acc[u] = (acc[u] || 0) + 1;
        return acc;
    }, {});

    const topUrbs = Object.entries(urbCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

    if (topUrbs.length > 0) {
        topUrbs.forEach((urb, i) => {
            const rowNum = urbStart + 1 + i;
            dashSheet.getCell(`B${rowNum}`).value = `${i + 1}. ${urb[0]}`;
            dashSheet.getCell(`C${rowNum}`).value = urb[1];
            dashSheet.getCell(`C${rowNum}`).alignment = { horizontal: 'center' };
            
            // Barra azul para sectores
            const maxVal = topUrbs[0][1];
            const ratio = maxVal > 0 ? urb[1] / maxVal : 0;
            const barCells = Math.max(1, Math.round(ratio * 4));
            for (let col = 0; col < barCells; col++) {
                dashSheet.getCell(rowNum, 4 + col).fill = { 
                    type: 'pattern', 
                    pattern: 'solid', 
                    fgColor: { argb: 'FF3498DB' } 
                };
            }
        });
    } else {
        dashSheet.getCell(`B${urbStart + 1}`).value = "(Sin datos de urbanismos en la selección)";
    }

    // --- NUEVA TABLA: DETALLE POR URBANISMO Y ESTATUS (FILA 35+) ---
    const urbTableStart = 35;
    dashSheet.getCell(`B${urbTableStart}`).value = "TABLERO DE CONTROL Y MOVIMIENTOS POR NODO";
    dashSheet.getCell(`B${urbTableStart}`).font = { bold: true, size: 14, color: { argb: 'FF1F4E78' } };

    const statusByUrb = dataset.reduce((acc, c) => {
        const u = norm(c.sector_name || c._displaySector) || "OTROS";
        const s = (c.status_name || 'OTROS').toUpperCase();
        
        if (!acc[u]) acc[u] = { ACTIVO: 0, CANCELADO: 0, SUSPENDIDO: 0, TOTAL: 0 };
        
        if (s.includes('ACTIVO')) acc[u].ACTIVO++;
        else if (s.includes('CANCELADO')) acc[u].CANCELADO++;
        else if (s.includes('SUSPENDIDO')) acc[u].SUSPENDIDO++;
        
        acc[u].TOTAL++;
        return acc;
    }, {});

    const sortedStats = Object.entries(statusByUrb).sort((a, b) => b[1].TOTAL - a[1].TOTAL);

    // Headers: Data Actual vs Data Anterior (Comparativa)
    const urbHeaders = [
        "Urbanismo", 
        "Total Hoy", "Ant.", 
        "Activos", "Ant.", 
        "Cancelados", "Ant.", 
        "Suspendidos", "Ant.",
        "Variación Neta"
    ];
    const colLetters = ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];
    
    urbHeaders.forEach((h, i) => {
        const cell = dashSheet.getCell(urbTableStart + 1, 2 + i);
        cell.value = h;
        cell.font = { bold: true, color: { argb: 'FFFFFFFF', size: 9 } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF203764' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    });

    sortedStats.forEach(([name, stats], i) => {
        const rowNum = urbTableStart + 2 + i;

        dashSheet.getCell(`B${rowNum}`).value = name;
        
        // --- DATA ACTUAL ---
        dashSheet.getCell(`C${rowNum}`).value = stats.TOTAL;
        dashSheet.getCell(`E${rowNum}`).value = stats.ACTIVO;
        dashSheet.getCell(`G${rowNum}`).value = stats.CANCELADO;
        dashSheet.getCell(`I${rowNum}`).value = stats.SUSPENDIDO;

        // --- ZONA DE ENTRADA (ANTERIOR) - Celdas amarillas para pegar data ---
        const inputCols = ['D', 'F', 'H', 'J'];
        inputCols.forEach(col => {
            dashSheet.getCell(`${col}${rowNum}`).value = 0;
            dashSheet.getCell(`${col}${rowNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFCC' } };
        });

        // --- FORMULAS DE VARIACIÓN ---
        // Variación Neta (K) = Total Hoy (C) - Total Ant (D)
        dashSheet.getCell(`K${rowNum}`).value = { formula: `C${rowNum}-D${rowNum}` };
        dashSheet.getCell(`K${rowNum}`).font = { bold: true };

        // --- ALERTAS DE MOVIMIENTO ---
        // Si Cancelados Hoy (G) > Cancelados Ant (H) -> ALERTA ROJA (Fuga)
        // Se aplicará mediante formato condicional manual del usuario o sugerencia visual:
        // Nota: ExcelJS no aplica formato condicional dinámico tan fácil, pero podemos dejar la estructura.

        dashSheet.getRow(rowNum).alignment = { horizontal: 'center' };
        dashSheet.getCell(`B${rowNum}`).alignment = { horizontal: 'left' };
        
        // Bordes
        colLetters.forEach(col => {
            dashSheet.getCell(`${col}${rowNum}`).border = {
                top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}
            };
        });
    });

    // --- LEYENDA DE MOVIMIENTOS ---
    const legendRow = urbTableStart + 2 + sortedStats.length + 1;
    dashSheet.getCell(`B${legendRow}`).value = "🚦 GUÍA PARA ANÁLISIS DE MOVIMIENTOS:";
    dashSheet.getCell(`B${legendRow}`).font = { bold: true, color: { argb: 'FFC00000' } };
    dashSheet.mergeCells(`B${legendRow + 1}:K${legendRow + 4}`);
    dashSheet.getCell(`B${legendRow + 1}`).value = 
        "1. Abre tu reporte anterior y copia los valores de Total, Activos, Cancelados y Suspendidos.\n" +
        "2. Pégalos en las columnas amarillas ('Ant.') correspondientes a cada estatus.\n" +
        "3. OBSERVACIÓN DE SALUD:\n" +
        "   - Si 'Cancelados' subió: Tienes una fuga de clientes en ese nodo.\n" +
        "   - Si 'Suspendidos' bajó y 'Activos' subió: Hubo una recuperación/cobranza exitosa.\n" +
        "   - 'Variación Neta' positiva indica crecimiento real del urbanismo.";
    dashSheet.getCell(`B${legendRow + 1}`).alignment = { wrapText: true, vertical: 'top' };

    // --- FILA DE TOTALES ---
    const totalRow = urbTableStart + 2 + sortedStats.length;
    const globalTotal = sortedStats.reduce((acc, [_, s]) => acc + s.TOTAL, 0);
    const globalAct = sortedStats.reduce((acc, [_, s]) => acc + s.ACTIVO, 0);
    const globalCan = sortedStats.reduce((acc, [_, s]) => acc + s.CANCELADO, 0);
    const globalSus = sortedStats.reduce((acc, [_, s]) => acc + s.SUSPENDIDO, 0);

    dashSheet.getCell(`B${totalRow}`).value = "TOTAL GENERAL";
    dashSheet.getCell(`C${totalRow}`).value = globalTotal;
    dashSheet.getCell(`E${totalRow}`).value = globalAct;
    dashSheet.getCell(`G${totalRow}`).value = globalCan;
    dashSheet.getCell(`I${totalRow}`).value = globalSus;
    dashSheet.getCell(`K${totalRow}`).value = { formula: `C${totalRow}-D${totalRow}` };

    dashSheet.getRow(totalRow).font = { bold: true };
    dashSheet.getRow(totalRow).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
    colLetters.forEach(col => {
        dashSheet.getCell(`${col}${totalRow}`).border = {
            top: {style:'medium'}, left: {style:'thin'}, bottom: {style:'medium'}, right: {style:'thin'}
        };
    });

    // --- NOTA EXPLICATIVA SOBRE LA DATA (Dinámica) ---
    const noteStart = legendRow + 6;
    dashSheet.mergeCells(`B${noteStart}:G${noteStart + 3}`);
    const noteCell = dashSheet.getCell(`B${noteStart}`);
    noteCell.value = "NOTA METODOLÓGICA Y FUENTE DE DATOS:\n" + 
                     "1. Este reporte se obtiene filtrando el Universo Maestro de SisProt según los criterios seleccionados en el Chatbot.\n" +
                     "2. Se aplican reglas comerciales automáticas: Solo se incluyen clientes 'Pyme' y 'Residencial'.\n" +
                     "3. El Ingreso Proyectado es la sumatoria de costos de planes contratados y NO representa dinero en caja real al cierre de caja.";
    noteCell.font = { italic: true, size: 9, color: { argb: 'FF444444' } };
    noteCell.alignment = { vertical: 'top', wrapText: true };
    noteCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9F9F9' } };
    noteCell.border = { 
        top: {style:'thin', color: {argb: 'FF000000'}}, 
        left: {style:'thin', color: {argb: 'FF000000'}}, 
        bottom: {style:'thin', color: {argb: 'FF000000'}}, 
        right: {style:'thin', color: {argb: 'FF000000'}} 
    };

    // --- 2. HOJA: DETALLE DE CLIENTES (LA TABLA DINÁMICA) ---
    const detailSheet = workbook.addWorksheet("Detalle de Clientes");
    
    const allDetailColumns = [
        { header: "ESTADO INICIAL", key: "status_name", width: 18, ui: "Estatus" },
        { header: "CONTRATO", key: "id", width: 12, ui: "Contrato" },
        { header: "CLIENTE", key: "client_name", width: 35, ui: "Cliente" },
        { header: "CI/RIF", key: "client_identification", width: 15, ui: "Cedula" },
        { header: "TELÉFONO", key: "client_mobile", width: 15, ui: "Teléfono" },
        { header: "DIRECCIÓN", key: "address", width: 35, ui: "Dirección" },
        { header: "INTERFACE", key: "interface", width: 25, ui: "Interface" },
        { header: "SECTOR", key: "sector_name", width: 25, ui: "Urbanismo" },
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
    const finalDetailColumns = isAll 
        ? allDetailColumns 
        : allDetailColumns.filter(c => selectedColumns.includes(c.ui) || selectedColumns.includes(c.header));

    detailSheet.columns = [{ header: "N°", key: "num", width: 5 }, ...finalDetailColumns];

    // Estilo cabecera detalle
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

    // Formato moneda si existe la columna costo
    if (detailSheet.columns) {
        detailSheet.columns.forEach(col => {
            if (col && col.key === 'costo') {
                col.numFmt = '"$ "#,##0.00';
            }
        });
    }

    // Auto-filtros en detalle
    detailSheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: detailSheet.columns.length }
    };

    // --- FINALIZACIÓN ---
    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `Reporte_Ejecutivo_Sisprot_${hoy.toISOString().split('T')[0]}.xlsx`;
    saveAs(new Blob([buffer]), fileName);
  } catch (err) {
    console.error("CRITICAL ERROR IN EXCEL GEN:", err);
    alert("Error crítico al generar el Excel Ejecutivo: " + err.message);
  }
};
