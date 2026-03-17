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
        "Cambio de Proveedor (NETCOM)"
    ];
    const estados = ["Activo", "Cancelado", "Por Instalar", "Pausado", "Suspendido"];
    const contactados = [
        "Yetzareth Bravo", "Khaloa Serrano", "Maria Moreno", "Derwing Acevedo"
    ];
    const siNo = ["SI", "NO"];

    validSheet.getColumn('A').width = 45;
    validSheet.getColumn('B').width = 20;
    validSheet.getColumn('C').width = 30;
    validSheet.getColumn('D').width = 15;

    validSheet.getCell('A1').value = "Motivo";
    validSheet.getCell('B1').value = "Estado";
    validSheet.getCell('C1').value = "Contactado Por";
    validSheet.getCell('D1').value = "Condicional";

    validSheet.getRow(1).font = { bold: true };
    validSheet.getRow(1).alignment = { horizontal: 'center' };

    motivos.forEach((m, i) => {
        const cell = validSheet.getCell(`A${i + 2}`);
        cell.value = m;
        cell.alignment = { horizontal: 'center' };
    });
    estados.forEach((e, i) => {
        const cell = validSheet.getCell(`B${i + 2}`);
        cell.value = e;
        cell.alignment = { horizontal: 'center' };
    });
    contactados.forEach((c, i) => {
        const cell = validSheet.getCell(`C${i + 2}`);
        cell.value = c;
        cell.alignment = { horizontal: 'center' };
    });
    siNo.forEach((s, i) => {
        const cell = validSheet.getCell(`D${i + 2}`);
        cell.value = s;
        cell.alignment = { horizontal: 'center' };
    });

    // --- 2. HOJA REPORTE GENERAL ---
    const mainSheet = workbook.addWorksheet("REPORTE GENERAL");

    const allPossibleColumns = [
        { header: "ESTADO INICIAL", key: "estado_inicial", width: 18, ui: "Estatus" },
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

    const followUpColumns = [
        { header: "CONTACTADO POR", key: "contactado_por", width: 22 },
        { header: "¿CONTESTO LA LLAMADA?", key: "contesto", width: 22 },
        { header: "ULTIMA FECHA DE CONTACTO", key: "ultima_fecha", width: 25 },
        { header: "TRABAJO ACTUAL", key: "estado_actualizado", width: 22 },
        { header: "ESTACION DETALLADA CON EL CLIENTE", key: "conversacion", width: 50 },
        { header: "MOTIVO (CIERRE)", key: "motivo_cierre", width: 35 },
        { header: "ADVERTENCIA", key: "advertencia", width: 35 }
    ];

    let finalColumns = [{ header: "N°", key: "num", width: 5 }];

    const standardOrder = [
        "estado_inicial", "contrato", "cliente", "ci_rif", "telefono", 
        "sector", "migrado", "ciclo", "plan", "costo"
    ];

    if (reportType === "operations") {
        // En el de operaciones, usamos SIEMPRE el orden estándar y agregamos las de seguimiento. NO seleccionables.
        const base = allPossibleColumns.filter(c => standardOrder.includes(c.key))
            .sort((a, b) => standardOrder.indexOf(a.key) - standardOrder.indexOf(b.key));
        
        finalColumns = [...finalColumns, ...base, ...followUpColumns];
    } else {
        // En el general, SI respetamos las columnas seleccionadas por el usuario
        const isAll = selectedColumns.includes("Todas");
        
        if (isAll) {
            const base = allPossibleColumns.filter(c => standardOrder.includes(c.key))
                .sort((a, b) => standardOrder.indexOf(a.key) - standardOrder.indexOf(b.key));
            finalColumns = [...finalColumns, ...base];
        } else {
            const selected = allPossibleColumns.filter(c => selectedColumns.includes(c.ui));
            finalColumns = [...finalColumns, ...selected];
        }
    }

    mainSheet.columns = finalColumns;

    // Estilo Cabecera Reporte
    mainSheet.getRow(1).height = 35;
    // Añadir AutoFiltro a todas las columnas usando el número total de columnas
    mainSheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: finalColumns.length }
    };

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
            row.getCell('estado_inicial').dataValidation = { type: 'list', formulae: [`'Validaciones'!$B$2:$B$${estados.length + 1}`] };
            
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

    // --- 3. HOJA ESTADISTICA (Solo para reporte operaciones) ---
    if (reportType === "operations") {
        const statsSheet = workbook.addWorksheet("ESTADISTICA");
        const mainSheetName = "'REPORTE GENERAL'";
        const lastRowRef = mainSheet.rowCount - 1; // Excluir la fila de TOTAL al final

        statsSheet.getColumn('A').width = 2;
        statsSheet.getColumn('B').width = 35;
        statsSheet.getColumn('C').width = 15;
        statsSheet.getColumn('D').width = 20;
        statsSheet.getColumn('E').width = 18;
        statsSheet.getColumn('F').width = 18;
        statsSheet.getColumn('G').width = 18;
        statsSheet.getColumn('H').width = 5;
        statsSheet.getColumn('I').width = 30;
        statsSheet.getColumn('J').width = 15;

        const currencyFormat = '"$ "#,##0.00';

        // --- TABLA IZQUIERDA: RESUMEN OPERATIVO TOTAL ---
        statsSheet.getCell('B2').value = "ESTADO DEL CLIENTE";
        statsSheet.getCell('C2').value = "CANTIDAD";
        statsSheet.getCell('D2').value = "IMPORTE TOTAL";
        
        [statsSheet.getCell('B2'), statsSheet.getCell('C2'), statsSheet.getCell('D2')].forEach(c => {
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '000000' } };
            c.font = { color: { argb: 'FFFFFF' }, bold: true };
            c.border = { top: {style:'thin'}, bottom: {style:'thin'} };
            c.alignment = { horizontal: 'center' };
        });

        const tableEstados = ["Activo", "Suspendido", "Cancelado", "Pausado", "Por Instalar"];
        const estadoColLetter = String.fromCharCode(64 + mainSheet.columns.findIndex(c => c.key === 'estado_inicial') + 1);
        const costColLetter = String.fromCharCode(64 + mainSheet.columns.findIndex(c => c.key === 'costo') + 1);

        tableEstados.forEach((est, i) => {
            const rowNum = i + 3;
            statsSheet.getCell(`B${rowNum}`).value = est;
            
            // Cantidad
            statsSheet.getCell(`C${rowNum}`).value = { 
                formula: `COUNTIF(${mainSheetName}!$${estadoColLetter}$2:$${estadoColLetter}$${lastRowRef}, B${rowNum})`, 
                result: 0 
            };
            
            // Monto $
            statsSheet.getCell(`D${rowNum}`).value = { 
                formula: `SUMIF(${mainSheetName}!$${estadoColLetter}$2:$${estadoColLetter}$${lastRowRef}, B${rowNum}, ${mainSheetName}!$${costColLetter}$2:$${costColLetter}$${lastRowRef})`, 
                result: 0 
            };

            statsSheet.getCell(`B${rowNum}`).border = {};
            statsSheet.getCell(`C${rowNum}`).alignment = { horizontal: 'center' };
            statsSheet.getCell(`D${rowNum}`).numFmt = currencyFormat;
            statsSheet.getCell(`D${rowNum}`).border = {};
        });

        let footerRowStats = tableEstados.length + 3;
        statsSheet.getCell(`B${footerRowStats}`).value = "TOTAL GENERAL";
        statsSheet.getCell(`C${footerRowStats}`).value = { formula: `SUM(C3:C${footerRowStats-1})`, result: 0 };
        statsSheet.getCell(`D${footerRowStats}`).value = { formula: `SUM(D3:D${footerRowStats-1})`, result: 0 };
        
        [statsSheet.getCell(`B${footerRowStats}`), statsSheet.getCell(`C${footerRowStats}`), statsSheet.getCell(`D${footerRowStats}`)].forEach(c => {
            c.font = { bold: true };
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DCE6F1' } };
            c.border = { top: {style:'thin'}, bottom: {style:'double'} };
            if(c.address.startsWith('D')) c.numFmt = currencyFormat;
        });
        statsSheet.getCell(`C${footerRowStats}`).alignment = { horizontal: 'center' };

        // --- CENTRO: DASHBOARD DE ALTO IMPACTO (DASHBOARD) ---
        const cicloLabel = dataset[0]?.cycle ? `CICLO ${mapCycleValue(dataset[0].cycle)} DE ${mesActual}` : `CICLO DE ${mesActual}`;
        statsSheet.mergeCells('E3:G3');
        statsSheet.getCell('E3').value = "DASHBOARD OPERATIVO";
        statsSheet.getCell('E3').font = { bold: true, size: 18, color: { argb: '1F4E78' } };
        statsSheet.getCell('E3').alignment = { horizontal: 'center' };

        statsSheet.mergeCells('E4:G4');
        statsSheet.getCell('E4').value = cicloLabel;
        statsSheet.getCell('E4').font = { bold: true, size: 14 };
        statsSheet.getCell('E4').alignment = { horizontal: 'center' };

        // Card 1: RECAUDADO
        statsSheet.mergeCells('F6:G6');
        statsSheet.getCell('E6').value = "RECAUDADO:";
        statsSheet.getCell('E6').font = { bold: true };
        statsSheet.getCell('F6').value = { formula: `SUMIF(${mainSheetName}!$${estadoColLetter}$2:$${estadoColLetter}$${lastRowRef}, "Activo", ${mainSheetName}!$${costColLetter}$2:$${costColLetter}$${lastRowRef})`, result: 0 };
        statsSheet.getCell('F6').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E2EFDA' } }; // Verde muy claro
        statsSheet.getCell('F6').font = { bold: true, color: { argb: '375623' }, size: 12 };
        statsSheet.getCell('F6').numFmt = currencyFormat;
        statsSheet.getCell('F6').alignment = { horizontal: 'center', vertical: 'middle' };
        statsSheet.getCell('F6').border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };

        // Card 2: PENDIENTE
        statsSheet.mergeCells('F8:G8');
        statsSheet.getCell('E8').value = "PENDIENTE:";
        statsSheet.getCell('E8').font = { bold: true };
        statsSheet.getCell('F8').value = { formula: `SUMIF(${mainSheetName}!$${estadoColLetter}$2:$${estadoColLetter}$${lastRowRef}, "Suspendido", ${mainSheetName}!$${costColLetter}$2:$${costColLetter}$${lastRowRef})`, result: 0 };
        statsSheet.getCell('F8').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2CC' } }; // Amarillo muy claro
        statsSheet.getCell('F8').font = { bold: true, color: { argb: '7F6000' }, size: 12 };
        statsSheet.getCell('F8').numFmt = currencyFormat;
        statsSheet.getCell('F8').alignment = { horizontal: 'center', vertical: 'middle' };
        statsSheet.getCell('F8').border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };

        // Card 3: % RECUPERACIÓN
        statsSheet.mergeCells('F10:G10');
        statsSheet.getCell('E10').value = "% RECUPERADO:";
        statsSheet.getCell('E10').font = { bold: true };
        statsSheet.getCell('F10').value = { 
            formula: `IFERROR(F6 / (F6 + F8), 0)`, 
            result: 0 
        };
        statsSheet.getCell('F10').numFmt = '0.00%';
        statsSheet.getCell('F10').font = { bold: true, size: 14 };
        statsSheet.getCell('F10').alignment = { horizontal: 'center' };
        statsSheet.getCell('F10').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DDEBF7' } }; // Azul claro dashboard

        statsSheet.mergeCells('E15:G15');
        statsSheet.getCell('E15').value = "RESUMEN POR MIGRACIÓN";
        statsSheet.getCell('E15').font = { bold: true, size: 12 };
        statsSheet.getCell('E15').alignment = { horizontal: 'center' };
        
        statsSheet.getCell('E17').value = "Total Facturado:";
        statsSheet.getCell('E17').font = { bold: true };
        statsSheet.getCell('F17').value = { formula: `F6 + F8`, result: 0 };
        statsSheet.getCell('F17').numFmt = currencyFormat;
        statsSheet.getCell('F17').font = { bold: true };

        // Separador visual
        statsSheet.getCell('E18').border = { bottom: {style:'medium'} };
        statsSheet.getCell('F18').border = { bottom: {style:'medium'} };
        statsSheet.getCell('G18').border = { bottom: {style:'medium'} };

        // --- TABLA DERECHA: MIGRADO / NO MIGRADO ---
        const migradoColLetter = String.fromCharCode(64 + mainSheet.columns.findIndex(c => c.key === 'migrado') + 1);
        const cicloColLetter = String.fromCharCode(64 + mainSheet.columns.findIndex(c => c.key === 'ciclo') + 1);
        
        statsSheet.getCell('I2').value = "MIGRADO / NO MIGRADO";
        statsSheet.getCell('J2').value = "Total PENDIENTE";
        statsSheet.getCell('K2').value = "Total RECAUDADO";
        
        [statsSheet.getCell('I2'), statsSheet.getCell('J2'), statsSheet.getCell('K2')].forEach(c => {
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '000000' } };
            c.font = { color: { argb: 'FFFFFF' }, bold: true };
            c.border = { top: {style:'thin'}, bottom: {style:'thin'} };
            c.alignment = { horizontal: 'center' };
        });

        statsSheet.getColumn('K').width = 15;

        let currentRow = 3;
        const mainRowsJ = [];
        const mainRowsK = [];
        const uniqueCycles = [...new Set(dataset.map(c => mapCycleValue(c.cycle)))].filter(c => c !== "N/A");

        ["si", "No"].forEach(migradoStatus => {
            // Main row
            const mainRowIndex = currentRow;
            mainRowsJ.push(`J${mainRowIndex}`);
            mainRowsK.push(`K${mainRowIndex}`);

            statsSheet.getCell(`I${currentRow}`).value = `[-] ${migradoStatus === "si" ? "MIGRADOS (Fibra)" : "NO MIGRADOS (Antena)"}`;
            statsSheet.getCell(`I${currentRow}`).font = { bold: true };
            
            // Formula Pendiente
            statsSheet.getCell(`J${currentRow}`).value = { 
                formula: `SUMIFS(${mainSheetName}!$${costColLetter}$2:$${costColLetter}$${lastRowRef}, ${mainSheetName}!$${migradoColLetter}$2:$${migradoColLetter}$${lastRowRef}, "${migradoStatus}", ${mainSheetName}!$${estadoColLetter}$2:$${estadoColLetter}$${lastRowRef}, "<>Activo", ${mainSheetName}!$${estadoColLetter}$2:$${estadoColLetter}$${lastRowRef}, "<>Cancelado")`, 
                result: 0 
            };
            // Formula Recaudado
            statsSheet.getCell(`K${currentRow}`).value = { 
                formula: `SUMIFS(${mainSheetName}!$${costColLetter}$2:$${costColLetter}$${lastRowRef}, ${mainSheetName}!$${migradoColLetter}$2:$${migradoColLetter}$${lastRowRef}, "${migradoStatus}", ${mainSheetName}!$${estadoColLetter}$2:$${estadoColLetter}$${lastRowRef}, "Activo")`, 
                result: 0 
            };
            
            [ `I${currentRow}`, `J${currentRow}`, `K${currentRow}` ].forEach(cell => {
                const c = statsSheet.getCell(cell);
                c.font = { bold: true };
                c.border = {};
                if(cell.startsWith('J') || cell.startsWith('K')) c.numFmt = currencyFormat;
            });
            currentRow++;

            // Cycle subrows
            uniqueCycles.forEach(cycle => {
                statsSheet.getCell(`I${currentRow}`).value = `   • Ciclo ${cycle}`; 
                
                statsSheet.getCell(`J${currentRow}`).value = { 
                    formula: `SUMIFS(${mainSheetName}!$${costColLetter}$2:$${costColLetter}$${lastRowRef}, ${mainSheetName}!$${migradoColLetter}$2:$${migradoColLetter}$${lastRowRef}, "${migradoStatus}", ${mainSheetName}!$${cicloColLetter}$2:$${cicloColLetter}$${lastRowRef}, "${cycle}", ${mainSheetName}!$${estadoColLetter}$2:$${estadoColLetter}$${lastRowRef}, "<>Activo", ${mainSheetName}!$${estadoColLetter}$2:$${estadoColLetter}$${lastRowRef}, "<>Cancelado")`, 
                    result: 0 
                };
                statsSheet.getCell(`K${currentRow}`).value = { 
                    formula: `SUMIFS(${mainSheetName}!$${costColLetter}$2:$${costColLetter}$${lastRowRef}, ${mainSheetName}!$${migradoColLetter}$2:$${migradoColLetter}$${lastRowRef}, "${migradoStatus}", ${mainSheetName}!$${cicloColLetter}$2:$${cicloColLetter}$${lastRowRef}, "${cycle}", ${mainSheetName}!$${estadoColLetter}$2:$${estadoColLetter}$${lastRowRef}, "Activo")`, 
                    result: 0 
                };

                [ `I${currentRow}`, `J${currentRow}`, `K${currentRow}` ].forEach(cell => {
                    const c = statsSheet.getCell(cell);
                    c.font = { color: { argb: '666666' } }; // Gris para los detalles
                    c.border = {};
                    if(cell.startsWith('J') || cell.startsWith('K')) c.numFmt = currencyFormat;
                });
                currentRow++;
            });
        });

        // Total General (Corregido para no duplicar)
        statsSheet.getCell(`I${currentRow}`).value = "TOTAL CALCULADO";
        statsSheet.getCell(`J${currentRow}`).value = { formula: mainRowsJ.join('+'), result: 0 };
        statsSheet.getCell(`K${currentRow}`).value = { formula: mainRowsK.join('+'), result: 0 };
        
        // Notas Aclaratorias para Operaciones
        statsSheet.mergeCells('B11:D12');
        statsSheet.getCell('B11').value = "NOTA: Esta tabla refleja el ESTADO ACTUAL de los clientes en este reporte específico.";
        statsSheet.getCell('B11').font = { italic: true, size: 9, color: { argb: '444444' } };
        statsSheet.getCell('B11').alignment = { vertical: 'top', wrapText: true };

        statsSheet.mergeCells('I9:K10');
        statsSheet.getCell('I9').value = "NOTA: Este desglose muestra el RENDIMIENTO por tecnología. Pendiente (lo que falta) vs Recaudado (lo que ya pagaron).";
        statsSheet.getCell('I9').font = { italic: true, size: 9, color: { argb: '444444' } };
        statsSheet.getCell('I9').alignment = { vertical: 'top', wrapText: true };

        statsSheet.getColumn('K').width = 20; // Asegurar que RECAUDADO se vea bien

    }
    // No se pueden poner múltiples autoFilters por hoja en ExcelJS, pero cubrimos la principal

    // Ajustes finales de ancho de columna para estética
    // --- GENERAR Y DESCARGAR ---
    const buffer = await workbook.xlsx.writeBuffer();
    const nombreArchivo = customFileName || `reporte_sisprot_INTELIGENTE_${hoy.toISOString().split('T')[0]}.xlsx`;
    saveAs(new Blob([buffer]), nombreArchivo);
};
