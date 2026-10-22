/**
 * biQueryService.js
 * Capa Centralizada de Herramientas de Consulta de Business Intelligence para Sisprot BI.
 * 
 * Reutiliza y unifica:
 * - salesService.js (Ventas reales 18->16 e histórico 2021-2026)
 * - reactivadosService.js (Reactivaciones 34->16 desde 2026)
 * - revenueService.js (Recaudación histórica de ingresos)
 * - contractService.js (Contratos en tiempo real)
 * - Indicadores.jsx (Salud de cartera, Fuga y Oportunidad / Ingresos Recuperables)
 * - Cobros bancarios en tiempo real
 */

import { getFullSalesMetrics } from './salesService.js';
import { fetchReactivados } from './reactivadosService.js';
import { getHistoricalRevenueData } from './revenueService.js';
import { fetchContractsByStatus } from './contractService.js';

let liveContractsMemoryCache = null;

/**
 * Obtiene contratos en tiempo real desde la API oficial de Sisprot (misma fuente que Top Urbanismo y Resumen BI).
 */
export const getLiveContracts = async (forceRefresh = false) => {
    if (!forceRefresh && liveContractsMemoryCache && liveContractsMemoryCache.length > 0) {
        return liveContractsMemoryCache;
    }
    try {
        const res = await fetchContractsByStatus(["Todos"], forceRefresh);
        if (res && res.results && res.results.length > 0) {
            liveContractsMemoryCache = res.results;
            return liveContractsMemoryCache;
        }
    } catch (e) {
        console.warn("biQueryService: Error obteniendo contratos en tiempo real:", e);
    }
    return liveContractsMemoryCache || [];
};

// ==========================================
// FORMATEADORES Y HELPERS OFICIALES
// ==========================================

export const formatUSD = (val) => {
    return new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val || 0);
};

export const formatCurrency = (val) => {
    const formatted = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val || 0);
    return `$ ${formatted}`;
};

export const formatPercent = (val) => {
    return `${(val || 0).toFixed(1)}%`;
};

const normalizeText = (text) => {
    if (!text) return "";
    return String(text).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
};

const extractClientType = (client) => {
    if (!client) return "RESIDENCIAL";
    let tipo = "";
    if (client.client_subdivision && client.client_subdivision !== "") {
        const partes = String(client.client_subdivision).split("_");
        if (partes.length >= 2 && partes[1]) {
            tipo = partes[1].toUpperCase();
        }
    }
    if (!tipo && client.client_type_name) {
        tipo = String(client.client_type_name).trim().toUpperCase();
    }
    if (tipo.includes("PYME")) return "PYME";
    if (tipo.includes("EMPLEADO")) return "EMPLEADO";
    if (tipo.includes("INTERCAMBIO")) return "INTERCAMBIO";
    if (tipo.includes("GRATIS")) return "GRATIS";
    return "RESIDENCIAL";
};

// ==========================================
// 1. KPIS EJECUTIVOS (PANEL ADMINISTRATIVO)
// ==========================================
export const getExecutiveKpis = (clientList = [], userRole = "admin") => {
    if (!Array.isArray(clientList) || clientList.length === 0) {
        return {
            totalClientes: 0,
            activos: 0,
            percentActivos: "0",
            suspendidos: 0,
            percentSuspendidos: "0",
            pausados: 0,
            cancelados: 0,
            percentCancelados: "0",
            ingresosTotales: 0,
            ticketPromedio: 0,
            churnRate: 0,
            saludCartera: 0,
            topSectores: [],
            typeTotals: { PYME: 0, RESIDENCIAL: 0 }
        };
    }

    const totalClientes = clientList.length;
    const activos = clientList.filter(c => c.status_name === "Activo" || c.status_name === "Activos" || c.status === 16).length;
    const suspendidos = clientList.filter(c => c.status_name === "Suspendido" || c.status_name === "Suspendidos" || c.status === 19).length;
    const pausados = clientList.filter(c => c.status_name === "Pausado" || c.status_name === "Pausados" || c.status === 20).length;
    const cancelados = clientList.filter(c => c.status_name === "Cancelado" || c.status_name === "Cancelados" || c.status === 34).length;

    // Facturación mensual estimada: suma de planes de clientes activos
    let ingresosTotales = 0;
    const typeTotals = { PYME: 0, RESIDENCIAL: 0, EMPLEADO: 0, INTERCAMBIO: 0, GRATIS: 0 };
    const sectorStats = {};

    clientList.forEach(c => {
        const isActive = c.status_name === "Activo" || c.status_name === "Activos" || c.status === 16;
        if (isActive) {
            const cost = parseFloat(c.plan?.cost || 0);
            ingresosTotales += cost;

            const tType = extractClientType(c);
            if (typeTotals[tType] !== undefined) {
                typeTotals[tType] += cost;
            }

            const sector = c.sector_name || "Sin Sector";
            if (!sectorStats[sector]) sectorStats[sector] = { count: 0, revenue: 0 };
            sectorStats[sector].count += 1;
            sectorStats[sector].revenue += cost;
        }
    });

    const ticketPromedio = activos > 0 ? ingresosTotales / activos : 0;
    const churnRate = totalClientes > 0 ? ((suspendidos + cancelados) / totalClientes) * 100 : 0;
    const saludCartera = totalClientes > 0 ? (activos / totalClientes) * 100 : 0;

    const allSectores = Object.entries(sectorStats)
        .map(([name, val]) => ({ name, revenue: val.revenue, count: val.count }))
        .sort((a, b) => b.revenue - a.revenue);

    return {
        totalClientes,
        activos,
        percentActivos: totalClientes > 0 ? ((activos / totalClientes) * 100).toFixed(1) : "0",
        suspendidos,
        percentSuspendidos: totalClientes > 0 ? ((suspendidos / totalClientes) * 100).toFixed(1) : "0",
        pausados,
        cancelados,
        percentCancelados: totalClientes > 0 ? ((cancelados / totalClientes) * 100).toFixed(1) : "0",
        ingresosTotales: userRole === "admin" ? ingresosTotales : null,
        ticketPromedio: userRole === "admin" ? ticketPromedio : null,
        churnRate,
        saludCartera,
        topSectores: allSectores.slice(0, 5),
        allSectores,
        typeTotals
    };
};

// ==========================================
// 2. INDICADORES ESTRATÉGICOS (SALUD, FUGA Y OPORTUNIDAD)
// ==========================================
export const getHealthAndOpportunityMetrics = (clientList = []) => {
    if (!Array.isArray(clientList) || clientList.length === 0) {
        return { salud: 0, fuga: 0, recuperable: 0, totalActivos: 0, totalSuspendidos: 0, totalCancelados: 0, totalCartera: 0 };
    }

    const total = clientList.length;
    const activosList = clientList.filter(c => c.status_name === "Activo" || c.status_name === "Activos" || c.status === 16);
    const suspendidosList = clientList.filter(c => c.status_name === "Suspendido" || c.status_name === "Suspendidos" || c.status === 19);
    const canceladosList = clientList.filter(c => c.status_name === "Cancelado" || c.status_name === "Cancelados" || c.status === 34);

    const salud = total > 0 ? (activosList.length / total) * 100 : 0;

    // Oportunidad / Ingresos Recuperables: Monto mensual de clientes suspendidos
    const recuperable = suspendidosList.reduce((acc, c) => acc + (parseFloat(c.plan?.cost) || 0), 0);

    // Fuga de Capital: Monto mensual de clientes cancelados
    const fuga = canceladosList.reduce((acc, c) => acc + (parseFloat(c.plan?.cost) || 0), 0);

    return {
        salud,
        fuga,
        recuperable,
        totalActivos: activosList.length,
        totalSuspendidos: suspendidosList.length,
        totalCancelados: canceladosList.length,
        totalCartera: total
    };
};

// ==========================================
// 3. VENTAS GLOBALES (UNIDADES E INGRESOS USD)
// ==========================================
export const getSalesMetrics = async ({ year = "2026", month = null, compareYear = null } = {}) => {
    const { salesData, revenueData } = await getFullSalesMetrics();
    const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    const targetYear = String(year);
    const unitsArray = salesData[targetYear] || new Array(12).fill(0);
    const revArray = revenueData[targetYear] || new Array(12).fill(0);

    const totalUnitsYear = unitsArray.reduce((a, b) => a + b, 0);
    const totalRevYear = revArray.reduce((a, b) => a + b, 0);

    // Si se consulta un mes específico (0-11)
    let monthDetail = null;
    if (month !== null && month >= 0 && month < 12) {
        const mIdx = Number(month);
        monthDetail = {
            monthIndex: mIdx,
            monthName: meses[mIdx],
            units: unitsArray[mIdx],
            revenueUSD: revArray[mIdx]
        };
    }

    // Si se pide comparativa con otro año (ej: 2025 vs 2026)
    let comparison = null;
    if (compareYear && salesData[String(compareYear)]) {
        const cYear = String(compareYear);
        const compUnitsArray = salesData[cYear] || new Array(12).fill(0);
        const compRevArray = revenueData[cYear] || new Array(12).fill(0);

        const compTotalUnits = compUnitsArray.reduce((a, b) => a + b, 0);
        const compTotalRev = compRevArray.reduce((a, b) => a + b, 0);

        const diffUnits = totalUnitsYear - compTotalUnits;
        const percentUnits = compTotalUnits > 0 ? ((diffUnits / compTotalUnits) * 100).toFixed(1) : "N/A";

        const diffRev = totalRevYear - compTotalRev;
        const percentRev = compTotalRev > 0 ? ((diffRev / compTotalRev) * 100).toFixed(1) : "N/A";

        // Comparativa mes a mes
        const monthlyComparison = meses.map((mName, i) => ({
            mes: mName,
            [targetYear]: unitsArray[i],
            [cYear]: compUnitsArray[i],
            diff: unitsArray[i] - compUnitsArray[i]
        }));

        comparison = {
            targetYear,
            compareYear: cYear,
            targetTotalUnits: totalUnitsYear,
            compareTotalUnits: compTotalUnits,
            diffUnits,
            percentUnits,
            targetTotalRev: totalRevYear,
            compareTotalRev: compTotalRev,
            diffRev,
            percentRev,
            monthlyComparison
        };
    }

    return {
        year: targetYear,
        totalUnits: totalUnitsYear,
        totalRevenueUSD: totalRevYear,
        unitsMonthly: unitsArray,
        revenueMonthly: revArray,
        monthDetail,
        comparison,
        isDynamicLive: parseInt(targetYear) >= 2026 || (targetYear === "2025" && unitsArray[10] > 0)
    };
};

// ==========================================
// 4. REACTIVADOS (CANCELADOS A ACTIVOS DESDE 2026)
// ==========================================
export const getReactivationMetrics = async ({ month = null, sector = null, forceRefresh = false } = {}) => {
    const data = await fetchReactivados(forceRefresh);
    if (!data) {
        return { total: 0, totalRevenue: 0, items: [] };
    }

    let items = data.items || [];

    if (month !== null && month !== "all") {
        const mIdx = Number(month);
        items = items.filter(it => {
            const d = new Date(it.created_at);
            return !isNaN(d) && d.getMonth() === mIdx;
        });
    }

    if (sector && sector !== "all") {
        const sNorm = normalizeText(sector);
        items = items.filter(it => normalizeText(it.sector?.name || "").includes(sNorm));
    }

    let totalRevenue = 0;
    let totalResidencial = 0;
    let totalPyme = 0;
    const sectorCounts = {};
    const planCounts = {};

    items.forEach(it => {
        const cost = parseFloat(it.plan?.cost || 0);
        totalRevenue += cost;

        const type = (it.plan?.client_type?.name || "").toUpperCase();
        if (type.includes("PYME")) {
            totalPyme += 1;
        } else {
            totalResidencial += 1;
        }

        const secName = it.sector?.name || "Sin Sector";
        sectorCounts[secName] = (sectorCounts[secName] || 0) + 1;

        const plName = (it.plan?.name || "Sin Plan").replace(/RECURRENTE\s+/gi, "").replace(/PLAN\s+/gi, "").trim();
        planCounts[plName] = (planCounts[plName] || 0) + 1;
    });

    const topSectores = Object.entries(sectorCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    const topPlanes = Object.entries(planCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    return {
        total: items.length,
        totalRevenue,
        totalResidencial,
        totalPyme,
        percentResidencial: items.length > 0 ? ((totalResidencial / items.length) * 100).toFixed(1) : "0",
        percentPyme: items.length > 0 ? ((totalPyme / items.length) * 100).toFixed(1) : "0",
        topSectores,
        topPlanes,
        trends: data.trends,
        items
    };
};

// ==========================================
// 5. RECAUDACIÓN HISTÓRICA (STATISTICS / INCOME)
// ==========================================
export const getHistoricalRevenueMetrics = async () => {
    const stats = await getHistoricalRevenueData();
    if (!stats) {
        return { totalAccumulated: 0, chartLabels: [], chartValues: [] };
    }
    return {
        totalAccumulated: stats.totalAccumulated,
        chartLabels: stats.chartLabels,
        chartValues: stats.chartValues,
        rawData: stats.rawData
    };
};

// ==========================================
// 6. COBROS BANCARIOS EN VIVO (BANCOS / MÉTODOS)
// ==========================================
export const getBankPaymentsMetrics = async ({ bank = null, method = null, startDate = null, endDate = null } = {}) => {
    const PAYMENTS_URL = "https://api.sisprotgf.com/api/public/payments/payment_company/";
    const TOKEN = (process.env.REACT_APP_PAYMENTS_API_KEY || process.env.REACT_APP_SISPROT_API_KEY || "").trim();

    if (!TOKEN) {
        throw new Error("No hay API Key configurada para pagos.");
    }

    const today = new Date().toLocaleDateString('en-CA');
    const start = startDate || today;
    const end = endDate || today;

    let allPayments = [];
    let nextUrl = `${PAYMENTS_URL}?page_size=500&created_at_after=${start}&created_at_before=${end}`;
    let iterations = 0;

    const invalidBankKeywords = ['todos', 'todo', 'all', 'bancos', 'banco', 'general', 'cualquiera', 'ninguno', 'total'];
    const isGenericBank = !bank || invalidBankKeywords.includes(normalizeText(String(bank)).toLowerCase().trim());

    const bankAcronymMap = {
        'BNC': 'banco nacional de credito',
        'BDV': 'banco de venezuela',
        'BFC': 'banco fondo comun',
        'BBP': 'banco bicentenario',
        'BANPLUS': 'banplus',
        'BANESCO': 'banesco',
        'MERCANTIL': 'mercantil',
        'PROVINCIAL': 'provincial',
        'EXTERIOR': 'exterior',
        'SOFITASA': 'sofitasa',
        'CARONI': 'caroni',
        'ZELLE': 'zelle',
        'CHASE': 'chase',
    };

    const resolvedBank = isGenericBank
        ? null
        : (bankAcronymMap[normalizeText(bank).toUpperCase()] || normalizeText(bank));

    // Intentar primero con remove_pagination=true para respuesta ultrarrápida en 1 petición
    try {
        const directUrl = `${PAYMENTS_URL}?remove_pagination=true&created_at_after=${start}&created_at_before=${end}`;
        const response = await fetch(directUrl, {
            headers: {
                'x-api-key': TOKEN,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        if (response.ok) {
            const raw = await response.json();
            const list = Array.isArray(raw) ? raw : (raw.results || []);
            allPayments = list.filter(p => {
                const bankOk = !resolvedBank || normalizeText(p.bank_name || '').includes(resolvedBank);
                const methodOk = !method || normalizeText(p.method_name || '').includes(normalizeText(method));
                return bankOk && methodOk;
            });
        }
    } catch (e) {
        console.warn("remove_pagination failed in biQueryService, using paginated fallback:", e);
    }

    if (allPayments.length === 0) {
        while (nextUrl && iterations < 15) {
            const response = await fetch(nextUrl, {
                headers: {
                    'x-api-key': TOKEN,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status} en pagos bancarios`);
            }

            const raw = await response.json();
            const pageData = Array.isArray(raw) ? raw[0] : raw;
            const results = pageData.results || [];

            const filtered = results.filter(p => {
                const bankOk = !resolvedBank || normalizeText(p.bank_name || '').includes(resolvedBank);
                const methodOk = !method || normalizeText(p.method_name || '').includes(normalizeText(method));
                return bankOk && methodOk;
            });

            allPayments.push(...filtered);
            nextUrl = pageData.next || null;
            iterations++;
        }
    }

    let totalUsd = 0;
    let totalBs = 0;
    const byBank = {};

    allPayments.forEach(p => {
        const u = parseFloat(p.amount_data?.amount_usd || 0);
        const b = parseFloat(p.amount_data?.amount_bs || 0);
        totalUsd += u;
        totalBs += b;

        const bName = p.bank_name || "Desconocido";
        if (!byBank[bName]) byBank[bName] = { count: 0, totalUsd: 0, totalBs: 0, methods: {} };
        byBank[bName].count++;
        byBank[bName].totalUsd += u;
        byBank[bName].totalBs += b;

        const mName = p.method_name || "Otro";
        byBank[bName].methods[mName] = (byBank[bName].methods[mName] || 0) + 1;
    });

    return {
        totalPayments: allPayments.length,
        totalUsd,
        totalBs,
        startDate: start,
        endDate: end,
        byBank,
        payments: allPayments
    };
};

// ==========================================
// 7. BÚSQUEDA Y FILTRADO DE CLIENTES POR SECTOR
// ==========================================
export const getSectorClientsDetail = (clientList = [], sectorName) => {
    if (!sectorName || !Array.isArray(clientList)) return null;
    const sNorm = normalizeText(sectorName);

    const matches = clientList.filter(c => normalizeText(c.sector_name || "").includes(sNorm));
    if (matches.length === 0) return null;

    const activos = matches.filter(c => c.status_name === "Activo" || c.status === 16);
    const suspendidos = matches.filter(c => c.status_name === "Suspendido" || c.status === 19);
    const cancelados = matches.filter(c => c.status_name === "Cancelado" || c.status === 34);

    const facturacionActivos = activos.reduce((acc, c) => acc + (parseFloat(c.plan?.cost) || 0), 0);
    const ingresoRecuperable = suspendidos.reduce((acc, c) => acc + (parseFloat(c.plan?.cost) || 0), 0);

    return {
        sectorName: matches[0].sector_name || sectorName,
        parishName: matches[0].parish_name || "",
        total: matches.length,
        activosCount: activos.length,
        suspendidosCount: suspendidos.length,
        canceladosCount: cancelados.length,
        facturacionActivos,
        ingresoRecuperable,
        clients: matches
    };
};
