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

    // Añadir Título Específico al inicio
    sheet.insertRow(1, ["REPORTE DE CLIENTES PYMES Y RESIDENCIALES ACTIVOS"]);
    sheet.mergeCells('A1:E1');
    sheet.getRow(1).font = { bold: true, size: 12 };
    sheet.getRow(1).height = 30;
    sheet.getRow(1).alignment = { horizontal: 'left', vertical: 'middle' };

    // Definir columnas (A partir de la Fila 3 para dejar espacio al título)
    sheet.getRow(3).values = ["Plan", "Precio ($)", "Cantidad de clientes", "Monto total por plan ($)", "% participación"];
    sheet.columns = [
        { key: "name", width: 40 },
        { key: "cost", width: 15 },
        { key: "count", width: 20 },
        { key: "revenue", width: 25 },
        { key: "participation", width: 20 }
    ];

    // Estilo de cabeceras (Fila 3)
    sheet.getRow(3).height = 25;
    sheet.getRow(3).eachCell((cell) => {
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
    
    // Formato moneda para el total recaudado y porcentaje corregido
    sheet.getCell(`D${lastRowIndex}`).numFmt = '"$ "#,##0.00';
    sheet.getCell(`E${lastRowIndex}`).numFmt = '0.00%'; // Quitamos el literal '100.00%' que causaba error

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `REPORTE_CLIENTES_PLAN_ACTIVOS_${new Date().toISOString().split('T')[0]}.xlsx`);
};
