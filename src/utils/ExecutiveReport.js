import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { mapCycleValue } from "./cycleHelper";

const formatCurrency = (val) => `$ ${parseFloat(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const norm = (v) => (v == null ? "" : String(v).trim());

// --- DATA HISTÓRICA (RESPALDO GITHUB): Fetch de snapshot del día anterior ---
const fetchHistoricalClients = async () => {
    const RAW_URL = "https://raw.githubusercontent.com/YetBravoSisprot/data_json_dia_ayer/main/data%20empresa%2010-2.json.json";
    try {
        const response = await fetch(RAW_URL);
        if (!response.ok) throw new Error("Error HTTP al recuperar histórico");
        const rawJson = await response.json();
        // El JSON de GitHub es un array directo de clientes
        return Array.isArray(rawJson) ? rawJson : (rawJson.results || []);
    } catch (e) {
        console.error("Fallo al cargar data histórica de GitHub:", e);
        return null;
    }
};

/**
 * Calcula estadísticas por urbanismo para un dataset dado
 */
const getStatsByUrbanismo = (data) => {
    // Filtrar solo Pyme y Residencial para consistencia comercial
    const filtered = data.filter(c => {
        const type = (c.client_subdivision || c.client_type_name || '').toUpperCase();
        return type.includes("PYME") || type.includes("RESIDENCIAL");
    });

    return filtered.reduce((acc, c) => {
        const u = norm(c.sector_name || c._displaySector) || "OTROS";
        const s = (c.status_name || 'OTROS').toUpperCase();
        
        if (!acc[u]) acc[u] = { ACTIVO: 0, CANCELADO: 0, SUSPENDIDO: 0, TOTAL: 0 };
        
        if (s.includes('ACTIVO')) acc[u].ACTIVO++;
        else if (s.includes('CANCELADO')) acc[u].CANCELADO++;
        else if (s.includes('SUSPENDIDO')) acc[u].SUSPENDIDO++;
        
        acc[u].TOTAL++;
        return acc;
    }, {});
};

export const exportExecutiveReport = async (dataset, appliedFiltersText = [], userName = "", selectedColumns = ["Todas"]) => {
    try {
        if (!dataset || !Array.isArray(dataset)) {
            console.error("Dataset invalido para reporte");
            return;
        }

        // 1. Obtener data de ayer para la comparativa
        const historicalData = await fetchHistoricalClients();
        const statsHoy = getStatsByUrbanismo(dataset);
        const statsAyer = historicalData ? getStatsByUrbanismo(historicalData) : {};

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
        titleCell.value = "REPORTE EJECUTIVO DE GESTIÓN COMERCIAL";
        titleCell.font = { name: 'Calibri', size: 20, bold: true, color: { argb: 'FFFFFFFF' } };
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

        dashSheet.mergeCells('B4:K4');
        const subTitleCell = dashSheet.getCell('B4');
        subTitleCell.value = `Generado para: ${userName} | Fecha de Corte: ${dateStr}`;
        subTitleCell.font = { italic: true, size: 11, color: { argb: 'FF595959' } };
        subTitleCell.alignment = { horizontal: 'right' };

        // FILTROS APLICADOS (Contexto)
        dashSheet.getCell('B6').value = "CRITERIOS DE BÚSQUEDA / FILTROS ACTIVOS:";
        dashSheet.getCell('B6').font = { bold: true, size: 10, color: { argb: 'FF1F4E78' } };
        dashSheet.mergeCells('B7:K7');
        dashSheet.getCell('B7').value = appliedFiltersText.join(" | ") || "Sin filtros específicos (Universo Comercial)";
        dashSheet.getCell('B7').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
        dashSheet.getCell('B7').font = { italic: true, size: 9 };

        // --- CÁLCULOS DE DATA (Comercial: Pyme/Residencial) ---
        const pymeClientes = dataset.filter(c => (c.client_subdivision || c.client_type_name || '').toUpperCase().includes("PYME"));
        const resClientes = dataset.filter(c => (c.client_subdivision || c.client_type_name || '').toUpperCase().includes("RESIDENCIAL"));
        
        const ingresoPyme = pymeClientes.reduce((acc, c) => acc + parseFloat(c.plan?.cost || 0), 0);
        const ingresoRes = resClientes.reduce((acc, c) => acc + parseFloat(c.plan?.cost || 0), 0);
        const totalIngreso = ingresoPyme + ingresoRes;
        const totalCount = pymeClientes.length + resClientes.length;

        // --- KPI CARDS (Simulados con celdas) ---
        const kpi1Start = 9;
        
        // Recuadro 1: Total Clientes
        dashSheet.mergeCells(`B${kpi1Start}:C${kpi1Start + 2}`);
        const kpi1 = dashSheet.getCell(`B${kpi1Start}`);
        kpi1.value = `CLIENTES TOTALES\n${totalCount.toLocaleString()}`;
        kpi1.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
        kpi1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF34495E' } };
        kpi1.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

        // Recuadro 2: Ingreso Total
        dashSheet.mergeCells(`D${kpi1Start}:F${kpi1Start + 2}`);
        const kpi2 = dashSheet.getCell(`D${kpi1Start}`);
        kpi2.value = `INGRESO PROYECTADO MENSUAL\n${formatCurrency(totalIngreso)}`;
        kpi2.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
        kpi2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF27AE60' } };
        kpi2.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

        // Recuadro 3: Ticket Promedio
        dashSheet.mergeCells(`G${kpi1Start}:K${kpi1Start + 2}`);
        const kpi3 = dashSheet.getCell(`G${kpi1Start}`);
        const avg = totalCount > 0 ? (totalIngreso / totalCount) : 0;
        kpi3.value = `TICKET PROMEDIO POR CLIENTE\n${formatCurrency(avg)}`;
        kpi3.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
        kpi3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2980B9' } };
        kpi3.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

        // --- DESGLOSE POR TIPO (TABLA INTERNA) ---
        const tableStart = 14;
        dashSheet.getCell(`B${tableStart}`).value = "📦 DESGLOSE POR MODELO COMERCIAL";
        dashSheet.getCell(`B${tableStart}`).font = { bold: true, size: 12, color: { argb: 'FF1F4E78' } };

        const headers = ["Tipo de Cliente", "Cantidad de Contratos", "Ingreso Mensual Proyectado", "% Participación en Cartera"];
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

        // --- DISTRIBUCIÓN POR ESTATUS (Visualización) ---
        const statusStart = 19;
        dashSheet.getCell(`B${statusStart}`).value = "📊 DISTRIBUCIÓN POR ESTATUS ACTUAL";
        dashSheet.getCell(`B${statusStart}`).font = { bold: true, size: 12, color: { argb: 'FF1F4E78' } };

        const statusCounts = dataset.reduce((acc, c) => {
            const s = c.status_name || 'OTROS';
            acc[s] = (acc[s] || 0) + 1;
            return acc;
        }, {});

        let curRow = statusStart + 1;
        Object.entries(statusCounts).sort((a,b) => b[1] - a[1]).slice(0, 5).forEach(([status, count]) => {
            dashSheet.getCell(`B${curRow}`).value = status;
            dashSheet.getCell(`C${curRow}`).value = count;
            dashSheet.getCell(`C${curRow}`).alignment = { horizontal: 'center' };
            
            // Simular barra
            const ratio = count / dataset.length;
            const barCells = Math.max(1, Math.round(ratio * 8));
            
            for (let col = 0; col < barCells; col++) {
                const cell = dashSheet.getCell(curRow, 4 + col);
                let color = 'FFBDC3C7';
                if (status === 'Activo') color = 'FF2ECC71';
                else if (status === 'Suspendido') color = 'FFF1C40F';
                else if (status === 'Cancelado') color = 'FFE74C3C';
                else if (status === 'Pausado') color = 'FF3498DB';

                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
            }
            curRow++;
        });

        // --- TABLERO DE CONTROL Y MOVIMIENTOS POR NODO (FILA 28+) ---
        const urbTableStart = 28;
        dashSheet.getCell(`B${urbTableStart}`).value = "🚩 TABLERO DE CONTROL Y MOVIMIENTOS POR NODO (COMPARATIVA AYER)";
        dashSheet.getCell(`B${urbTableStart}`).font = { bold: true, size: 14, color: { argb: 'FFC00000' } };

        const sortedStats = Object.entries(statsHoy).sort((a, b) => b[1].TOTAL - a[1].TOTAL);

        // Headers: Data Actual vs Data Anterior (Comparativa)
        const urbHeaders = [
            "Urbanismo / Sector", 
            "Total Hoy", "Ayer", 
            "Activos", "Ayer", 
            "Cancel.", "Ayer", 
            "Susp.", "Ayer",
            "Variación Neta"
        ];
        const colLetters = ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];
        
        urbHeaders.forEach((h, i) => {
            const cell = dashSheet.getCell(urbTableStart + 1, 2 + i);
            cell.value = h;
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF203764' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        });

        sortedStats.forEach(([name, stats], i) => {
            const rowNum = urbTableStart + 2 + i;
            const hStats = statsAyer[name] || { TOTAL: 0, ACTIVO: 0, CANCELADO: 0, SUSPENDIDO: 0 };

            dashSheet.getCell(`B${rowNum}`).value = name;
            
            // --- DATA ACTUAL ---
            dashSheet.getCell(`C${rowNum}`).value = stats.TOTAL;
            dashSheet.getCell(`E${rowNum}`).value = stats.ACTIVO;
            dashSheet.getCell(`G${rowNum}`).value = stats.CANCELADO;
            dashSheet.getCell(`I${rowNum}`).value = stats.SUSPENDIDO;

            // --- DATA ANTERIOR (Automática de GitHub) ---
            dashSheet.getCell(`D${rowNum}`).value = hStats.TOTAL;
            dashSheet.getCell(`F${rowNum}`).value = hStats.ACTIVO;
            dashSheet.getCell(`H${rowNum}`).value = hStats.CANCELADO;
            dashSheet.getCell(`J${rowNum}`).value = hStats.SUSPENDIDO;

            // Variación Neta (K) = Total Hoy (C) - Total Ayer (D)
            const variacion = stats.TOTAL - hStats.TOTAL;
            const varCell = dashSheet.getCell(`K${rowNum}`);
            varCell.value = variacion;
            varCell.font = { bold: true, color: { argb: variacion > 0 ? 'FF00B050' : variacion < 0 ? 'FFFF0000' : 'FF000000' } };

            // Formato visual de celdas "Ayer"
            ['D', 'F', 'H', 'J'].forEach(col => {
                dashSheet.getCell(`${col}${rowNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
                dashSheet.getCell(`${col}${rowNum}`).font = { italic: true, color: { argb: 'FF7F7F7F' } };
            });

            dashSheet.getRow(rowNum).alignment = { horizontal: 'center' };
            dashSheet.getCell(`B${rowNum}`).alignment = { horizontal: 'left' };
            
            // Bordes
            colLetters.forEach(col => {
                dashSheet.getCell(`${col}${rowNum}`).border = {
                    top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}
                };
            });
        });

        // --- FILA DE TOTALES ---
        const totalRow = urbTableStart + 2 + sortedStats.length;
        const globalTotal = sortedStats.reduce((acc, [_, s]) => acc + s.TOTAL, 0);
        const globalAct = sortedStats.reduce((acc, [_, s]) => acc + s.ACTIVO, 0);
        const globalCan = sortedStats.reduce((acc, [_, s]) => acc + s.CANCELADO, 0);
        const globalSus = sortedStats.reduce((acc, [_, s]) => acc + s.SUSPENDIDO, 0);

        const globalTotalAyer = Object.values(statsAyer).reduce((acc, s) => acc + s.TOTAL, 0);
        const globalActAyer = Object.values(statsAyer).reduce((acc, s) => acc + s.ACTIVO, 0);
        const globalCanAyer = Object.values(statsAyer).reduce((acc, s) => acc + s.CANCELADO, 0);
        const globalSusAyer = Object.values(statsAyer).reduce((acc, s) => acc + s.SUSPENDIDO, 0);

        dashSheet.getCell(`B${totalRow}`).value = "TOTAL GENERAL SELECCIÓN";
        dashSheet.getCell(`C${totalRow}`).value = globalTotal;
        dashSheet.getCell(`D${totalRow}`).value = globalTotalAyer;
        dashSheet.getCell(`E${totalRow}`).value = globalAct;
        dashSheet.getCell(`F${totalRow}`).value = globalActAyer;
        dashSheet.getCell(`G${totalRow}`).value = globalCan;
        dashSheet.getCell(`H${totalRow}`).value = globalCanAyer;
        dashSheet.getCell(`I${totalRow}`).value = globalSus;
        dashSheet.getCell(`J${totalRow}`).value = globalSusAyer;
        
        const globalVar = globalTotal - globalTotalAyer;
        dashSheet.getCell(`K${totalRow}`).value = globalVar;

        dashSheet.getRow(totalRow).font = { bold: true };
        dashSheet.getRow(totalRow).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
        colLetters.forEach(col => {
            dashSheet.getCell(`${col}${totalRow}`).border = {
                top: {style:'medium'}, left: {style:'thin'}, bottom: {style:'medium'}, right: {style:'thin'}
            };
        });

        // --- LEYENDA Y NOTAS ---
        const legendRow = totalRow + 2;
        dashSheet.getCell(`B${legendRow}`).value = "💡 GUÍA DE INTERPRETACIÓN DE MOVIMIENTOS:";
        dashSheet.getCell(`B${legendRow}`).font = { bold: true, color: { argb: 'FF1F4E78' } };
        dashSheet.mergeCells(`B${legendRow + 1}:K${legendRow + 4}`);
        dashSheet.getCell(`B${legendRow + 1}`).value = 
            "• Las columnas 'Ayer' se cargan automáticamente desde el respaldo histórico de Taurus IA.\n" +
            "• Variación Neta: Indica el crecimiento o decrecimiento total del urbanismo respecto al día anterior.\n" +
            "• Alerta de Fuga: Si 'Cancelados Hoy' es mayor a 'Cancelados Ayer', se recomienda revisar causas de baja en ese nodo.\n" +
            "• Recuperación: Un descenso en 'Suspendidos' acompañado de un alza en 'Activos' indica cobranza efectiva.";
        dashSheet.getCell(`B${legendRow + 1}`).alignment = { wrapText: true, vertical: 'top' };

        // --- NOTA METODOLÓGICA ---
        const noteStart = legendRow + 6;
        dashSheet.mergeCells(`B${noteStart}:G${noteStart + 3}`);
        const noteCell = dashSheet.getCell(`B${noteStart}`);
        noteCell.value = "NOTA METODOLÓGICA Y FUENTE DE DATOS:\n" + 
                         "1. Este reporte se genera filtrando el Universo Maestro de SisProt.\n" +
                         "2. Solo se incluyen clientes 'Pyme' y 'Residencial' para el cálculo de ingresos proyectados.\n" +
                         "3. La data de ayer corresponde al snapshot de cierre (8:00 PM) del día anterior.";
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
            { header: "ESTATUS", key: "status_name", width: 18, ui: "Estatus" },
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
        const fileName = `Reporte_Ejecutivo_Taurus_${hoy.toISOString().split('T')[0]}.xlsx`;
        saveAs(new Blob([buffer]), fileName);
      } catch (err) {
        console.error("CRITICAL ERROR IN EXCEL GEN:", err);
        alert("Error crítico al generar el Excel Ejecutivo: " + err.message);
      }
};

