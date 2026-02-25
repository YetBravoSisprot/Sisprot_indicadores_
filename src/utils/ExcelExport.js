import * as XLSX from "xlsx";

/**
 * Genera y descarga un archivo Excel basado en un listado de clientes y filtros aplicados.
 * @param {Array} dataset - El conjunto de datos filtrado.
 * @param {Array} appliedFiltersText - Lista de textos de filtros aplicados para el nombre del archivo.
 */
export const exportToExcel = (dataset, appliedFiltersText = []) => {
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

    const worksheetData = dataset.map((cliente) => {
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
            Ciclo: cliente.cycle || "",
            Cedula: cliente.client_identification,
            IP: service.ip || "",
            MAC: service.mac || "",
            Fecha_Creación: created_at_raw ? created_at_raw.slice(0, 10) : "",
            "Días Hábiles": diasHabiles,
            Tipo_Cliente: cliente.client_type_name,
            Plan: `${cliente.plan?.name || "N/A"} (${cliente.plan?.cost || "0"}$)`,
        };
    });

    // Ordenar por días hábiles descendente
    worksheetData.sort((a, b) => (b["Días Hábiles"] || 0) - (a["Días Hábiles"] || 0));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);

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
