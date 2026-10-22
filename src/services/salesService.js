/**
 * Servicio para obtener y procesar datos de ventas históricas y actuales en tiempo real.
 * 
 * Fuentes de datos:
 * 1. 2021 a Octubre 2025: Datos Históricos consolidados.
 * 2. Noviembre 2025 y 2026: API de Auditorías de Red de Sisprot (Transición 18 "Por instalar" -> 16 "Activo").
 *    Endpoint: /api/public/network/network_audit/?previous_status=18&next_status=16&view=powerbi&remove_pagination=true
 * 3. Fallback Drive: Para consultas detalladas de Julio a Octubre 2025.
 */

const SISPROT_API_URL = "https://api.sisprotgf.com/api/public/network/network_audit/";
const API_KEY = process.env.REACT_APP_SISPROT_API_KEY || "kP4vL8nB1xM7zQ0wR9tY2sJ5hG6fD3aC9uE1iO7mN4rT2bV8xS";
const DRIVE_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTqAF2PzIF-a1_Sc-_uXZ7kraAGc-GU3E9LAUQpOOOoCIljmrYKKcest5wDTqYKXyRBw5hSOWCijoV0/pub?output=csv";

// Ventas históricas fijadas (Julio a Octubre 2025 incorporados del registro histórico)
export const HISTORICAL_SALES = {
    2021: [0, 0, 148, 0, 0, 71, 57, 48, 51, 31, 53, 37],
    2022: [10, 30, 56, 52, 90, 101, 111, 87, 94, 60, 136, 161],
    2023: [27, 47, 136, 248, 189, 78, 69, 80, 112, 133, 130, 62],
    2024: [49, 18, 64, 78, 43, 154, 101, 123, 86, 190, 328, 86],
    2025: [34, 98, 180, 180, 209, 154, 74, 67, 42, 18, 0, 0], // Nov y Dic se completan en vivo desde la API
};

// Caché en memoria para evitar llamadas redundantes a la API
let auditsCache = null;
let lastAuditsFetch = 0;
const CACHE_TTL = 3 * 60 * 1000; // 3 minutos

/**
 * Filtro de validación para ventas reales:
 * Excluye planes de empleados, cuentas internas y pruebas.
 */
export const isExcludedSaleAudit = (item) => {
    if (!item) return true;
    const clientName = (item.client?.full_name || "").toUpperCase().replace(/\s+/g, ' ');
    const planName = (item.plan?.name || "").toUpperCase();
    const clientType = (item.plan?.client_type?.name || "").toUpperCase();

    // Excluir planes de empleados
    if (planName.includes("EMPLEADO") || clientType.includes("EMPLEADO")) return true;

    // Excluir cuentas internas específicas
    if (clientName.includes("FREDDY CARRILLO") || clientName.includes("BRYANT REYES")) return true;

    // Excluir pruebas a menos que estén explícitamente autorizadas
    const whitelist = ["ELISAUL REYES", "THAIS BEJAS"];
    const isWhitelisted = whitelist.some(w => clientName.includes(w));
    if (!isWhitelisted && clientName.includes("PRUEBA")) return true;

    return false;
};

/**
 * Consulta la API de auditorías de Sisprot para transiciones 18 (Por instalar) -> 16 (Activo).
 */
export const fetchSisprotSalesAudits = async (forceRefresh = false) => {
    const now = Date.now();
    if (!forceRefresh && auditsCache && now - lastAuditsFetch < CACHE_TTL) {
        return auditsCache;
    }

    try {
        const url = `${SISPROT_API_URL}?previous_status=18&next_status=16&view=powerbi&remove_pagination=true`;
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "X-API-KEY": API_KEY,
            },
        });

        if (!response.ok) {
            throw new Error(`Error en API Sisprot: HTTP ${response.status}`);
        }

        const data = await response.json();
        const rawList = Array.isArray(data) ? data : data.results || [];
        const validList = rawList.filter(item => !isExcludedSaleAudit(item));

        auditsCache = validList;
        lastAuditsFetch = now;
        return auditsCache;
    } catch (error) {
        console.error("Error al obtener auditorías de ventas de Sisprot:", error);
        return auditsCache || [];
    }
};

/**
 * Obtiene métricas consolidadas de ventas (unidades e ingresos USD).
 */
export const getFullSalesMetrics = async (forceRefresh = false) => {
    const audits = await fetchSisprotSalesAudits(forceRefresh);

    const salesData = { ...HISTORICAL_SALES };
    salesData["2025"] = [...HISTORICAL_SALES[2025]];
    salesData["2026"] = new Array(12).fill(0);

    const revenueData = {
        2021: new Array(12).fill(0),
        2022: new Array(12).fill(0),
        2023: new Array(12).fill(0),
        2024: new Array(12).fill(0),
        2025: new Array(12).fill(0),
        2026: new Array(12).fill(0)
    };

    audits.forEach(item => {
        const d = new Date(item.created_at);
        const y = String(d.getFullYear());
        const m = d.getMonth();
        const cost = parseFloat(item.plan?.cost) || 0;

        if (salesData[y] && m >= 0 && m < 12) {
            salesData[y][m]++;
        }
        if (revenueData[y] && m >= 0 && m < 12) {
            revenueData[y][m] = parseFloat((revenueData[y][m] + cost).toFixed(2));
        }
    });

    return { salesData, revenueData, rawAudits: audits };
};

/**
 * Retorna la matriz de unidades vendidas (compatible con gráficos y tablas existentes).
 */
export const getFullSalesData = async (forceRefresh = false) => {
    const metrics = await getFullSalesMetrics(forceRefresh);
    return metrics.salesData;
};

/**
 * Retorna los ingresos recaudados en $ USD por mes.
 */
export const getSalesRevenueData = async (forceRefresh = false) => {
    const metrics = await getFullSalesMetrics(forceRefresh);
    return metrics.revenueData;
};

/**
 * Parsea una línea CSV respetando comillas dobles.
 */
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

/**
 * Retorna los registros detallados de ventas para descarga en Excel.
 * A partir de Noviembre 2025 utiliza directamente la API de Sisprot con detalle exacto.
 * Para Julio a Octubre 2025 consulta el Drive como fallback.
 */
export const getDetailedSalesForMonth = async (year, monthIndex) => {
    const numericYear = parseInt(year, 10);
    const numericMonth = parseInt(monthIndex, 10);

    // Desde Noviembre 2025 en adelante: Usar API de Sisprot
    if (numericYear > 2025 || (numericYear === 2025 && numericMonth >= 10)) {
        try {
            const audits = await fetchSisprotSalesAudits();
            const filtered = audits.filter(item => {
                const d = new Date(item.created_at);
                return d.getFullYear() === numericYear && d.getMonth() === numericMonth;
            });

            return filtered.map(item => {
                const cost = parseFloat(item.plan?.cost) || 0;
                const d = new Date(item.created_at);
                const fechaStr = !isNaN(d.getTime())
                    ? d.toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' })
                    : item.created_at;

                return {
                    ordenInstalacion: item.contract_id ? `#${item.contract_id}` : "-",
                    nombre: item.client?.full_name || "",
                    apellido: "",
                    cedula: item.client?.identification || "-",
                    telefono: item.client?.mobile || "-",
                    correo: item.client?.email || "-",
                    sector: item.sector?.name || "-",
                    parroquia: item.sector?.parish?.name || "-",
                    municipio: item.sector?.parish?.municipality_name || "-",
                    tipoCliente: item.plan?.client_type?.name || "RESIDENCIAL",
                    plan: item.plan?.name || "Sin Plan",
                    costoPlan: `$${cost.toFixed(2)}`,
                    costoNum: cost,
                    tipoPago: "Sisprot Directo",
                    tipoInstalacion: "CONEXIÓN A RED",
                    fechaActivacion: fechaStr,
                    estadoAnterior: item.previous_status?.name || "Por instalar",
                    estadoNuevo: item.next_status?.name || "Activo"
                };
            });
        } catch (error) {
            console.error("Error al obtener detalle desde API Sisprot:", error);
            return [];
        }
    }

    // Para Julio a Octubre 2025: Fallback a Drive CSV
    if (numericYear === 2025 && numericMonth >= 6 && numericMonth < 10) {
        try {
            const response = await fetch(DRIVE_CSV_URL);
            if (!response.ok) throw new Error("Error al obtener datos del Drive");

            const csvText = await response.text();
            const rows = csvText.split(/\r?\n/).slice(2);
            const validInstTypes = ["CON WIFI", "SIN WIFI", "CAMBIO DE PROVEEDOR"];
            const detailedSales = [];

            rows.forEach(row => {
                const cols = parseCSVLine(row);
                if (cols.length < 14) return;

                const instType = (cols[9] || "").trim().toUpperCase();
                const ventaAsignada = (cols[13] || "").trim();
                const nombreCliente = (cols[1] || "").trim().toUpperCase();
                const apellidoCliente = (cols[2] || "").trim().toUpperCase();
                const fullName = `${nombreCliente} ${apellidoCliente}`.replace(/\s+/g, " ");

                if (fullName.includes("FREDDY CARRILLO") || fullName.includes("BRYANT REYES")) return;
                const whitelist = ["ELISAUL REYES", "THAIS BEJAS"];
                const isWhitelisted = whitelist.some(w => fullName.includes(w));
                if (!validInstTypes.includes(instType)) return;
                if (!isWhitelisted && fullName.includes("PRUEBA")) return;
                if (!ventaAsignada || ventaAsignada.toLowerCase() === "none") return;

                const dateParts = ventaAsignada.split(" ")[0].split("T")[0].split("-");
                if (dateParts.length >= 3) {
                    const yearStr = dateParts[0];
                    const month = parseInt(dateParts[1], 10) - 1;

                    if (yearStr === String(year) && month === numericMonth) {
                        const costStr = (cols[8] || "").replace(",", ".").trim();
                        const costNum = parseFloat(costStr) || 0;
                        detailedSales.push({
                            ordenInstalacion: (cols[0] || "").trim(),
                            nombre: (cols[1] || "").trim(),
                            apellido: (cols[2] || "").trim(),
                            cedula: (cols[3] || "").trim(),
                            telefono: "-",
                            correo: "-",
                            sector: (cols[4] || "").trim(),
                            parroquia: "-",
                            municipio: "-",
                            tipoCliente: (cols[6] || "").trim(),
                            plan: (cols[7] || "").trim(),
                            costoPlan: `$${costNum.toFixed(2)}`,
                            costoNum: costNum,
                            tipoPago: (cols[12] || "").trim(),
                            tipoInstalacion: (cols[9] || "").trim(),
                            fechaActivacion: ventaAsignada,
                            estadoAnterior: "Por instalar",
                            estadoNuevo: "Activo"
                        });
                    }
                }
            });

            return detailedSales;
        } catch (error) {
            console.error("Error en getDetailedSalesForMonth (Drive fallback):", error);
            return [];
        }
    }

    return [];
};


