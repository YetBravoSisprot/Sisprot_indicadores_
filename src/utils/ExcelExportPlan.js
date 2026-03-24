import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

export const exportPlanesToExcel = async (planesData) => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("TABLA 2 - CLIENTES POR PLAN");

    // Calcular totales para participación
    const totalClientesGeneral = planesData.reduce((acc, p) => acc + p.count, 0);

    // Definir columnas según la imagen 3
    sheet.columns = [
        { header: "Plan", key: "name", width: 40 },
        { header: "Precio", key: "cost", width: 15 },
        { header: "Cantidad de clientes", key: "count", width: 20 },
        { header: "% participación", key: "participation", width: 20 }
    ];

    // Título de la tabla (opcional)
    sheet.insertRow(1, ["TABLA 2 – CLIENTES POR PLAN"]);
    sheet.mergeCells('A1:D1');
    sheet.getRow(1).font = { bold: true, size: 12 };
    sheet.getRow(1).height = 30;
    sheet.getRow(1).alignment = { horizontal: 'left', vertical: 'middle' };

    // Estilo de cabeceras (Fila 2)
    sheet.getRow(2).height = 25;
    sheet.getRow(2).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: '000000' }, size: 11 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF' } }; 
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
        cell.border = {
            bottom: { style: 'thin', color: { argb: '000000' } }
        };
    });

    // Agregar datos
    planesData.forEach(plan => {
        const row = sheet.addRow({
            name: plan.name,
            cost: plan.cost,
            count: plan.count,
            participation: plan.count / totalClientesGeneral
        });

        row.eachCell((cell) => {
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
            cell.border = {
                bottom: { style: 'thin', color: { argb: 'E2E8F0' } }
            };
        });
    });

    // Formato moneda y porcentaje
    sheet.getColumn('B').numFmt = '"$ "#,##0.00';
    sheet.getColumn('D').numFmt = '0.00%';

    // Fila de TOTAL
    const lastRowIndex = sheet.rowCount + 1;
    const totalRow = sheet.addRow({
        name: "TOTAL",
        cost: null,
        count: totalClientesGeneral,
        participation: 1
    });

    totalRow.font = { bold: true };
    totalRow.eachCell((cell) => {
        cell.border = {
            top: { style: 'medium', color: { argb: '000000' } }
        };
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `TABLA_CLIENTES_POR_PLAN_${new Date().toISOString().split('T')[0]}.xlsx`);
};
