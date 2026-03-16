import * as XLSX from "xlsx";

import { getCycleLabel } from "./cycleHelper";

/**
 * Genera y descarga un archivo Excel basado en un listado de clientes y filtros aplicados.
 * @param {Array} dataset - El conjunto de datos filtrado.
 * @param {Array} appliedFiltersText - Lista de textos de filtros aplicados para el nombre del archivo.
 */
export const exportToExcel = (dataset, appliedFiltersText = [], selectedColumns = []) => {
    if (!dataset || dataset.length === 0) {
        console.warn("Dataset vacío, no se puede generar Excel.");
        return;
    }

    const hoy = new Date();
    const mesActual = hoy.toLocaleString('es-ES', { month: 'long' }).toUpperCase();
    const anioActual = hoy.getFullYear();

    const norm = (v) => (v == null ? "" : String(v).trim());

    // 1. --- DATOS PARA HOJA "REPORTE GENERAL" ---
    const worksheetData = dataset.map((cliente, index) => {
        const estatus =
            norm(cliente.status_name) ||
            (norm(cliente.client_subdivision) ? norm(cliente.client_subdivision).split("_")[0] : "") ||
            "N/A";

        return {
            "N°": index + 1,
            "ESTADO INICIAL": estatus,
            "CONTRATO": cliente.id,
            "CLIENTE": cliente.client_name,
            "CI/RIF": cliente.client_identification,
            "TELEFONO": cliente.client_mobile,
            "SECTOR": norm(cliente._displaySector || cliente.sector_name),
            "MIGRADO": cliente.migrate ? "si" : "No",
            "CICLO": cliente.cycle || "N/A",
            "PLAN": cliente.plan?.name || "N/A",
            "COSTO": parseFloat(cliente.plan?.cost || 0),
            "CONTACTADO POR": "",
            "¿CONTESTO LA LLAMADA?": "",
            "MOTIVO": "",
            "ESTADO": "",
            "CONDICIONAL": "",
            "OBSERVACIONES": ""
        };
    }).filter(row => {
        const name = String(row.CLIENTE || "").toUpperCase();
        return !name.includes("PRUEBA");
    });

    // Calular total de costo para la fila final
    const totalCostoGeneral = worksheetData.reduce((sum, row) => sum + (row["COSTO"] || 0), 0);
    worksheetData.push({
        "N°": "", "ESTADO INICIAL": "", "CONTRATO": "", "CLIENTE": "", "CI/RIF": "",
        "TELEFONO": "", "SECTOR": "", "MIGRADO": "", "CICLO": "", "PLAN": "TOTAL",
        "COSTO": totalCostoGeneral, "CONTACTADO POR": "", "¿CONTESTO LA LLAMADA?": "",
        "MOTIVO": "", "ESTADO": "", "CONDICIONAL": "", "OBSERVACIONES": ""
    });

    // 2. --- DATOS PARA HOJA "ESTADISTICA" ---
    // Distribución por Estado
    const statsByStatus = worksheetData.reduce((acc, row) => {
        if (row["PLAN"] === "TOTAL") return acc; // Saltar la fila de total
        const status = row["ESTADO INICIAL"] || "(en blanco)";
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {});

    const totalClientes = worksheetData.length - 1; // Menos la fila de total

    // Distribución por Migración y Monto
    const statsByMigrated = worksheetData.reduce((acc, row) => {
        if (row["PLAN"] === "TOTAL") return acc;
        const mig = row["MIGRADO"] === "si" ? "si" : "No";
        if (!acc[mig]) acc[mig] = { cantidad: 0, monto: 0 };
        acc[mig].cantidad++;
        acc[mig].monto += row["COSTO"] || 0;
        return acc;
    }, {});

    const totalMonto = Object.values(statsByMigrated).reduce((sum, item) => sum + item.monto, 0);

    // Intentar replicar la disposición de la imagen 4 (Tablas lado a lado)
    const statusEntries = Object.entries(statsByStatus);
    const maxStatRows = Math.max(statusEntries.length, 2);
    
    const estadisticaRows = [
        ["ESTADO DEL CLIENTE", "Cantidad", "", "MIGRADO / NO MIGRADO", "Monto Total"],
    ];

    for (let i = 0; i < maxStatRows; i++) {
        const sEntry = statusEntries[i] || ["", ""];
        const mEntry = i === 0 ? ["si", statsByMigrated["si"]?.monto || 0] : (i === 1 ? ["No", statsByMigrated["No"]?.monto || 0] : ["", ""]);
        estadisticaRows.push([sEntry[0], sEntry[1], "", mEntry[0], mEntry[1]]);
    }
    estadisticaRows.push(["TOTAL GENERAL DE CLIENTES", totalClientes, "", "Total general", totalMonto]);
    estadisticaRows.push([""]);
    estadisticaRows.push(["", "", "RESUMEN CICLO"]);
    estadisticaRows.push(["", "", `CICLO DE ${mesActual} ${anioActual}`]);
    estadisticaRows.push(["", "", "TOTAL INGRESOS", `${totalMonto.toFixed(2)}$`]);

    // 3. --- DATOS PARA HOJA "Validaciones" ---
    const validacionesHeaders = ["Motivo", "Estado", "Contactado Por", "Condicional"];
    
    // Lista de motivos basada en la imagen 3
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

    const maxRows = Math.max(motivos.length, estados.length, contactados.length, condicional.length);
    const validacionesRows = [validacionesHeaders];

    for (let i = 0; i < maxRows; i++) {
        validacionesRows.push([
            motivos[i] || "",
            estados[i] || "",
            contactados[i] || "",
            condicional[i] || ""
        ]);
    }

    // --- CREACIÓN DEL LIBRO ---
    const workbook = XLSX.utils.book_new();

    // Hoja 1: Validaciones
    const validSheet = XLSX.utils.aoa_to_sheet(validacionesRows);
    XLSX.utils.book_append_sheet(workbook, validSheet, "Validaciones");

    // Hoja 2: REPORTE GENERAL
    const mainSheet = XLSX.utils.json_to_sheet(worksheetData);
    // Auto-ajuste de columnas para Reporte General
    const columnWidths = Object.keys(worksheetData[0] || {}).map(key => {
        let maxLen = key.length;
        worksheetData.forEach(row => {
            const val = String(row[key] || "");
            if (val.length > maxLen) maxLen = val.length;
        });
        return { wpx: Math.max(80, maxLen * 7) };
    });
    mainSheet["!cols"] = columnWidths;
    XLSX.utils.book_append_sheet(workbook, mainSheet, "REPORTE GENERAL");

    // Hoja 3: ESTADISTICA
    const statsSheet = XLSX.utils.aoa_to_sheet(estadisticaRows);
     // Ajuste básico para estadística
    statsSheet["!cols"] = [{ wpx: 200 }, { wpx: 100 }];
    XLSX.utils.book_append_sheet(workbook, statsSheet, "ESTADISTICA");

    // --- NOMBRE DEL ARCHIVO ---
    let nameParts = [];
    appliedFiltersText.forEach(f => {
        const text = f.toLowerCase();
        if (text.includes("agencia:")) nameParts.push(text.replace("agencia:", "").replace("nodo", "").trim());
        else if (text.includes("urbanismos:")) nameParts.push(text.replace("urbanismos:", "").trim().split(",")[0].trim());
        else if (text.includes("estado:")) nameParts.push(text.replace("estado:", "").trim());
    });

    const baseName = nameParts.length > 0 ? nameParts.join("_").replace(/\s+/g, "_") : "general";
    const nombreArchivo = `reporte_sisprot_${baseName}_${hoy.toISOString().split('T')[0]}.xlsx`;

    XLSX.writeFile(workbook, nombreArchivo);
};

