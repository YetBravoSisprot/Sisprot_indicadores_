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

export const exportToExcel = async (dataset, appliedFiltersText = [], selectedColumns = ["Todas"], reportType = "general") => {
    const normalizeText = (text) => {
        if (!text) return "";
        return String(text).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
    };

    if (!dataset || dataset.length === 0) {
        console.warn("Dataset vacío, no se puede generar Excel.");
        return;
    }

    const workbook = new ExcelJS.Workbook();
    const hoy = new Date();
    const mesActual = hoy.toLocaleString('es-ES', { month: 'long' }).toUpperCase();
    const anioActual = hoy.getFullYear();

    // --- 1. HOJA DE VALIDACIONES ---
    const validSheet = workbook.addWorksheet("Validaciones");
    const motivos = [
        "Baja por Mudanza", "Cliente no Contestó", "Cliente pronto a realizar pago",
        "Cambio de Proveedor (CHNET)", "Cliente ya Pagó", "Cliente ya solicito cancelación anteriormente",
        "Cliente cortó la llamada", "Cliente con llamada Reprogramada", "No pagó por falta de recursos",
        "Número equivocado", "Pagó, pero aun presenta estado suspendido", "Pagó, pero no sabía reportar su pago",
        "Por Contactar", "Cliente con proceso Administrativo (Convenio)", "Suspension temporal por mudanza",
        "Visita programada para evaluación", "Estado en verificación", "Cambio de Proveedor (FIBEX)",
        "Cambio de Proveedor (NETCOM)", "Cambio de Proveedor (WISP)", "Cliente se encuentra de Vacaciones",
        "Suspension temporal por Viaje", "Baja por descontento del Servicio.", "En Espera de Servicio Técnico",
        "Solicita cancelacion por asuntos personales", "Cambio de Proveedor", "Cambio de Proveedor (NETUNO)",
        "Familiar quedo en mandar Recado."
    ];
    const estados = ["Activo", "Cancelado", "Por Instalar", "Pausado", "Suspendido"];
    const contactados = ["Yetzareth Bravo", "Derwing Acevedo", "Maria Moreno", "Khaloa Serrano"];
    const siNo = ["SI", "NO"];

    validSheet.getCell('A1').value = "Motivos";
    motivos.forEach((m, i) => validSheet.getCell(`A${i + 2}`).value = m);
    validSheet.getCell('B1').value = "Estados";
    estados.forEach((e, i) => validSheet.getCell(`B${i + 2}`).value = e);
    validSheet.getCell('C1').value = "Contactados";
    contactados.forEach((c, i) => validSheet.getCell(`C${i + 2}`).value = c);
    validSheet.getCell('D1').value = "SiNo";
    siNo.forEach((s, i) => validSheet.getCell(`D${i + 2}`).value = s);

    // --- 2. HOJA REPORTE GENERAL ---
    const mainSheet = workbook.addWorksheet("REPORTE GENERAL");

    // Mapeo de columnas disponibles
    const allPossibleColumns = [
        { header: "ESTADO INICIAL", key: "estado_inicial", width: 18, ui: "Estatus" },
        { header: "CONTRATO", key: "contrato", width: 12, ui: "Contrato" },
        { header: "CLIENTE", key: "cliente", width: 35, ui: "Cliente" },
        { header: "CI/RIF", key: "ci_rif", width: 15, ui: "Cedula" },
        { header: "TELEFONO", key: "telefono", width: 15, ui: "Teléfono" },
        { header: "DIRECCION", key: "direccion", width: 40, ui: "Dirección" },
        { header: "SECTOR", key: "sector", width: 20, ui: "Urbanismo" },
        { header: "MIGRADO", key: "migrado", width: 10, ui: "Migrado" },
        { header: "CICLO", key: "ciclo", width: 8, ui: "Ciclo" },
        { header: "PLAN", key: "plan", width: 25, ui: "Plan" },
        { header: "COSTO", key: "costo", width: 14, ui: "Costo" },
        { header: "IP", key: "ip", width: 15, ui: "IP" },
        { header: "MAC", key: "mac", width: 20, ui: "MAC" },
        { header: "FECHA CREACION", key: "fecha_creacion", width: 18, ui: "Fecha_Creación" },
        { header: "DIAS HABILES", key: "dias_habiles", width: 12, ui: "Días Hábiles" },
        { header: "TIPO CLIENTE", key: "tipo_cliente", width: 15, ui: "Tipo_Cliente" }
    ];

    const followUpColumns = [
        { header: "CONTACTADO POR", key: "contactado_por", width: 22 },
        { header: "¿CONTESTO LA LLAMADA?", key: "contesto", width: 22 },
        { header: "ULTIMA FECHA DE CONTACTO", key: "ultima_fecha", width: 25 },
        { header: "ESTADO ACTUALIZADO", key: "estado_actualizado", width: 22 },
        { header: "CONVERSACION DETALLADA CON EL CLIENTE", key: "conversacion", width: 50 },
        { header: "MOTIVO (CIERRE)", key: "motivo_cierre", width: 35 },
        { header: "ADVERTENCIA", key: "advertencia", width: 35 }
    ];

    let finalColumns = [{ header: "N°", key: "num", width: 5 }];

    if (reportType === "operations") {
        // En el de operaciones, las seleccionadas van al principio
        const isAll = selectedColumns.includes("Todas");
        const selected = isAll ? allPossibleColumns : allPossibleColumns.filter(c => selectedColumns.includes(c.ui));
        const rest = isAll ? [] : allPossibleColumns.filter(c => !selectedColumns.includes(c.ui));
        
        finalColumns = [...finalColumns, ...selected, ...followUpColumns, ...rest];
    } else {
        // En el general, usamos el orden estándar que siempre hemos sacado
        const standardOrder = [
            "estado_inicial", "contrato", "cliente", "ci_rif", "telefono", 
            "sector", "migrado", "ciclo", "plan", "costo"
        ];
        const base = allPossibleColumns.filter(c => standardOrder.includes(c.key))
            .sort((a, b) => standardOrder.indexOf(a.key) - standardOrder.indexOf(b.key));
        const rest = allPossibleColumns.filter(c => !standardOrder.includes(c.key));

        finalColumns = [...finalColumns, ...base, ...followUpColumns, ...rest];
    }

    mainSheet.columns = finalColumns;

    // Estilo Cabecera Reporte
    mainSheet.getRow(1).height = 35;
    mainSheet.getRow(1).eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '000000' } };
        cell.font = { color: { argb: 'FFFFFF' }, bold: true, size: 10 };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    });

    dataset.filter(c => !String(c.client_name || "").toUpperCase().includes("PRUEBA"))
        .forEach((cliente, index) => {
            const rowData = {
                num: index + 1,
                estado_inicial: norm(cliente.status_name) || "N/A",
                contrato: cliente.id,
                cliente: cliente.client_name,
                ci_rif: cliente.client_identification,
                telefono: cliente.client_mobile,
                direccion: norm(cliente.address_tax || cliente.address),
                sector: norm(cliente._displaySector || cliente.sector_name),
                migrado: cliente.migrate ? "si" : "No",
                ciclo: mapCycleValue(cliente.cycle),
                plan: cliente.plan?.name || "N/A",
                costo: parseFloat(cliente.plan?.cost || 0),
                ip: cliente.ip_name || "N/A",
                mac: cliente.mac_address || "N/A",
                fecha_creacion: cliente.created_at ? new Date(cliente.created_at).toLocaleDateString() : "N/A",
                dias_habiles: "", 
                tipo_cliente: norm(cliente.client_type_name),
                contactado_por: "",
                contesto: "",
                ultima_fecha: "",
                estado_actualizado: "",
                conversacion: "",
                motivo_cierre: "",
                advertencia: ""
            };

            const row = mainSheet.addRow(rowData);

            row.eachCell((cell, colIndex) => {
                cell.border = { 
                    top: {style:'thin', color: {argb: '000000'}}, 
                    left: {style:'thin', color: {argb: '000000'}}, 
                    bottom: {style:'thin', color: {argb: '000000'}}, 
                    right: {style:'thin', color: {argb: '000000'}} 
                };
                cell.alignment = { vertical: 'middle' };
                
                // Buscar si esta celda es de la columna COSTO
                const columnKey = mainSheet.columns[colIndex - 1].key;

                if (columnKey === 'costo') {
                    cell.numFmt = '"$ "#,##0.00';
                    cell.alignment = { horizontal: 'right', vertical: 'middle' };
                }

                // Coloreo de Estado Inicial
                if (columnKey === 'estado_inicial') { 
                    const status = normalizeText(cliente.status_name);
                    if (status.includes("suspendido")) {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC000' } };
                    } else if (status.includes("activo")) {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '92D050' } };
                    } else if (status.includes("cancelado")) {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0000' } };
                        cell.font = { color: { argb: 'FFFFFF' } };
                    }
                }
            });

            // Validaciones
            if (rowData.contactado_por !== undefined) {
                row.getCell('contactado_por').dataValidation = { type: 'list', formulae: [`'Validaciones'!$C$2:$C$${contactados.length + 1}`] };
                row.getCell('contesto').dataValidation = { type: 'list', formulae: [`'Validaciones'!$D$2:$D$3`] };
                row.getCell('estado_actualizado').dataValidation = { type: 'list', formulae: [`'Validaciones'!$B$2:$B$${estados.length + 1}`] };
                row.getCell('motivo_cierre').dataValidation = { type: 'list', formulae: [`'Validaciones'!$A$2:$A$${motivos.length + 1}`] };
            }
        });

    // Añadir fila de TOTAL al final del reporte general
    const lastRow = mainSheet.rowCount + 1;
    // Buscamos la columna COSTO para el total
    const costoColIndex = mainSheet.columns.findIndex(c => c.key === 'costo') + 1;
    const numColIndex = mainSheet.columns.findIndex(c => c.key === 'num') + 1;
    const contratoColIndex = mainSheet.columns.findIndex(c => c.key === 'contrato') + 1;
    const letter = String.fromCharCode(64 + costoColIndex); // Simplificación, assuming < 26 columns

    if (costoColIndex > 0) {
        const totalLabelCol = contratoColIndex > 0 ? contratoColIndex : (costoColIndex - 1);
        const totalLabelLetter = String.fromCharCode(64 + totalLabelCol);
        const costLetter = String.fromCharCode(64 + costoColIndex);

        mainSheet.getCell(`${totalLabelLetter}${lastRow}`).value = "TOTAL";
        mainSheet.getCell(`${totalLabelLetter}${lastRow}`).font = { bold: true };
        mainSheet.getCell(`${totalLabelLetter}${lastRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D9D9D9' } };
        mainSheet.getCell(`${totalLabelLetter}${lastRow}`).alignment = { horizontal: 'center' };
        mainSheet.getCell(`${totalLabelLetter}${lastRow}`).border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };

        mainSheet.getCell(`${costLetter}${lastRow}`).value = { formula: `SUM(${costLetter}2:${costLetter}${lastRow - 1})`, result: 0 };
        mainSheet.getCell(`${costLetter}${lastRow}`).font = { bold: true };
        mainSheet.getCell(`${costLetter}${lastRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D9D9D9' } };
        mainSheet.getCell(`${costLetter}${lastRow}`).numFmt = '"$ "#,##0.00';
        mainSheet.getCell(`${costLetter}${lastRow}`).border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
    }

    // --- 3. HOJA ESTADISTICA (Solo para reporte general) ---
    if (reportType === "general") {
        const statsSheet = workbook.addWorksheet("ESTADISTICA");
        const mainSheetName = "'REPORTE GENERAL'";
        const lastRowRef = mainSheet.rowCount;

        // Ajuste de anchos
        statsSheet.getColumn('A').width = 2;
        statsSheet.getColumn('B').width = 32;
        statsSheet.getColumn('C').width = 15;
        statsSheet.getColumn('D').width = 5;
        statsSheet.getColumn('E').width = 30;
        statsSheet.getColumn('F').width = 15;
        statsSheet.getColumn('G').width = 15;
        statsSheet.getColumn('H').width = 15;
        statsSheet.getColumn('I').width = 15;
        statsSheet.getColumn('J').width = 15;
        statsSheet.getColumn('K').width = 15;
        statsSheet.getColumn('L').width = 32;
        statsSheet.getColumn('M').width = 22;

        const currencyFormat = '"$ "#.##0,00';

        // --- TABLA IZQUIERDA: ESTADO DEL CLIENTE ---
        statsSheet.getCell('B2').value = "ESTADO DEL CLIENTE";
        statsSheet.getCell('C2').value = "Cantidad";
        statsSheet.getRow(2).font = { bold: true, color: { argb: 'FFFFFF' } };
        statsSheet.getRow(2).eachCell((c, i) => { 
            if(i >= 2 && i <= 3) {
                c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '000000' } };
                c.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
            }
        });

        const tableEstados = ["Activo", "Cancelado", "Pausado", "Suspendido", "(en blanco)"];
        
        // Buscamos la columna ESTADO INICIAL en el reporte general
        const estadoColLetter = String.fromCharCode(64 + mainSheet.columns.findIndex(c => c.key === 'estado_inicial') + 1);
        const costColLetter = String.fromCharCode(64 + mainSheet.columns.findIndex(c => c.key === 'costo') + 1);

        tableEstados.forEach((est, i) => {
            const rowNum = i + 3;
            statsSheet.getCell(`B${rowNum}`).value = est;
            const formulaRef = est === "(en blanco)" ? `=""` : `B${rowNum}`;
            statsSheet.getCell(`C${rowNum}`).value = { 
                formula: `COUNTIF(${mainSheetName}!$${estadoColLetter}$2:$${estadoColLetter}$${lastRowRef}, ${formulaRef})`, 
                result: 0 
            };
            statsSheet.getCell(`B${rowNum}`).border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
            statsSheet.getCell(`C${rowNum}`).border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        });

        const footerRowStats = tableEstados.length + 3;
        statsSheet.getCell(`B${footerRowStats}`).value = "TOTAL GENERAL DE CLIENTES";
        statsSheet.getCell(`C${footerRowStats}`).value = { formula: `SUM(C3:C${footerRowStats-1})`, result: 0 };
        statsSheet.getRow(footerRowStats).font = { bold: true, color: { argb: 'FFFFFF' } };
        statsSheet.getRow(footerRowStats).eachCell((c, i) => { 
            if(i >= 2 && i <= 3) {
                c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '000000' } };
                c.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
            }
        });

        // --- CENTRO: CUADROS Y DASHBOARD ---
        const cicloStr = dataset[0]?.cycle ? `CICLO ${mapCycleValue(dataset[0].cycle)} DE ${mesActual}` : `REPORTE DE ${mesActual}`;
        statsSheet.mergeCells('E4:I4');
        statsSheet.getCell('E4').value = cicloStr;
        statsSheet.getCell('E4').font = { bold: true, size: 16 };
        statsSheet.getCell('E4').alignment = { horizontal: 'center' };

        // Cuadro VERDE (Recuperado) en F6
        statsSheet.getCell('F6').value = { 
            formula: `SUMIF(${mainSheetName}!$${estadoColLetter}$2:$${estadoColLetter}$${lastRowRef}, "Activo", ${mainSheetName}!$${costColLetter}$2:$${costColLetter}$${lastRowRef})`, 
            result: 0 
        };
        statsSheet.getCell('F6').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '92D050' } }; 
        statsSheet.getCell('F6').numFmt = currencyFormat;
        statsSheet.getCell('F6').font = { bold: true };
        statsSheet.getCell('F6').alignment = { horizontal: 'center' };
        statsSheet.getCell('F6').border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };

        // Cuadro AMARILLO (Pendiente) en H10
        statsSheet.getCell('H10').value = { 
            formula: `SUMIF(${mainSheetName}!$${estadoColLetter}$2:$${estadoColLetter}$${lastRowRef}, "Suspendido", ${mainSheetName}!$${costColLetter}$2:$${costColLetter}$${lastRowRef})`, 
            result: 0 
        };
        statsSheet.getCell('H10').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC000' } }; 
        statsSheet.getCell('H10').numFmt = currencyFormat;
        statsSheet.getCell('H10').font = { bold: true };
        statsSheet.getCell('H10').alignment = { horizontal: 'center' };
        statsSheet.getCell('H10').border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };

        // Cuadro GRIS (Otros) en J11
        statsSheet.getCell('J11').value = { 
            formula: `SUMIFS(${mainSheetName}!$${costColLetter}$2:$${costColLetter}$${lastRowRef}, ${mainSheetName}!$${estadoColLetter}$2:$${estadoColLetter}$${lastRowRef}, "<>Activo", ${mainSheetName}!$${estadoColLetter}$2:$${estadoColLetter}$${lastRowRef}, "<>Suspendido")`, 
            result: 0 
        };
        statsSheet.getCell('J11').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'A5A5A5' } }; 
        statsSheet.getCell('J11').numFmt = currencyFormat;
        statsSheet.getCell('J11').font = { bold: true, color: { argb: 'FFFFFF' } };
        statsSheet.getCell('J11').alignment = { horizontal: 'center' };
        statsSheet.getCell('J11').border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };

        // Total en el centro
        statsSheet.getCell('E14').value = "TOTAL GENERAL DE CLIENTES";
        statsSheet.getCell('E14').font = { bold: true };
        statsSheet.getCell('E15').value = "Total";
        statsSheet.getCell('I15').value = { formula: `SUM(${mainSheetName}!$${costColLetter}$2:$${costColLetter}$${lastRowRef})`, result: 0 };
        statsSheet.getCell('I15').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '000000' } };
        statsSheet.getCell('I15').font = { color: { argb: 'FFFFFF' }, bold: true };
        statsSheet.getCell('I15').numFmt = currencyFormat;
        statsSheet.getCell('I15').alignment = { horizontal: 'center' };
        statsSheet.getCell('I15').border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };

        // --- TABLA DERECHA: MIGRADO / NO MIGRADO ---
        const migradoColLetter = String.fromCharCode(64 + mainSheet.columns.findIndex(c => c.key === 'migrado') + 1);
        statsSheet.getCell('L2').value = "MIGRADO / NO MIGRADO";
        statsSheet.getCell('M2').value = "Monto Total";
        statsSheet.getRow(2).eachCell((c, i) => { 
            if(i >= 12) { 
                c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '000000' } }; 
                c.font = { color: { argb: 'FFFFFF'}, bold: true }; 
                c.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
            } 
        });

        statsSheet.getCell('L3').value = "si";
        statsSheet.getCell('M3').value = { formula: `SUMIF(${mainSheetName}!$${migradoColLetter}$2:$${migradoColLetter}$${lastRowRef}, "si", ${mainSheetName}!$${costColLetter}$2:$${costColLetter}$${lastRowRef})`, result: 0 };
        statsSheet.getCell('L4').value = "No";
        statsSheet.getCell('M4').value = { formula: `SUMIF(${mainSheetName}!$${migradoColLetter}$2:$${migradoColLetter}$${lastRowRef}, "No", ${mainSheetName}!$${costColLetter}$2:$${costColLetter}$${lastRowRef})`, result: 0 };
        
        [3, 4].forEach(r => {
            statsSheet.getCell(`L${r}`).border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
            statsSheet.getCell(`M${r}`).border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
            statsSheet.getCell(`M${r}`).numFmt = currencyFormat;
        });

        statsSheet.getCell('L5').value = "Total general";
        statsSheet.getCell('M5').value = { formula: `SUM(M3:M4)`, result: 0 };
        statsSheet.getRow(5).eachCell((c, i) => { 
            if(i >= 12) { 
                c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '000000' } }; 
                c.font = { color: { argb: 'FFFFFF'}, bold: true }; 
                c.numFmt = currencyFormat;
                c.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
            } 
        });

        statsSheet.autoFilter = {
            from: { row: 2, column: 2 },
            to: { row: footerRowStats, column: 3 }
        };
    }
    // No se pueden poner múltiples autoFilters por hoja en ExcelJS, pero cubrimos la principal

    // Ajustes finales de ancho de columna para estética
    // --- GENERAR Y DESCARGAR ---
    const buffer = await workbook.xlsx.writeBuffer();
    const nombreArchivo = `reporte_sisprot_INTELIGENTE_${hoy.toISOString().split('T')[0]}.xlsx`;
    saveAs(new Blob([buffer]), nombreArchivo);
};
