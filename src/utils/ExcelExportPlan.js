import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

export const exportPlanesToExcel = async (planesData) => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Ingresos por Plan");

    sheet.columns = [
        { header: "PLAN", key: "name", width: 40 },
        { header: "COSTO UNITARIO ($)", key: "cost", width: 20 },
        { header: "CLIENTES TOTALES", key: "count", width: 20 },
        { header: "CLIENTES ACTIVOS", key: "activeCount", width: 20 },
        { header: "INGRESO TOTAL ($)", key: "revenue", width: 20 },
        { header: "CATEGORÍA", key: "category", width: 20 }
    ];

    // Estilo cabecera
    sheet.getRow(1).height = 25;
    sheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 11 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1e3a8a' } }; // Azul oscuro
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };
    });

    planesData.forEach(plan => {
        const row = sheet.addRow({
            name: plan.name,
            cost: plan.cost,
            count: plan.count,
            activeCount: plan.activeCount || 0,
            revenue: plan.revenue,
            category: plan.category
        });

        row.eachCell((cell) => {
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
            cell.alignment = { vertical: 'middle' };
        });
    });

    // Formato moneda
    sheet.getColumn('B').numFmt = '"$ "#,##0.00';
    sheet.getColumn('E').numFmt = '"$ "#,##0.00';
    
    // Alineación central para conteos
    sheet.getColumn('C').alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getColumn('D').alignment = { horizontal: 'center', vertical: 'middle' };

    // Añadir fila de totales
    const lastRow = sheet.rowCount + 1;
    sheet.getCell(`A${lastRow}`).value = "TOTAL GENERAL";
    sheet.getCell(`A${lastRow}`).font = { bold: true };
    
    const countCol = "C";
    const activeCol = "D";
    const revenueCol = "E";
    
    sheet.getCell(`${countCol}${lastRow}`).value = { formula: `SUM(${countCol}2:${countCol}${lastRow - 1})` };
    sheet.getCell(`${activeCol}${lastRow}`).value = { formula: `SUM(${activeCol}2:${activeCol}${lastRow - 1})` };
    sheet.getCell(`${revenueCol}${lastRow}`).value = { formula: `SUM(${revenueCol}2:${revenueCol}${lastRow - 1})` };
    
    sheet.getRow(lastRow).font = { bold: true };
    sheet.getRow(lastRow).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'f1f5f9' } };
    sheet.getCell(`${revenueCol}${lastRow}`).numFmt = '"$ "#,##0.00';

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Reporte_Ingresos_por_Plan_${new Date().toISOString().split('T')[0]}.xlsx`);
};
