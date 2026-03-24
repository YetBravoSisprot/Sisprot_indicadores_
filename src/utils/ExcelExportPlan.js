import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

export const exportPlanesToExcel = async (planesData) => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("CLIENTES POR PLAN");

    // Calcular total de clientes para el % de participación
    const totalClientesGeneral = planesData.reduce((acc, p) => acc + p.count, 0);

    // Ordenar: PYMEs primero (menor a mayor precio), luego Residenciales (menor a mayor precio)
    const sortedPlanes = [...planesData].sort((a, b) => {
        if (a.category === b.category) {
            return a.cost - b.cost;
        }
        return a.category === "PYME" ? -1 : 1;
    });

    // Definir columnas (Añadiendo "Monto total por plan")
    sheet.columns = [
        { header: "Plan", key: "name", width: 40 },
        { header: "Precio ($)", key: "cost", width: 15 },
        { header: "Cantidad de clientes", key: "count", width: 20 },
        { header: "Monto total por plan ($)", key: "revenue", width: 25 },
        { header: "% participación", key: "participation", width: 20 }
    ];

    // Estilo de cabeceras (Fila 1)
    sheet.getRow(1).height = 25;
    sheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: '000000' }, size: 11 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF' } }; 
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
        cell.border = {
            bottom: { style: 'thin', color: { argb: '000000' } }
        };
    });

    // Agregar datos
    sortedPlanes.forEach(plan => {
        const row = sheet.addRow({
            name: plan.name,
            cost: plan.cost,
            count: plan.count,
            revenue: plan.revenue,
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
    sheet.getColumn('D').numFmt = '"$ "#,##0.00';
    sheet.getColumn('E').numFmt = '0.00%';

    // Fila de TOTAL
    const lastRowIndex = sheet.rowCount + 1;
    const totalRevenueGeneral = planesData.reduce((acc, p) => acc + p.revenue, 0);

    const totalRow = sheet.addRow({
        name: "TOTAL",
        cost: null,
        count: totalClientesGeneral,
        revenue: totalRevenueGeneral,
        participation: 1
    });

    totalRow.font = { bold: true };
    totalRow.eachCell((cell) => {
        cell.border = {
            top: { style: 'medium', color: { argb: '000000' } }
        };
    });
    
    // Formato moneda para el total recaudado
    sheet.getCell(`D${lastRowIndex}`).numFmt = '"$ "#,##0.00';
    sheet.getCell(`E${lastRowIndex}`).numFmt = '100.00%';

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `REPORTE_CLIENTES_POR_PLAN_${new Date().toISOString().split('T')[0]}.xlsx`);
};
