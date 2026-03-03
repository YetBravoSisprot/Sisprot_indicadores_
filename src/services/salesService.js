/**
 * Servicio para obtener y procesar datos de ventas históricas y actuales (Drive).
 */

const DRIVE_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTqAF2PzIF-a1_Sc-_uXZ7kraAGc-GU3E9LAUQpOOOoCIljmrYKKcest5wDTqYKXyRBw5hSOWCijoV0/pub?output=csv";

export const HISTORICAL_SALES = {
    2021: [0, 0, 148, 0, 0, 71, 57, 48, 51, 31, 53, 37],
    2022: [10, 30, 56, 52, 90, 101, 111, 87, 94, 60, 136, 161],
    2023: [27, 47, 136, 248, 189, 78, 69, 80, 112, 133, 130, 62],
    2024: [49, 18, 64, 78, 43, 154, 101, 123, 86, 190, 328, 86],
    2025: [34, 98, 180, 180, 209, 154, 0, 0, 0, 0, 0, 0],
};

/**
 * Procesa el CSV del Drive para contar ventas reales de 2025 y 2026.
 */
export const fetchDriveSales = async () => {
    try {
        const response = await fetch(DRIVE_CSV_URL);
        if (!response.ok) throw new Error("Error al obtener datos del Drive");

        const csvText = await response.text();
        const rows = csvText.split(/\r?\n/).slice(2);

        const dataByYear = {
            "2025": new Array(12).fill(0),
            "2026": new Array(12).fill(0)
        };
        const validInstTypes = ["CON WIFI", "SIN WIFI", "CAMBIO DE PROVEEDOR"];

        const parseCSVLine = (line) => {
            const result = [];
            let cur = "";
            let inQuote = false;
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"') inQuote = !inQuote;
                else if (char === ',' && !inQuote) {
                    result.push(cur);
                    cur = "";
                } else cur += char;
            }
            result.push(cur);
            return result;
        };

        rows.forEach(row => {
            const cols = parseCSVLine(row);
            if (cols.length < 14) return;

            const instType = (cols[9] || "").trim().toUpperCase();
            const ventaAsignada = (cols[13] || "").trim();
            const nombreCliente = (cols[1] || "").trim().toUpperCase();
            const apellidoCliente = (cols[2] || "").trim().toUpperCase();
            const fullName = `${nombreCliente} ${apellidoCliente}`;

            if (!validInstTypes.includes(instType)) return;
            if (fullName.includes("PRUEBA")) return;
            if (!ventaAsignada || ventaAsignada.toLowerCase() === "none") return;

            const date = new Date(ventaAsignada);
            if (isNaN(date.getTime())) return;

            const yearStr = date.getFullYear().toString();

            if (dataByYear[yearStr]) {
                const month = date.getMonth();
                dataByYear[yearStr][month]++;
            }
        });

        return dataByYear;
    } catch (error) {
        console.error("Error en fetchDriveSales:", error);
        return { "2025": new Array(12).fill(0), "2026": new Array(12).fill(0) };
    }
};

export const getFullSalesData = async () => {
    const driveData = await fetchDriveSales();
    const fullData = { ...HISTORICAL_SALES };

    // Fusionar datos de Drive con históricos (especialmente para 2025)
    Object.keys(driveData).forEach(year => {
        if (fullData[year]) {
            // Si ya existe el año, fusionamos mes a mes
            fullData[year] = fullData[year].map((histValue, monthIndex) => {
                const driveValue = driveData[year][monthIndex];
                // Retornamos el valor de Drive si es mayor a 0, de lo contrario el histórico
                return driveValue > 0 ? driveValue : histValue;
            });
        } else {
            // Si el año no existe en históricos (ej. 2026), lo añadimos completo
            fullData[year] = driveData[year];
        }
    });

    return fullData;
};
