import ExcelJS from "exceljs/dist/exceljs.min.js";
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

    // --- 1. HOJA DE VALIDACIONES (OCULTA O AL FINAL) ---
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
    const condicional = ["SI", "NO"];

    validSheet.getCell('A1').value = "Motivos";
    motivos.forEach((m, i) => validSheet.getCell(`A${i + 2}`).value = m);
    validSheet.getCell('B1').value = "Estados";
    estados.forEach((e, i) => validSheet.getCell(`B${i + 2}`).value = e);
    validSheet.getCell('C1').value = "Contactados";
    contactados.forEach((c, i) => validSheet.getCell(`C${i + 2}`).value = c);
    validSheet.getCell('D1').value = "Condicional";
    condicional.forEach((co, i) => validSheet.getCell(`D${i + 2}`).value = co);

    // --- 2. HOJA REPORTE GENERAL ---
    const mainSheet = workbook.addWorksheet("REPORTE GENERAL");

    // Configurar Columnas
    mainSheet.columns = [
        { header: "N°", key: "num", width: 8 },
        { header: "ESTADO INICIAL", key: "estado_inicial", width: 18 },
        { header: "CONTRATO", key: "contrato", width: 12 },
        { header: "CLIENTE", key: "cliente", width: 40 },
        { header: "CI/RIF", key: "ci_rif", width: 15 },
        { header: "TELEFONO", key: "telefono", width: 15 },
        { header: "SECTOR", key: "sector", width: 25 },
        { header: "MIGRADO", key: "migrado", width: 12 },
        { header: "CICLO", key: "ciclo", width: 10 },
        { header: "PLAN", key: "plan", width: 30 },
        { header: "COSTO", key: "costo", width: 15 },
        { header: "CONTACTADO POR", key: "contactado_por", width: 20 },
        { header: "¿CONTESTO LA LLAMADA?", key: "contesto", width: 22 },
        { header: "ULTIMA FECHA DE CONTACTO", key: "ultima_fecha", width: 25 },
        { header: "MOTIVO", key: "motivo", width: 35 },
        { header: "ESTADO", key: "estado", width: 15 },
        { header: "CONDICIONAL", key: "condicional", width: 15 },
        { header: "OBSERVACIONES", key: "observaciones", width: 40 }
    ];

    // Estilo para la Cabecera (Negro, Blanco, Negrita)
    const headerRow = mainSheet.getRow(1);
    headerRow.eachCell((cell) => {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: '000000' }
        };
        cell.font = {
            color: { argb: 'FFFFFF' },
            bold: true,
            size: 11
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };
    });
    headerRow.height = 30;

    // Agregar Datos
    dataset.filter(c => !String(c.client_name || "").toUpperCase().includes("PRUEBA"))
        .forEach((cliente, index) => {
            const row = mainSheet.addRow({
                num: index + 1,
                estado_inicial: norm(cliente.status_name) || (norm(cliente.client_subdivision) ? norm(cliente.client_subdivision).split("_")[0] : "") || "N/A",
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
                motivo: "",
                estado: "",
                condicional: "",
                observaciones: ""
            });

            // Estilos para las celdas de datos
            row.eachCell((cell, colIndex) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
                cell.alignment = { vertical: 'middle' };

                // Formato de moneda para COSTO (Columna 11)
                if (colIndex === 11) {
                    cell.numFmt = '"$"#,##0.00';
                }
            });

            // DATA VALIDATIONS (Las listas desplegables)
            row.getCell('contactado_por').dataValidation = {
                type: 'list',
                allowBlank: true,
                formulae: [`'Validaciones'!$C$2:$C$${contactados.length + 1}`]
            };
            row.getCell('motivo').dataValidation = {
                type: 'list',
                allowBlank: true,
                formulae: [`'Validaciones'!$A$2:$A$${motivos.length + 1}`]
            };
            row.getCell('estado').dataValidation = {
                type: 'list',
                allowBlank: true,
                formulae: [`'Validaciones'!$B$2:$B$${estados.length + 1}`]
            };
            row.getCell('condicional').dataValidation = {
                type: 'list',
                allowBlank: true,
                formulae: [`'Validaciones'!$D$2:$D$${condicional.length + 1}`]
            };
        });

    // Fila de TOTAL
    const lastDataRow = mainSheet.rowCount;
    const totalRow = mainSheet.addRow([]);
    const totalCosto = dataset.reduce((sum, c) => sum + parseFloat(c.plan?.cost || 0), 0);

    totalRow.getCell(10).value = "TOTAL";
    totalRow.getCell(10).font = { bold: true };
    totalRow.getCell(10).alignment = { horizontal: 'right' };

    totalRow.getCell(11).value = totalCosto;
    totalRow.getCell(11).numFmt = '"$"#,##0.00';
    totalRow.getCell(11).font = { bold: true };
    totalRow.getCell(11).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'E0E0E0' }
    };
    totalRow.getCell(11).border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
    };

    // Congelar cabecera y habilitar filtros
    mainSheet.views = [{ state: 'frozen', ySplit: 1 }];
    mainSheet.autoFilter = `A1:R1`;

    // --- 3. HOJA ESTADISTICA ---
    const statsSheet = workbook.addWorksheet("ESTADISTICA");
    // (Puedes mantener la lógica anterior o simplificarla con ExcelJS)
    // Por simplicidad, agregamos un resumen básico
    statsSheet.addRow(["RESUMEN DE REPORTE"]);
    statsSheet.addRow(["Mes", mesActual]);
    statsSheet.addRow(["Año", anioActual]);
    statsSheet.addRow(["Total Clientes", dataset.length]);
    statsSheet.addRow(["Ingreso Estimado", totalCosto]);
    statsSheet.getRow(1).font = { bold: true, size: 14 };

    // --- GENERAR Y DESCARGAR ---
    const buffer = await workbook.xlsx.writeBuffer();

    let nameParts = [];
    appliedFiltersText.forEach(f => {
        const text = f.toLowerCase();
        if (text.includes("agencia:")) nameParts.push(text.replace("agencia:", "").replace("nodo", "").trim());
    });
    const baseName = nameParts.length > 0 ? nameParts.join("_").replace(/\s+/g, "_") : "general";
    const nombreArchivo = `reporte_sisprot_${baseName}_${hoy.toISOString().split('T')[0]}.xlsx`;

    saveAs(new Blob([buffer]), nombreArchivo);
};
