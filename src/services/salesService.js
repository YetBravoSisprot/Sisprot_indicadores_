/**
 * Servicio para obtener y procesar datos de ventas históricas y actuales (Drive).
 */

const DRIVE_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTqAF2PzIF-a1_Sc-_uXZ7kraAGc-GU3E9LAUQpOOOoCIljmrYKKcest5wDTqYKXyRBw5hSOWCijoV0/pub?output=csv";

export const HISTORICAL_SALES = {
    2021: [0, 0, 148, 0, 0, 71, 57, 48, 51, 31, 53, 37],
    2022: [10, 30, 56, 52, 90, 101, 111, 87, 94, 60, 136, 161],
    2023: [29, 53, 138, 252, 195, 81, 72, 102, 112, 133, 130, 62],
    2024: [49, 18, 64, 78, 43, 0, 0, 0, 0, 0, 0, 0],
    2025: [34, 98, 180, 180, 209, 154, 73, 64, 42, 18, 27, 0],
};

/**
 * Procesa el CSV del Drive para contar ventas reales de 2026 por mes.
 * Sigue la lógica del Power BI proporcionado.
 */
export const fetch2026Sales = async () => {
    try {
        const response = await fetch(DRIVE_CSV_URL);
        if (!response.ok) throw new Error("Error al obtener datos del Drive");

        const csvText = await response.text();
        const rows = csvText.split(/\r?\n/).slice(2); // Omitir encabezado basura y cabecera real

        const salesByMonth = new Array(12).fill(0);
        const validInstTypes = ["CAMBIO DE PROVEEDOR", "RECUPERACION CLIENTES", "CON WIFI", "SIN WIFI"];

        rows.forEach(row => {
            // Dividir respetando comas dentro de comillas si fuera necesario, 
            // pero el CSV parece simple por las columnas 18.
            const cols = row.split(",");
            if (cols.length < 18) return;

            const instType = (cols[9] || "").trim().toUpperCase();
            const ventaAsignada = (cols[13] || "").trim();
            const nombreCliente = (cols[1] || "").trim().toUpperCase();
            const apellidoCliente = (cols[2] || "").trim().toUpperCase();
            const fullName = `${nombreCliente} ${apellidoCliente}`;

            // Filtros de Power BI
            if (!validInstTypes.includes(instType)) return;
            if (fullName.includes("PRUEBA")) return;
            if (!ventaAsignada) return;

            const date = new Date(ventaAsignada);
            if (date.getFullYear() === 2026) {
                const month = date.getMonth(); // 0-11
                salesByMonth[month]++;
            }
        });

        return salesByMonth;
    } catch (error) {
        console.error("Error en fetch2026Sales:", error);
        return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    }
};

export const getFullSalesData = async () => {
    const data2026 = await fetch2026Sales();
    return {
        ...HISTORICAL_SALES,
        2026: data2026
    };
};
