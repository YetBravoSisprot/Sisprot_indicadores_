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
            const fullNameNorm = fullName.replace(/\s+/g, " ");
            const whitelist = ["ELISAUL REYES", "BRYANT REYES", "THAIS BEJAS"];
            const isWhitelisted = whitelist.some(w => fullNameNorm.includes(w.toUpperCase().replace(/\s+/g, " ")));
            if (!validInstTypes.includes(instType)) return;
            if (!isWhitelisted && fullName.includes("PRUEBA")) return;
            if (!ventaAsignada || ventaAsignada.toLowerCase() === "none") return;

            const dateParts = ventaAsignada.split(" ")[0].split("T")[0].split("-");
            if (dateParts.length >= 3) {
                const yearStr = dateParts[0];
                const month = parseInt(dateParts[1], 10) - 1;
                if (dataByYear[yearStr] && month >= 0 && month < 12) {
                    dataByYear[yearStr][month]++;
                }
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

/**
 * Retorna los registros detallados de ventas filtrados por año y mes.
 */
export const getDetailedSalesForMonth = async (year, monthIndex) => {
    try {
        const response = await fetch(DRIVE_CSV_URL);
        if (!response.ok) throw new Error("Error al obtener datos del Drive");

        const csvText = await response.text();
        const rows = csvText.split(/\r?\n/).slice(2);
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

        const detailedSales = [];

        rows.forEach(row => {
            const cols = parseCSVLine(row);
            if (cols.length < 14) return;

            const instType = (cols[9] || "").trim().toUpperCase();
            const ventaAsignada = (cols[13] || "").trim();
            const nombreCliente = (cols[1] || "").trim().toUpperCase();
            const apellidoCliente = (cols[2] || "").trim().toUpperCase();
            const fullName = `${nombreCliente} ${apellidoCliente}`;
            const fullNameNorm = fullName.replace(/\s+/g, " ");
            const whitelist = ["ELISAUL REYES", "BRYANT REYES", "THAIS BEJAS"];
            const isWhitelisted = whitelist.some(w => fullNameNorm.includes(w.toUpperCase().replace(/\s+/g, " ")));
            if (!validInstTypes.includes(instType)) return;
            if (!isWhitelisted && fullName.includes("PRUEBA")) return;
            if (!ventaAsignada || ventaAsignada.toLowerCase() === "none") return;

            const dateParts = ventaAsignada.split(" ")[0].split("T")[0].split("-");
            if (dateParts.length >= 3) {
                const yearStr = dateParts[0];
                const month = parseInt(dateParts[1], 10) - 1;
                
                if (yearStr === String(year) && month === monthIndex) {
                    detailedSales.push({
                        ordenInstalacion: (cols[0] || "").trim(),
                        nombre: (cols[1] || "").trim(),
                        apellido: (cols[2] || "").trim(),
                        cedula: (cols[3] || "").trim(),
                        sector: (cols[4] || "").trim(),
                        tipoCliente: (cols[6] || "").trim(),
                        plan: (cols[7] || "").trim(),
                        costoPlan: (cols[8] || "").trim(),
                        tipoPago: (cols[12] || "").trim(),
                        tipoInstalacion: (cols[9] || "").trim()
                    });
                }
            }
        });

        return detailedSales;
    } catch (error) {
        console.error("Error en getDetailedSalesForMonth:", error);
        return [];
    }
};

