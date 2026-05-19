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


