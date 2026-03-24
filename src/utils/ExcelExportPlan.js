import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

export const exportPlanesToExcel = async (planesData) => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("CLIENTES POR PLAN");

    const totalClientesGeneral = planesData.reduce((acc, p) => acc + p.count, 0);

    const sortedPlanes = [...planesData].sort((a, b) => {
        if (a.category === b.category) {
            return a.cost - b.cost;
        }
        return a.category === "PYME" ? -1 : 1;
    });

    const BLUE_THEME = 'FF0070C0'; // Azul profesional
    const LIGHT_BLUE_BORDER = 'FFBFDBFE';

    // Título
    sheet.insertRow(1, ["REPORTE DE CLIENTES PYMES Y RESIDENCIALES ACTIVOS"]);
    sheet.mergeCells('A1:E1');
    sheet.getRow(1).font = { bold: true, size: 14, color: { argb: BLUE_THEME } };
    sheet.getRow(1).height = 35;
    sheet.getRow(1).alignment = { horizontal: 'left', vertical: 'middle' };

    // Cabeceras (Fila 3)
    const headerRow = sheet.getRow(3);
    headerRow.values = ["Plan", "Precio ($)", "Cantidad de clientes", "Monto total por plan ($)", "% participación"];
    sheet.columns = [
        { key: "name", width: 40 },
        { key: "cost", width: 15 },
        { key: "count", width: 22 },
        { key: "revenue", width: 25 },
        { key: "participation", width: 20 }
    ];

    headerRow.height = 25;
    headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: '000000' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFC' } };
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
        cell.border = {
            top: { style: 'thin', color: { argb: BLUE_THEME } },
            bottom: { style: 'medium', color: { argb: BLUE_THEME } },
            left: { style: 'thin', color: { argb: LIGHT_BLUE_BORDER } },
            right: { style: 'thin', color: { argb: LIGHT_BLUE_BORDER } }
        };
    });

    // Filtros
    sheet.autoFilter = 'A3:E3';

    // Datos
    sortedPlanes.forEach(plan => {
        const row = sheet.addRow({
            name: plan.name,
            cost: plan.cost,
            count: plan.count,
            revenue: plan.revenue,
            participation: plan.count / totalClientesGeneral
        });

        row.eachCell((cell, colNumber) => {
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
            cell.border = {
                bottom: { style: 'thin', color: { argb: LIGHT_BLUE_BORDER } },
                left: { style: 'thin', color: { argb: LIGHT_BLUE_BORDER } },
                right: { style: 'thin', color: { argb: LIGHT_BLUE_BORDER } }
            };
            
            // Si es la columna de ingresos, poner en negrita (como en la imagen)
            if (colNumber === 4) {
                cell.font = { bold: true };
            }
        });
    });

    // Formatos
    sheet.getColumn('B').numFmt = '"$ "#,##0.00';
    sheet.getColumn('D').numFmt = '"$ "#,##0.00';
    sheet.getColumn('E').numFmt = '0.00%';

    // Fila TOTAL
    const lastRowIndex = sheet.rowCount + 1;
    const totalRevenueGeneral = planesData.reduce((acc, p) => acc + p.revenue, 0);

    const totalRow = sheet.addRow({
        name: "Total mensual",
        cost: null,
        count: totalClientesGeneral,
        revenue: totalRevenueGeneral,
        participation: 1
    });

    totalRow.height = 25;
    totalRow.font = { bold: true };
    totalRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
        cell.border = {
            top: { style: 'medium', color: { argb: BLUE_THEME } },
            bottom: { style: 'medium', color: { argb: BLUE_THEME } }
        };
    });
    
    sheet.getCell(`D${lastRowIndex}`).numFmt = '"$ "#,##0.00';
    sheet.getCell(`E${lastRowIndex}`).numFmt = '0.00%'; // Sincronizado para mostrar 100% correctamente

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Reporte de ingresos de planes.xlsx`);
};
