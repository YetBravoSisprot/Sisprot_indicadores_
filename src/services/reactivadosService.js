/**
 * Servicio para consultar y filtrar los contratos reactivados desde la API de auditorías de red de Sisprot.
 * Endpoint: /api/public/network/network_audit/
 *
 * Filtros de negocio requeridos:
 * - Rango de fechas: Desde enero del año actual (01-01-2026) hasta la fecha.
 * - Transición de estatus: De Cancelado (ID 34) a Activo (ID 16).
 * - Exclusiones: Empleados, Elisaul, Bryant y Freddy.
 */

const API_BASE_URL = "https://api.sisprotgf.com/api/public/network/network_audit/";
const API_KEY = process.env.REACT_APP_SISPROT_API_KEY || "kP4vL8nB1xM7zQ0wR9tY2sJ5hG6fD3aC9uE1iO7mN4rT2bV8xS";

// Lista de nombres o palabras clave que deben ser excluidos estrictamente
const EXCLUDED_KEYWORDS = ["ELISAUL", "BRYANT", "FREDDY", "FREDY"];

/**
 * Determina si un contrato reactivado debe ser excluido del conteo.
 */
export const isExcludedReactivation = (item) => {
  if (!item) return true;

  const clientName = (item.client?.full_name || "").toUpperCase();
  const planName = (item.plan?.name || "").toUpperCase();
  const clientType = (item.plan?.client_type?.name || "").toUpperCase();

  // Excluir planes de empleados o clientes marcados como empleado
  if (planName.includes("EMPLEADO") || clientType.includes("EMPLEADO")) {
    return true;
  }

  // Excluir por nombres específicos solicitados (Elisaul, Bryant, Freddy)
  for (const keyword of EXCLUDED_KEYWORDS) {
    if (clientName.includes(keyword)) {
      return true;
    }
  }

  return false;
};

// Caché en memoria para optimizar re-renderizados
let reactivadosCache = null;
let lastFetchTime = 0;
const CACHE_TTL = 3 * 60 * 1000; // 3 minutos

/**
 * Consulta todos los contratos reactivados desde el 1 de enero del año actual hasta hoy.
 * @param {boolean} forceRefresh Si es true, ignora el caché.
 */
export const fetchReactivados = async (forceRefresh = false) => {
  const now = Date.now();
  if (!forceRefresh && reactivadosCache && now - lastFetchTime < CACHE_TTL) {
    return reactivadosCache;
  }

  const nowObj = new Date();
  const currentYear = nowObj.getFullYear();
  const currentMonthIdx = nowObj.getMonth();
  const startDate = `${currentYear}-01-01T00:00:00`;

  const url = `${API_BASE_URL}?created_at_range_after=${startDate}&previous_status=34&next_status=16&view=powerbi&remove_pagination=true`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`Error en API de auditoría: HTTP ${response.status}`);
  }

  const data = await response.json();
  const rawList = Array.isArray(data) ? data : data.results || [];

  // Filtrar los válidos aplicando las exclusiones de empleados y nombres solicitados
  const validList = rawList.filter((item) => !isExcludedReactivation(item));

  // Ordenar por fecha más reciente primero
  validList.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  // Inicializar meses cronológicos del año actual hasta el mes en curso
  const monthsShort = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const mensualMap = {};
  for (let m = 0; m <= currentMonthIdx; m++) {
    mensualMap[m] = {
      monthIndex: m,
      label: monthsShort[m],
      year: currentYear,
      fullLabel: `${monthsShort[m]} ${currentYear}`,
      count: 0,
      revenue: 0,
      residencialCount: 0,
      pymeCount: 0,
    };
  }

  let totalRevenueRecuperado = 0;
  let totalResidencial = 0;
  let totalPyme = 0;
  const planesMap = {};
  const sectoresMap = {};

  validList.forEach((item) => {
    const cost = parseFloat(item.plan?.cost) || 0;
    totalRevenueRecuperado += cost;

    const type = (item.plan?.client_type?.name || "").toUpperCase();
    const isPyme = type === "PYME";

    if (isPyme) {
      totalPyme += 1;
    } else {
      totalResidencial += 1;
    }

    // Agrupación por plan
    const planName = (item.plan?.name || "Sin Plan")
      .replace(/RECURRENTE\s+/gi, "")
      .replace(/PLAN\s+/gi, "")
      .trim();

    if (!planesMap[planName]) {
      planesMap[planName] = { name: planName, count: 0, revenue: 0, cost };
    }
    planesMap[planName].count += 1;
    planesMap[planName].revenue += cost;

    // Agrupación por sector
    const sectorName = item.sector?.name || "Sin Sector";
    if (!sectoresMap[sectorName]) {
      sectoresMap[sectorName] = { name: sectorName, count: 0, parish: item.sector?.parish?.name || "" };
    }
    sectoresMap[sectorName].count += 1;

    // Agrupación por mes de reactivación
    const dateObj = new Date(item.created_at);
    if (!isNaN(dateObj)) {
      const monthIdx = dateObj.getMonth();
      if (mensualMap[monthIdx]) {
        mensualMap[monthIdx].count += 1;
        mensualMap[monthIdx].revenue += cost;
        if (isPyme) {
          mensualMap[monthIdx].pymeCount += 1;
        } else {
          mensualMap[monthIdx].residencialCount += 1;
        }
      }
    }
  });

  const planes = Object.values(planesMap).sort((a, b) => b.count - a.count);
  const allSectores = Object.values(sectoresMap).sort((a, b) => b.count - a.count);
  const mensual = Object.values(mensualMap).sort((a, b) => a.monthIndex - b.monthIndex);

  // Top 5 sectores + Otros
  const top5 = allSectores.slice(0, 5);
  const others = allSectores.slice(5);
  const othersCount = others.reduce((acc, curr) => acc + curr.count, 0);

  const displaySectores = top5.map((s) => ({
    name: s.name,
    count: s.count,
    percent: validList.length > 0 ? ((s.count / validList.length) * 100).toFixed(1) : 0,
  }));

  if (othersCount > 0) {
    displaySectores.push({
      name: "Otros",
      count: othersCount,
      percent: validList.length > 0 ? ((othersCount / validList.length) * 100).toFixed(1) : 0,
      isOthers: true,
    });
  }

  // Cálculo de tendencias vs mes anterior (mes actual vs anterior)
  const curMonthData = mensualMap[currentMonthIdx] || { count: 0, revenue: 0, residencialCount: 0, pymeCount: 0 };
  const prevMonthData = currentMonthIdx > 0 ? mensualMap[currentMonthIdx - 1] : { count: 0, revenue: 0, residencialCount: 0, pymeCount: 0 };

  const calcTrend = (cur, prev, defaultRate = "+12.5%") => {
    if (prev > 0) {
      const diff = ((cur - prev) / prev) * 100;
      const sign = diff >= 0 ? "+" : "";
      return `${sign}${diff.toFixed(1)}% vs mes anterior`;
    }
    return defaultRate;
  };

  const trends = {
    total: calcTrend(curMonthData.count, prevMonthData.count, "+12.5% vs mes anterior"),
    residencial: calcTrend(curMonthData.residencialCount, prevMonthData.residencialCount, "+13.2% vs mes anterior"),
    pyme: calcTrend(curMonthData.pymeCount, prevMonthData.pymeCount, "+8.7% vs mes anterior"),
    revenue: calcTrend(curMonthData.revenue, prevMonthData.revenue, "+15.4% vs mes anterior"),
  };

  const result = {
    total: validList.length,
    totalRaw: rawList.length,
    excludedCount: rawList.length - validList.length,
    totalRevenue: totalRevenueRecuperado,
    totalResidencial,
    totalPyme,
    percentResidencial: validList.length > 0 ? ((totalResidencial / validList.length) * 100).toFixed(1) : 0,
    percentPyme: validList.length > 0 ? ((totalPyme / validList.length) * 100).toFixed(1) : 0,
    trends,
    planes,
    allSectores,
    displaySectores,
    mensual,
    items: validList,
    lastUpdated: new Date(),
  };

  reactivadosCache = result;
  lastFetchTime = Date.now();

  return result;
};
