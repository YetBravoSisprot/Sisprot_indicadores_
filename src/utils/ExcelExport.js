import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const norm = (v) => (v == null ? "" : String(v).trim());

function mapCycleValue(val) {
    if (val === null || val === undefined) return "N/A";
    const cycle = String(val).trim();
    if (cycle === "10") return "15";
    if (cycle === "25") return "30";
    return cycle;
}

export const exportToExcel = async (dataset, appliedFiltersText = [], selectedColumns = ["Todas"], reportType = "general", customFileName = null) => {
    if (!dataset || dataset.length === 0) return;

    const workbook = new ExcelJS.Workbook();
    const hoy = new Date();
    
    // --- HELPERS ---
    const getColumnLetter = (colIdx) => {
        let letter = "";
        while (colIdx > 0) {
            let temp = (colIdx - 1) % 26;
            letter = String.fromCharCode(65 + temp) + letter;
            colIdx = Math.floor((colIdx - temp) / 26);
        }
        return letter || "A";
    };

    // --- 1. HOJA DE VALIDACIONES ---
    const validSheet = workbook.addWorksheet("Validaciones");
    const motivos = ["Baja por Mudanza", "Cliente no Contestó", "Cliente pronto a realizar pago", "Cambio de Proveedor (CHNET)", "Cliente ya Pagó", "Cliente ya solicito cancelación anteriormente", "Cliente cortó la llamada", "Cliente con llamada Reprogramada", "No pagó por falta de recursos", "Número equivocado", "Pagó, pero aun presenta estado suspendido", "Pagó, pero no sabía reportar su pago", "Por Contactar", "Cliente con proceso Administrativo (Convenio)", "Suspension temporal por mudanza", "Visita programada para evaluación", "Estado en verificación", "Cambio de Proveedor (FIBEX)", "Cambio de Proveedor (NETCOM)"];
    const estados = ["Activo", "Cancelado", "Por Instalar", "Pausado", "Suspendido"];
    const contactados = ["Yetzareth Bravo", "Khaloa Serrano", "Maria Moreno", "Derwing Acevedo"];
    
    motivos.forEach((m, i) => validSheet.getRow(i+2).getCell(1).value = m);
    estados.forEach((e, i) => validSheet.getRow(i+2).getCell(2).value = e);
    contactados.forEach((c, i) => validSheet.getRow(i+2).getCell(3).value = c);

    // --- 2. HOJA PRINCIPAL ---
    const mainSheetName = "REPORTE GENERAL";
    const mainSheet = workbook.addWorksheet(mainSheetName);

    const allConfig = [
        { header: "ESTADO INICIAL", key: "estado_inicial", width: 18, ui: "Estatus" },
        { header: "ESTADO FINAL (OPERACIÓN)", key: "estado_final", width: 22, ui: "Estado Final" },
        { header: "CONTRATO", key: "contrato", width: 12, ui: "Contrato" },
        { header: "CLIENTE", key: "cliente", width: 35, ui: "Cliente" },
        { header: "CIVIL", key: "ci_rif", width: 15, ui: "Cedula" },
        { header: "TELEFONO", key: "telefono", width: 15, ui: "Teléfono" },
        { header: "DIRECCIÓN", key: "direccion", width: 35, ui: "Dirección" },
        { header: "SECTOR", key: "sector", width: 20, ui: "Urbanismo" },
        { header: "MIGRADO", key: "migrado", width: 10, ui: "Migrado" },
        { header: "CICLO", key: "ciclo", width: 8, ui: "Ciclo" },
        { header: "PLAN", key: "plan", width: 25, ui: "Plan" },
        { header: "COSTO", key: "costo", width: 14, ui: "Costo" },
        { header: "IP", key: "ip", width: 15, ui: "IP" },
        { header: "MAC", key: "mac", width: 20, ui: "MAC" },
        { header: "FECHA CREACIÓN", key: "fecha_creacion", width: 15, ui: "Fecha_Creación" },
        { header: "DÍAS HÁBILES", key: "dias_habiles", width: 15, ui: "Días Hábiles" },
        { header: "TIPO CLIENTE", key: "tipo_cliente", width: 15, ui: "Tipo_Cliente" }
    ];

    let finalCols = [{ header: "N°", key: "num", width: 5 }];
    if (selectedColumns.includes("Todas")) {
        finalCols = [...finalCols, ...allConfig];
    } else {
        allConfig.forEach(col => {
            if (selectedColumns.includes(col.ui)) finalCols.push(col);
        });
    }
    mainSheet.columns = finalCols;

    // Header Style
    mainSheet.getRow(1).height = 25;
    mainSheet.getRow(1).eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1F4E78' } };
        cell.font = { color: { argb: 'FFFFFF' }, bold: true };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    // Rows
    dataset.forEach((c, idx) => {
        const row = mainSheet.addRow({
            num: idx + 1,
            estado_inicial: norm(c.estado_inicial || c.status),
            estado_final: norm(c.estado_final || c.status),
            contrato: norm(c.contrato || c.contract_number),
            cliente: norm(c.cliente || c.client_name),
            ci_rif: norm(c.ci_rif || c.client_identification),
            telefono: norm(c.telefono || c.client_mobile),
            direccion: norm(c.direccion || c.address),
            sector: norm(c.sector || c.sector_name),
            migrado: norm(c.migrado === true || c.is_migrated === true ? "si" : "No"),
            ciclo: mapCycleValue(c.ciclo || c.cycle),
            plan: norm(c.plan?.name || c.plan_name),
            costo: parseFloat(c.costo || c.price || 0),
            ip: norm(c.ip || c.client_ip),
            mac: norm(c.mac || c.client_mac),
            fecha_creacion: norm(c.fecha_creacion || c.created_at),
            dias_habiles: norm(c.dias_habiles),
            tipo_cliente: norm(c.tipo_cliente || c.client_type_name)
        });

        // Cell Data Validations
        const finalCell = row.getCell('estado_final');
        if (finalCell) finalCell.dataValidation = { type: 'list', formulae: [`'Validaciones'!$B$2:$B$${estados.length + 1}`] };
    });

    // Totals row (General only)
    if (reportType === "general") {
        const rowCount = mainSheet.rowCount;
        if (rowCount > 1) {
            const costIdx = mainSheet.columns.findIndex(c => c.key === 'costo') + 1;
            if (costIdx > 0) {
                const lastRow = rowCount + 1;
                const costLetter = getColumnLetter(costIdx);
                const totalCell = mainSheet.getRow(lastRow).getCell(costIdx);
                totalCell.value = { formula: `SUM(${costLetter}2:${costLetter}${lastRow - 1})`, result: 0 };
                totalCell.font = { bold: true };
                totalCell.numFmt = '"$ "#,##0.00';
                
                const labelCell = mainSheet.getRow(lastRow).getCell(costIdx - 1 > 0 ? costIdx - 1 : 1);
                labelCell.value = "TOTAL";
                labelCell.font = { bold: true };
            }
        }
    }

    // AutoFilter
    mainSheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: mainSheet.columns.length } };

    // Conditional Formatting for status
    const statIdx = mainSheet.columns.findIndex(c => c.key === 'estado_final') + 1;
    if (statIdx > 0) {
        const colLet = getColumnLetter(statIdx);
        mainSheet.addConditionalFormatting({
            ref: `${colLet}2:${colLet}${mainSheet.rowCount}`,
            rules: [
                { type: 'cellIs', operator: 'equal', formulae: ['"Activo"'], style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FF92D050' } } } },
                { type: 'cellIs', operator: 'equal', formulae: ['"Suspendido"'], style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFFC000' } } } },
                { type: 'cellIs', operator: 'equal', formulae: ['"Cancelado"'], style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFF0000' }, font: { color: { argb: 'FFFFFFFF' } } } } }
            ]
        });
    }

    if (reportType === "operations") {
        const statsSheet = workbook.addWorksheet("Estadisticas");
        const estIdx = mainSheet.columns.findIndex(c => c.key === 'estado_final') + 1;
        const costIdx = mainSheet.columns.findIndex(c => c.key === 'costo') + 1;
        const migIdx = mainSheet.columns.findIndex(c => c.key === 'migrado') + 1;
        const cicIdx = mainSheet.columns.findIndex(c => c.key === 'ciclo') + 1;
        
        if (estIdx > 0 && costIdx > 0) {
            const estLet = getColumnLetter(estIdx);
            const costLet = getColumnLetter(costIdx);
            const migLet = getColumnLetter(migIdx > 0 ? migIdx : 1);
            const cicLet = getColumnLetter(cicIdx > 0 ? cicIdx : 1);
            const mRef = `'${mainSheetName}'`;
            const last = mainSheet.rowCount;

            // Header Stats
            statsSheet.getRow(2).height = 20;
            [2, 3, 4].forEach(c => {
                const cell = statsSheet.getRow(2).getCell(c);
                cell.value = ["ESTADO", "CANTIDAD", "IMPORTE"][c-2];
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '000000' } };
                cell.font = { color: { argb: 'FFFFFF' }, bold: true };
                cell.alignment = { horizontal: 'center' };
            });

            const statuses = ["Activo", "Suspendido", "Cancelado", "Pausado", "Por Instalar"];
            statuses.forEach((status, i) => {
                const r = i + 3;
                statsSheet.getRow(r).getCell(2).value = status;
                statsSheet.getRow(r).getCell(3).value = { formula: `COUNTIF(${mRef}!$${estLet}$2:$${estLet}$${last}, B${r})`, result: 0 };
                statsSheet.getRow(r).getCell(4).value = { formula: `SUMIF(${mRef}!$${estLet}$2:$${estLet}$${last}, B${r}, ${mRef}!$${costLet}$2:$${costLet}$${last})`, result: 0 };
                statsSheet.getRow(r).getCell(4).numFmt = '"$ "#,##0.00';
            });

            // Summary Cards
            statsSheet.getRow(12).getCell(2).value = "RECAUDADO:";
            statsSheet.getRow(12).getCell(3).value = { formula: `SUMIF(${mRef}!$${estLet}$2:$${estLet}$${last}, "Activo", ${mRef}!$${costLet}$2:$${costLet}$${last})`, result: 0 };
            statsSheet.getRow(13).getCell(2).value = "PENDIENTE:";
            statsSheet.getRow(13).getCell(3).value = { formula: `SUMIF(${mRef}!$${estLet}$2:$${estLet}$${last}, "Suspendido", ${mRef}!$${costLet}$2:$${costLet}$${last})`, result: 0 };
            statsSheet.getRow(14).getCell(2).value = "% RECUPERADO:";
            statsSheet.getRow(14).getCell(3).value = { formula: `IFERROR(C12/(C12+C13), 0)`, result: 0 };
            statsSheet.getRow(14).getCell(3).numFmt = '0.00%';

            // Migración Table
            statsSheet.getRow(2).getCell(6).value = "MIGRADO / NO MIGRADO";
            statsSheet.getRow(2).getCell(7).value = "PENDIENTE";
            statsSheet.getRow(2).getCell(8).value = "RECAUDADO";
            ["si", "No"].forEach((mig, i) => {
                const r = i + 3;
                statsSheet.getRow(r).getCell(6).value = (mig === "si" ? "MIGRADOS" : "NO MIGRADOS");
                statsSheet.getRow(r).getCell(7).value = { formula: `SUMIFS(${mRef}!$${costLet}$2:$${costLet}$${last}, ${mRef}!$${migLet}$2:$${migLet}$${last}, "${mig}", ${mRef}!$${estLet}$2:$${estLet}$${last}, "Suspendido")`, result: 0 };
                statsSheet.getRow(r).getCell(8).value = { formula: `SUMIFS(${mRef}!$${costLet}$2:$${costLet}$${last}, ${mRef}!$${migLet}$2:$${migLet}$${last}, "${mig}", ${mRef}!$${estLet}$2:$${estLet}$${last}, "Activo")`, result: 0 };
            });
        }
    }

    // Download
    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = customFileName || `reporte_general_${hoy.toISOString().split('T')[0]}.xlsx`;
    saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), fileName);
};
