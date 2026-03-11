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

    // Función interna para calcular días hábiles (reutilizada de TopUrbanismo)
    const calcularDiasHabiles = (fechaInicio, fechaFin) => {
        let count = 0;
        let current = new Date(fechaInicio);

        while (current <= fechaFin) {
            const day = current.getDay();
            if (day !== 0 && day !== 6) count++;
            current.setDate(current.getDate() + 1);
        }
        return count;
    };

    const norm = (v) => (v == null ? "" : String(v).trim());

    const baseData = dataset.map((cliente) => {
        const service = cliente.service_detail || {};
        const created_at_raw = cliente.created_at || "";
        const created_at = created_at_raw ? new Date(created_at_raw) : null;
        const diasHabiles = created_at ? calcularDiasHabiles(created_at, hoy) : "";

        const estatus =
            norm(cliente.status_name) ||
            (norm(cliente.client_subdivision) ? norm(cliente.client_subdivision).split("_")[0] : "") ||
            "N/A";

        return {
            Contrato: cliente.id,
            Cliente: cliente.client_name,
            Teléfono: cliente.client_mobile,
            Dirección: cliente.address,
            Urbanismo: norm(cliente._displaySector || cliente.sector_name),
            Estatus: estatus,
            Migrado: cliente.migrate ? "Migrado" : "No migrado",
            Ciclo: getCycleLabel(cliente.cycle),
            Cedula: cliente.client_identification,
            IP: service.ip || "",
            MAC: service.mac || "",
            "Caja NAP": cliente.nap_box_name || "N/A",
            Fecha_Creación: created_at_raw ? created_at_raw.slice(0, 10) : "N/A",
            "Días Hábiles": diasHabiles,
            Tipo_Cliente: cliente.client_type_name,
            Plan: `${cliente.plan?.name || "N/A"} (${cliente.plan?.cost || "0"}$)`,
            _costRaw: parseFloat(cliente.plan?.cost || 0),  // Campo interno para cálculos
        };
    }).filter(row => {
        // Solo excluir si el nombre del cliente explícitamente dice "PRUEBA"
        const name = String(row.Cliente || "").toUpperCase();
        return !name.includes("PRUEBA");
    });

    // Ordenar por días hábiles descendente
    baseData.sort((a, b) => (b["Días Hábiles"] || 0) - (a["Días Hábiles"] || 0));

    const worksheetData = baseData.map((row) => {
        // Excluir campo interno _costRaw de las columnas exportadas
        const { _costRaw, ...exportRow } = row;

        if (!selectedColumns || selectedColumns.length === 0 || selectedColumns.includes("Todas")) {
            return exportRow;
        }

        const filteredColumns = {};
        selectedColumns.forEach((col) => {
            if (exportRow[col] !== undefined) {
                filteredColumns[col] = exportRow[col];
            }
        });
        return filteredColumns;
    });

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);

    // --- HOJA DE RESUMEN (solo cuando hay filtros de Agencia o Urbanismos específicos) ---
    const filtroUrbanismoTexto = appliedFiltersText.find(f => f.startsWith("Urbanismos:"));
    const filtroAgenciaTexto = appliedFiltersText.find(f => f.startsWith("Agencia:"));
    
    const tieneUrbanismosEspecificos = (!!filtroUrbanismoTexto && 
        !filtroUrbanismoTexto.includes("Urbanismos: Todos") && 
        filtroUrbanismoTexto.replace("Urbanismos:", "").trim().length > 0) || (!!filtroAgenciaTexto);

    if (tieneUrbanismosEspecificos) {
        const analizados = filtroUrbanismoTexto 
            ? filtroUrbanismoTexto.replace("Urbanismos:", "").trim() 
            : (filtroAgenciaTexto ? filtroAgenciaTexto.trim() : "Varios");
        // Cálculo Desglosado Unificado (Igual que en el Chatbot)
        const desglose = baseData.reduce((acc, row) => {
            const urb = row.Urbanismo || "Otros";
            if (!acc[urb]) acc[urb] = { activos: 0, suspendidos: 0, cancelados: 0, ingresos: 0 };

            const est = (row.Estatus || "").toLowerCase();
            if (est.includes("activo")) {
                acc[urb].activos++;
                acc[urb].ingresos += row._costRaw || 0;
            } else if (est.includes("suspendido")) {
                acc[urb].suspendidos++;
            } else if (est.includes("cancelado")) {
                acc[urb].cancelados++;
            }
            return acc;
        }, {});

        const totalIngresosGral = Object.values(desglose).reduce((sum, d) => sum + d.ingresos, 0);

        const summaryRows = [
            ["RESUMEN EJECUTIVO DE CARTERA"],
            ["Fecha de Reporte", hoy.toLocaleDateString()],
            ["Grupo Analizado", analizados],
            [""],
            ["CUADRO ESTRATÉGICO POR SECTOR"],
            ["Urbanismo", "Activos", "Susp.", "Canc.", "Ingresos Proyectados ($)"],
            ...Object.entries(desglose)
                .sort((a, b) => b[1].ingresos - a[1].ingresos)
                .map(([name, d]) => [name, d.activos, d.suspendidos, d.cancelados, `${d.ingresos.toFixed(2)}$`]),
            [""],
            ["TOTAL INGRESOS (SOLO ACTIVOS)", `${totalIngresosGral.toFixed(2)}$`]
        ];

        const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
        XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumen");
    }
    // --- FIN HOJA DE RESUMEN ---

    // Auto-ajuste de columnas
    const columnWidths = worksheetData.reduce((acc, row) => {
        Object.keys(row).forEach((key, idx) => {
            const cellValue = String(row[key] ?? "");
            const currentWidth = acc[idx] || 0;
            acc[idx] = Math.max(currentWidth, cellValue.length);
        });
        return acc;
    }, []);

    worksheet["!cols"] = columnWidths.map((width) => ({ wpx: Math.max(80, width * 6) }));
    XLSX.utils.book_append_sheet(workbook, worksheet, "Clientes");

    // --- LÓGICA DE NOMBRE DE ARCHIVO INTELIGENTE ---
    let nameParts = [];
    
    appliedFiltersText.forEach(f => {
        const text = f.toLowerCase();
        if (text.includes("agencia:")) {
            nameParts.push(text.replace("agencia:", "").replace("nodo", "").trim());
        } else if (text.includes("urbanismos:")) {
            const urb = text.replace("urbanismos:", "").trim();
            if (!urb.includes("todos")) nameParts.push(urb.split(",")[0].trim()); // Solo el primer urbanismo si hay muchos
        } else if (text.includes("estado:")) {
            const est = text.replace("estado:", "").trim();
            if (est !== "todos") nameParts.push(est);
        } else if (text.includes("ciclo:")) {
            nameParts.push("c" + text.replace("ciclo:", "").trim());
        } else if (text.includes("tipo:")) {
            nameParts.push(text.replace("tipo:", "").trim());
        }
    });

    const baseName = nameParts.length > 0 
        ? nameParts.join("_").replace(/\s+/g, "_") 
        : "general";

    const nombreArchivo = `reporte_${baseName}_${hoy.toISOString().split('T')[0]}.xlsx`;
    // --- FIN LÓGICA NOMBRE ---

    XLSX.writeFile(workbook, nombreArchivo);
};
