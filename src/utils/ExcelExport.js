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
            Urbanismo: norm(cliente.sector_name),
            Estatus: estatus,
            Migrado: cliente.migrate ? "Migrado" : "No migrado",
            Ciclo: getCycleLabel(cliente.cycle),
            Cedula: cliente.client_identification,
            IP: service.ip || "",
            MAC: service.mac || "",
            Fecha_Creación: created_at_raw ? created_at_raw.slice(0, 10) : "",
            "Días Hábiles": diasHabiles,
            Tipo_Cliente: cliente.client_type_name,
            Plan: `${cliente.plan?.name || "N/A"} (${cliente.plan?.cost || "0"}$)`,
            _costRaw: parseFloat(cliente.plan?.cost || 0),  // Campo interno para cálculos
        };
    }).filter(row => {
        return !Object.values(row).some(val =>
            val !== null && val !== undefined && String(val).toUpperCase().includes("PRUEBA")
        );
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

    // --- HOJA DE RESUMEN (NUEVO) ---
    // Calculamos los datos de resumen para la reunión
    const resumenEstatus = baseData.reduce((acc, row) => {
        const est = row.Estatus || "N/A";
        acc[est] = (acc[est] || 0) + 1;
        return acc;
    }, {});

    const resumenIngresosUrb = baseData.reduce((acc, row) => {
        if (row.Estatus === "Activo") {
            const urb = row.Urbanismo || "Otros";
            // Usamos el costo real directamente (evita el bug con el regex y decimales)
            const cost = row._costRaw || 0;
            acc[urb] = (acc[urb] || 0) + cost;
        }
        return acc;
    }, {});

    const totalIngresosActivos = Object.values(resumenIngresosUrb).reduce((sum, val) => sum + val, 0);

    const summaryRows = [
        ["RESUMEN EJECUTIVO"],
        ["Fecha de Reporte", hoy.toLocaleDateString()],
        [""],
        ["CONTEO POR ESTATUS"],
        ["Estatus", "Cantidad"],
        ...Object.entries(resumenEstatus).map(([k, v]) => [k, v]),
        [""],
        ["INGRESOS POR URBANISMO (SOLO ACTIVOS)"],
        ["Urbanismo", "Ingreso Proyectado ($)"],
        ...Object.entries(resumenIngresosUrb).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, `${v.toFixed(2)}$`]),
        [""],
        ["TOTAL INGRESOS ACTIVOS", `${totalIngresosActivos.toFixed(2)}$`]
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumen");
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

    // Nombre de archivo basado en filtros o genérico
    const filterStamp = appliedFiltersText.length > 0
        ? appliedFiltersText.join("_").replace(/\s+/g, "_").toLowerCase()
        : "reporte_general";
    const nombreArchivo = `reporte_${filterStamp}_${hoy.toISOString().split('T')[0]}.xlsx`;

    XLSX.writeFile(workbook, nombreArchivo);
};
