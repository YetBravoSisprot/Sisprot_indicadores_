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

  const currentYear = new Date().getFullYear();
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

  // Calcular métricas analíticas agregadas
  let totalRevenueRecuperado = 0;
  let totalResidencial = 0;
  let totalPyme = 0;
  const planesMap = {};
  const sectoresMap = {};
  const mensualMap = {};

  const monthsEs = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  validList.forEach((item) => {
    const cost = parseFloat(item.plan?.cost) || 0;
    totalRevenueRecuperado += cost;

    const type = (item.plan?.client_type?.name || "").toUpperCase();
    if (type === "PYME") {
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
      const monthLabel = monthsEs[monthIdx];
      if (!mensualMap[monthIdx]) {
        mensualMap[monthIdx] = { monthIndex: monthIdx, label: monthLabel, count: 0, revenue: 0 };
      }
      mensualMap[monthIdx].count += 1;
      mensualMap[monthIdx].revenue += cost;
    }
  });

  const planes = Object.values(planesMap).sort((a, b) => b.count - a.count);
  const topSectores = Object.values(sectoresMap).sort((a, b) => b.count - a.count).slice(0, 10);
  const mensual = Object.values(mensualMap).sort((a, b) => a.monthIndex - b.monthIndex);

  const result = {
    total: validList.length,
    totalRaw: rawList.length,
    excludedCount: rawList.length - validList.length,
    totalRevenue: totalRevenueRecuperado,
    totalResidencial,
    totalPyme,
    planes,
    topSectores,
    mensual,
    items: validList,
    lastUpdated: new Date(),
  };

  reactivadosCache = result;
  lastFetchTime = Date.now();

  return result;
};
