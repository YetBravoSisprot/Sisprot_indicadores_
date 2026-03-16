import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const norm = (v) => (v == null ? "" : String(v).trim());

export const exportToExcel = async (dataset, appliedFiltersText = []) => {
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

    // --- 2. HOJA REPORTE GENERAL (Imagen 3) ---
    const mainSheet = workbook.addWorksheet("REPORTE GENERAL");
    mainSheet.columns = [
        { header: "N°", key: "num", width: 5 },
        { header: "ESTADO INICIAL", key: "estado_inicial", width: 18 },
        { header: "CONTRATO", key: "contrato", width: 12 },
        { header: "CLIENTE", key: "cliente", width: 35 },
        { header: "CI/RIF", key: "ci_rif", width: 15 },
        { header: "TELEFONO", key: "telefono", width: 15 },
        { header: "SECTOR", key: "sector", width: 20 },
        { header: "MIGRADO", key: "migrado", width: 10 },
        { header: "CICLO", key: "ciclo", width: 8 },
        { header: "PLAN", key: "plan", width: 25 },
        { header: "COSTO", key: "costo", width: 12 },
        { header: "CONTACTADO POR", key: "contactado_por", width: 22 },
        { header: "¿CONTESTO LA LLAMADA?", key: "contesto", width: 22 },
        { header: "ULTIMA FECHA DE CONTACTO", key: "ultima_fecha", width: 25 },
        { header: "ESTADO ACTUALIZADO", key: "estado_actualizado", width: 22 },
        { header: "CONVERSACION DETALLADA CON EL CLIENTE", key: "conversacion", width: 45 },
        { header: "MOTIVO (CIERRE)", key: "motivo_cierre", width: 30 },
        { header: "ADVERTENCIA", key: "advertencia", width: 30 }
    ];

    // Estilo Cabecera Reporte
    mainSheet.getRow(1).height = 35;
    mainSheet.getRow(1).eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '000000' } };
        cell.font = { color: { argb: 'FFFFFF' }, bold: true, size: 10 };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    });

    dataset.filter(c => !String(c.client_name || "").toUpperCase().includes("PRUEBA"))
        .forEach((cliente, index) => {
            const row = mainSheet.addRow({
                num: index + 1,
                estado_inicial: norm(cliente.status_name) || "N/A",
                contrato: cliente.id,
                cliente: cliente.client_name,
                ci_rif: cliente.client_identification,
                telefono: cliente.client_mobile,
                sector: norm(cliente._displaySector || cliente.sector_name),
                migrado: cliente.migrate ? "si" : "No",
                ciclo: cliente.cycle || "N/A",
                plan: cliente.plan?.name || "N/A",
                costo: parseFloat(cliente.plan?.cost || 0),
                contactado_por: "",
                contesto: "",
                ultima_fecha: "",
                estado_actualizado: "",
                conversacion: "",
                motivo_cierre: "",
                advertencia: ""
            });

            row.eachCell((cell, colIndex) => {
                cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
                cell.alignment = { vertical: 'middle' };
                if (colIndex === 11) cell.numFmt = '"$"#,##0.00';
            });

            // Validaciones
            row.getCell('contactado_por').dataValidation = { type: 'list', formulae: [`'Validaciones'!$C$2:$C$${contactados.length + 1}`] };
            row.getCell('contesto').dataValidation = { type: 'list', formulae: [`'Validaciones'!$D$2:$D$3`] };
            row.getCell('estado_actualizado').dataValidation = { type: 'list', formulae: [`'Validaciones'!$B$2:$B$${estados.length + 1}`] };
            row.getCell('motivo_cierre').dataValidation = { type: 'list', formulae: [`'Validaciones'!$A$2:$A$${motivos.length + 1}`] };
        });

    // --- 3. HOJA ESTADISTICA (Imagen 1) ---
    const statsSheet = workbook.addWorksheet("ESTADISTICA");
    
    // Cálculos para las tablas
    const countByEstado = {};
    const countByMigrado = { "si": 0, "No": 0 };
    let totalCostoStats = 0;

    dataset.forEach(c => {
        const est = norm(c.status_name) || "Sin Estado";
        countByEstado[est] = (countByEstado[est] || 0) + 1;
        const migr = c.migrate ? "si" : "No";
        countByMigrado[migr]++;
        totalCostoStats += parseFloat(c.plan?.cost || 0);
    });

    // DISEÑO: TABLA ESTADO DEL CLIENTE (Izquierda)
    statsSheet.getCell('B2').value = "ESTADO DEL CLIENTE";
    statsSheet.getCell('C2').value = "Cantidad";
    statsSheet.getRow(2).font = { bold: true, color: { argb: 'FFFFFF' } };
    statsSheet.getCell('B2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '000000' } };
    statsSheet.getCell('C2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '000000' } };

    let currentRow = 3;
    Object.entries(countByEstado).forEach(([est, count]) => {
        statsSheet.getCell(`B${currentRow}`).value = est;
        statsSheet.getCell(`C${currentRow}`).value = count;
        currentRow++;
    });
    statsSheet.getCell(`B${currentRow}`).value = "TOTAL GENERAL DE CLIENTES";
    statsSheet.getCell(`C${currentRow}`).value = dataset.length;
    statsSheet.getRow(currentRow).font = { bold: true, color: { argb: 'FFFFFF' } };
    statsSheet.getRow(currentRow).eachCell(c => c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '000000' } });

    // DISEÑO: CUADRO CENTRAL (Resumen)
    const cicloText = dataset[0]?.cycle ? `CICLO ${dataset[0].cycle} DE ${mesActual}` : `TOTAL ${mesActual}`;
    statsSheet.mergeCells('E4:I4');
    statsSheet.getCell('E4').value = cicloText.toUpperCase();
    statsSheet.getCell('E4').font = { bold: true, size: 14 };
    statsSheet.getCell('E4').alignment = { horizontal: 'center' };

    // Cuadros de Montos (Verde, Naranja, Gris imitando imagen)
    statsSheet.getCell('F6').value = totalCostoStats * 0.4; // Ejemplo de distribución
    statsSheet.getCell('F6').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '70AD47' } }; // Verde
    statsSheet.getCell('F6').numFmt = '"$ "#,##0.00';
    
    statsSheet.getCell('H10').value = totalCostoStats * 0.3;
    statsSheet.getCell('H10').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC000' } }; // Naranja
    statsSheet.getCell('H10').numFmt = '"$ "#,##0.00';

    statsSheet.getCell('J11').value = totalCostoStats * 0.1;
    statsSheet.getCell('J11').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'A5A5A5' } }; // Gris
    statsSheet.getCell('J11').numFmt = '"$ "#,##0.00';

    statsSheet.getCell('E14').value = "TOTAL GENERAL DE CLIENTES";
    statsSheet.getCell('E14').font = { bold: true };
    statsSheet.getCell('E15').value = "Total";
    statsSheet.getCell('I15').value = totalCostoStats;
    statsSheet.getCell('I15').numFmt = '"$ "#,##0.00';
    statsSheet.getCell('I15').font = { bold: true };

    // DISEÑO: TABLA MIGRADO (Derecha)
    statsSheet.getCell('L2').value = "MIGRADO / NO MIGRADO";
    statsSheet.getCell('M2').value = "Monto Total";
    statsSheet.getRow(2).eachCell((c, i) => { if(i >= 12) { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '000000' } }; c.font = { color: { argb: 'FFFFFF'}, bold: true }; } });

    statsSheet.getCell('L3').value = "si";
    statsSheet.getCell('M3').value = totalCostoStats * 0.8; 
    statsSheet.getCell('L4').value = "No";
    statsSheet.getCell('M4').value = totalCostoStats * 0.2;
    statsSheet.getCell('L5').value = "Total general";
    statsSheet.getCell('M5').value = totalCostoStats;
    statsSheet.getCell('M5').numFmt = '"$ "#,##0.00';
    statsSheet.getCell('L5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '000000' } };
    statsSheet.getCell('M5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '000000' } };
    statsSheet.getCell('L5').font = { color: { argb: 'FFFFFF'}, bold: true };
    statsSheet.getCell('M5').font = { color: { argb: 'FFFFFF'}, bold: true };

    // --- GENERAR Y DESCARGAR ---
    const buffer = await workbook.xlsx.writeBuffer();
    const nombreArchivo = `reporte_sisprot_${hoy.toISOString().split('T')[0]}.xlsx`;
    saveAs(new Blob([buffer]), nombreArchivo);
};
