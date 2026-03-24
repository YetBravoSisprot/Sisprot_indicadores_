import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const formatCurrency = (val) => `$ ${parseFloat(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const exportExecutiveReport = async (dataset, appliedFiltersText = [], userName = "") => {
    const workbook = new ExcelJS.Workbook();
    const hoy = new Date();
    const dateStr = hoy.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

    // --- 1. HOJA: RESUMEN EJECUTIVO (VISUAL/DASHBOARD) ---
    const dashSheet = workbook.addWorksheet("Dashboard Ejecutivo");
    
    // Configuración estética de la hoja
    dashSheet.properties.defaultRowHeight = 20;
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
    titleCell.font = { name: 'Calibri', size: 18, bold: true, color: { argb: 'FFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1F4E78' } };
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
    dashSheet.getCell('B7').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F2F2F2' } };

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
    kpi1.font = { size: 14, bold: true, color: { argb: 'FFFFFF' } };
    kpi1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '34495e' } };
    kpi1.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

    // Recuadro 2: Ingreso Total
    dashSheet.mergeCells(`D${kpi1Start}:E${kpi1Start + 2}`);
    const kpi2 = dashSheet.getCell(`D${kpi1Start}`);
    kpi2.value = `INGRESO PROYECTADO\n${formatCurrency(totalIngreso)}`;
    kpi2.font = { size: 14, bold: true, color: { argb: 'FFFFFF' } };
    kpi2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '27ae60' } };
    kpi2.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

    // Recuadro 3: Ticket Promedio
    dashSheet.mergeCells(`F${kpi1Start}:G${kpi1Start + 2}`);
    const kpi3 = dashSheet.getCell(`F${kpi1Start}`);
    const avg = totalCount > 0 ? (totalIngreso / totalCount) : 0;
    kpi3.value = `TICKET PROMEDIO\n${formatCurrency(avg)}`;
    kpi3.font = { size: 14, bold: true, color: { argb: 'FFFFFF' } };
    kpi3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2980b9' } };
    kpi3.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

    // --- DESGLOSE POR TIPO (TABLA INTERNA) ---
    const tableStart = 14;
    dashSheet.getCell(`B${tableStart}`).value = "DESGLOSE POR MODELO COMERCIAL";
    dashSheet.getCell(`B${tableStart}`).font = { bold: true, size: 12 };

    const headers = ["Tipo de Cliente", "Cantidad", "Ingreso Mensual", "% Participación"];
    headers.forEach((h, i) => {
        const cell = dashSheet.getCell(tableStart + 1, 2 + i);
        cell.value = h;
        cell.font = { bold: true, color: { argb: 'FFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '000000' } };
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

    // --- GRÁFICO DE BARRAS "ARTESANAL" (Usando celdas y rellenos) ---
    // Distribución por Estatus
    const statusStart = 20;
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
        const maxBarWidth = 4; // Celdas D, E, F, G
        const ratio = count / dataset.length;
        const barCells = Math.max(1, Math.round(ratio * 4));
        
        for (let col = 0; col < barCells; col++) {
            const cell = dashSheet.getCell(curRow, 4 + col);
            let color = 'bdc3c7'; // Gris default
            if (status === 'Activo') color = '2ecc71';
            else if (status === 'Suspendido') color = 'f1c40f';
            else if (status === 'Cancelado') color = 'e74c3c';

            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
        }
        curRow++;
    });

    // --- 2. HOJA: DETALLE DE CLIENTES (LA TABLA) ---
    const detailSheet = workbook.addWorksheet("Detalle de Clientes");
    
    const columns = [
        { header: "CONTRATO", key: "id", width: 12 },
        { header: "CLIENTE", key: "client_name", width: 35 },
        { header: "CI/RIF", key: "client_identification", width: 15 },
        { header: "TELÉFONO", key: "client_mobile", width: 15 },
        { header: "ESTATUS", key: "status_name", width: 15 },
        { header: "SECTOR", key: "sector_name", width: 25 },
        { header: "PLAN", key: "plan_name", width: 25 },
        { header: "COSTO", key: "costo", width: 12 },
        { header: "IP", key: "ip", width: 15 },
        { header: "MAC", key: "mac", width: 20 },
    ];

    detailSheet.columns = columns;

    // Estilo cabecera detalle
    detailSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    detailSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '000000' } };
    detailSheet.getRow(1).alignment = { horizontal: 'center' };

    dataset.forEach(cliente => {
        detailSheet.addRow({
            id: cliente.id,
            client_name: cliente.client_name,
            client_identification: cliente.client_identification,
            client_mobile: cliente.client_mobile,
            status_name: cliente.status_name,
            sector_name: cliente.sector_name,
            plan_name: cliente.plan?.name || "N/A",
            costo: parseFloat(cliente.plan?.cost || 0),
            ip: cliente.ip_name || "N/A",
            mac: cliente.mac_address || "N/A"
        });
    });

    // Formato moneda en detalle
    detailSheet.getColumn('costo').numFmt = '"$ "#,##0.00';

    // Auto-filtros en detalle
    detailSheet.autoFilter = `A1:J${dataset.length + 1}`;

    // --- FINALIZACIÓN ---
    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `Reporte_Ejecutivo_Sisprot_${hoy.toISOString().split('T')[0]}.xlsx`;
    saveAs(new Blob([buffer]), fileName);
};
