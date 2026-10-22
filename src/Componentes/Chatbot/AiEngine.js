/**
 * Motor Híbrido: NLP por Gemini + Filtrado y Cálculos Locales
 */
import { getFullSalesData } from '../../services/salesService.js';
import { 
    getExecutiveKpis, 
    getHealthAndOpportunityMetrics, 
    getSalesMetrics, 
    getReactivationMetrics, 
    getHistoricalRevenueMetrics,
    getBankPaymentsMetrics,
    getSectorClientsDetail,
    formatUSD,
    formatPercent
} from '../../services/biQueryService.js';
import { fetchContractsByStatus } from '../../services/contractService.js';



const normalizeText = (text) => {
    if (!text) return "";
    return String(text).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
};

const extractNumber = (text) => {
    const match = text.match(/\d+/);
    return match ? match[0] : null;
};

const formatCurrency = (value) => {
    const formatted = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0);
    return `${formatted} US$`;
};



const isPymeClient = (cliente) => {
    if (!cliente) return false;
    let tipo = "";
    if (cliente.client_subdivision && cliente.client_subdivision !== "") {
        const partes = String(cliente.client_subdivision).split("_");
        if (partes.length >= 2 && partes[1]) {
            tipo = partes[1].toUpperCase();
        }
    }
    if (!tipo && cliente.client_type_name) {
        tipo = String(cliente.client_type_name).trim().toUpperCase();
    }
    return tipo === "PYME";
};

const mapCycleValue = (val, cliente) => {
    if (val === null || val === undefined) return "N/A";
    if (!isPymeClient(cliente)) {
        return "1";
    }
    const cycle = String(val).trim();
    if (cycle === "10") return "15";
    if (cycle === "25") return "30";
    return cycle;
};

// Función para enviar logs a n8n de forma centralizada
const sendToN8nLog = async (logData) => {
    const N8N_WEBHOOK_URL = "https://n8n.sisprottaurus.com/webhook/ai-training-log-sisprot-v2";
    try {
        fetch(N8N_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(logData)
        }).catch(e => console.warn("Log centralizado (n8n) no disponible aún."));
    } catch (e) {
        console.error("Error enviando a n8n:", e);
    }
};

// ─── PARSER UNIVERSAL DE FECHAS EN ESPAÑOL (Para soportar cualquier fecha o periodo) ───
export const parseSpanishDateRange = (query = '', params = {}) => {
    const q = (query || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const todayStr = now.toLocaleDateString('en-CA');
    const toDateStr = (d) => d.toLocaleDateString('en-CA');

    // 0. Si ya vienen startDate y endDate válidos
    if (params?.startDate && params?.endDate) {
        return { startDate: params.startDate, endDate: params.endDate };
    }

    const monthNames = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    const dayNames = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

    // 1. Detección de día de la semana (ej: "el dia lunes de esta semana", "el martes", "el lunes pasado")
    for (let targetDay = 0; targetDay < 7; targetDay++) {
        const dName = dayNames[targetDay];
        if (q.includes(dName)) {
            const isLastWeek = q.includes('pasada') || q.includes('pasado') || q.includes('anterior');
            const currentDayOfWeek = now.getDay();
            const dayDiff = targetDay - currentDayOfWeek;
            const targetDate = new Date(now);
            targetDate.setDate(now.getDate() + dayDiff - (isLastWeek ? 7 : 0));
            const dStr = toDateStr(targetDate);
            return { startDate: dStr, endDate: dStr };
        }
    }

    // 2. Días relativos: ayer, antier, hoy
    if (q.includes('antier') || q.includes('anteayer')) {
        const d = new Date(now);
        d.setDate(now.getDate() - 2);
        const s = toDateStr(d);
        return { startDate: s, endDate: s };
    }
    if (q.includes('ayer') || params?.periodo === 'ayer') {
        const d = new Date(now);
        d.setDate(now.getDate() - 1);
        const s = toDateStr(d);
        return { startDate: s, endDate: s };
    }
    if (q.includes('hoy') || params?.periodo === 'hoy') {
        return { startDate: todayStr, endDate: todayStr };
    }

    // 3. Semanas
    if (q.includes('semana pasada')) {
        const currentDay = now.getDay() || 7;
        const lastMonday = new Date(now);
        lastMonday.setDate(now.getDate() - currentDay - 6);
        const lastSunday = new Date(now);
        lastSunday.setDate(now.getDate() - currentDay);
        return { startDate: toDateStr(lastMonday), endDate: toDateStr(lastSunday) };
    }
    if (q.includes('esta semana') || q.includes('en la semana') || params?.periodo === 'esta_semana') {
        const currentDay = now.getDay() || 7;
        const monday = new Date(now);
        monday.setDate(now.getDate() - (currentDay - 1));
        return { startDate: toDateStr(monday), endDate: todayStr };
    }

    // 4. Meses
    if (q.includes('mes pasado') || q.includes('el mes anterior')) {
        const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
        const lastDayPrevMonth = new Date(currentYear, currentMonth, 0);
        return { startDate: toDateStr(prevMonthDate), endDate: toDateStr(lastDayPrevMonth) };
    }
    if (q.includes('este mes') || q.includes('del mes') || q.includes('en el mes') || q.includes('mes actual') || params?.periodo === 'este_mes' || params?.periodo === 'mes') {
        const firstDay = new Date(currentYear, currentMonth, 1);
        return { startDate: toDateStr(firstDay), endDate: todayStr };
    }

    // 5. Mes específico por nombre (ej: "en septiembre", "en agosto")
    for (let mIdx = 0; mIdx < 12; mIdx++) {
        const mName = monthNames[mIdx];
        if (q.includes(mName)) {
            const yearMatch = q.match(/\b(202\d)\b/);
            const y = yearMatch ? parseInt(yearMatch[1], 10) : currentYear;
            const firstDay = new Date(y, mIdx, 1);
            const lastDay = (y === currentYear && mIdx === currentMonth)
                ? now
                : new Date(y, mIdx + 1, 0);
            return { startDate: toDateStr(firstDay), endDate: toDateStr(lastDay) };
        }
    }

    // 6. Últimos N días
    if (q.includes('ultimos 7 dias') || q.includes('ultimos siete dias')) {
        const d = new Date(now);
        d.setDate(now.getDate() - 6);
        return { startDate: toDateStr(d), endDate: todayStr };
    }
    if (q.includes('ultimos 30 dias') || q.includes('ultimos treinta dias')) {
        const d = new Date(now);
        d.setDate(now.getDate() - 29);
        return { startDate: toDateStr(d), endDate: todayStr };
    }

    // Default: hoy
    return { startDate: todayStr, endDate: todayStr };
};

// ─── PAGOS BANCARIOS: Fetch de cobros con soporte para rangos de fechas ──────────
const bankPaymentsCache = {}; // Cache local en memoria para no repetir peticiones recientes

const fetchBankPayments = async (bankFilter = null, methodFilter = null, startDate = null, endDate = null) => {
    const PAYMENTS_URL = "https://api.sisprotgf.com/api/public/payments/payment_company/";
    const TOKEN = (process.env.REACT_APP_PAYMENTS_API_KEY || process.env.REACT_APP_SISPROT_API_KEY || "kP4vL8nB1xM7zQ0wR9tY2sJ5hG6fD3aC9uE1iO7mN4rT2bV8xS").trim();

    if (!TOKEN) {
        throw new Error("No hay API Key configurada para los cobros bancarios.");
    }

    // Si no hay fecha, usamos hoy por defecto (retrocompatibilidad)
    const nowLocal = new Date();
    const today = nowLocal.toLocaleDateString('en-CA');

    const start = startDate || today;
    const end = endDate || today;

    // Normalizar banco - Ignorar palabras genéricas que la IA o usuario confunden con nombres de bancos
    const invalidBankKeywords = ['todos', 'todo', 'all', 'bancos', 'banco', 'general', 'cualquiera', 'ninguno', 'total'];
    const isGenericBank = !bankFilter || invalidBankKeywords.includes(normalizeText(String(bankFilter)).toLowerCase().trim());

    // Mapa de siglas → nombre completo
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
        : (bankAcronymMap[normalizeText(bankFilter).toUpperCase()] || normalizeText(bankFilter));

    // Revisar caché en memoria (3 minutos de vigencia)
    const cacheKey = `${start}_${end}_${resolvedBank || 'all'}_${methodFilter || 'all'}`;
    const nowTs = Date.now();
    if (bankPaymentsCache[cacheKey] && (nowTs - bankPaymentsCache[cacheKey].timestamp < 3 * 60 * 1000)) {
        return { payments: bankPaymentsCache[cacheKey].data, startDate: start, endDate: end };
    }

    let allPayments = [];

    // Intento 1: remove_pagination=true (Ultrarrápido, 1 sola petición HTTP directa)
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
                const methodOk = !methodFilter || normalizeText(p.method_name || '').includes(normalizeText(methodFilter));
                return bankOk && methodOk;
            });

            bankPaymentsCache[cacheKey] = { data: allPayments, timestamp: nowTs };
            return { payments: allPayments, startDate: start, endDate: end };
        }
    } catch (e) {
        console.warn("fetchBankPayments con remove_pagination falló, pasando a paginación:", e);
    }

    // Intento 2: Paginado estándar en caso de fallo
    let nextUrl = `${PAYMENTS_URL}?page_size=500&created_at_after=${start}&created_at_before=${end}`;
    let iterations = 0;

    while (nextUrl && iterations < 15) {
        const response = await fetch(nextUrl, {
            headers: {
                'x-api-key': TOKEN,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            console.error(`Error API Pagos (${response.status}):`, response.statusText);
            throw new Error(`Error consultando pagos bancarios: HTTP ${response.status}`);
        }

        const raw = await response.json();
        const pageData = Array.isArray(raw) ? raw[0] : raw;
        const results = pageData.results || [];

        const filtered = results.filter(p => {
            const bankOk = !resolvedBank || normalizeText(p.bank_name || '').includes(resolvedBank);
            const methodOk = !methodFilter || normalizeText(p.method_name || '').includes(normalizeText(methodFilter));
            return bankOk && methodOk;
        });

        allPayments = [...allPayments, ...filtered];
        nextUrl = pageData.next || null;
        iterations++;
    }

    bankPaymentsCache[cacheKey] = { data: allPayments, timestamp: nowTs };
    return { payments: allPayments, startDate: start, endDate: end };
};

// --- DATA EN TIEMPO REAL: Los contratos se obtienen de la API oficial de Sisprot (misma fuente que Top Urbanismo y Resumen BI) ---
const fetchHistoricalClients = async () => {
    return null;
};

// Nueva función unificada para registrar en local y n8n
const registerUnansweredQuery = (query, userName, currentPage) => {
    const logEntry = {
        pregunta: query,
        fecha: new Date().toLocaleString(),
        usuario: userName || "Usuario",
        seccion: currentPage || "Chatbot"
    };

    // 1. Guardar localmente
    try {
        const unansweredLog = JSON.parse(localStorage.getItem('ai_training_log') || '[]');
        unansweredLog.push(logEntry);
        localStorage.setItem('ai_training_log', JSON.stringify(unansweredLog.slice(-50)));
    } catch (e) { console.error("Error saving local log", e); }

    // 2. Enviar a n8n
    sendToN8nLog(logEntry);
};

const getCycleLabel = (val, cliente) => {
    const mapped = mapCycleValue(val, cliente);
    if (mapped === "N/A") return "N/A";
    return `Ciclo ${mapped}`;
};

// --- HELPERS DE SIMILITUD (FUZZY MATCHING) ---
const editDistance = (s1, s2) => {
    s1 = s1.toLowerCase(); s2 = s2.toLowerCase();
    let costs = new Array();
    for (let i = 0; i <= s1.length; i++) {
        let lastValue = i;
        for (let j = 0; j <= s2.length; j++) {
            if (i == 0) costs[j] = j;
            else {
                if (j > 0) {
                    let newValue = costs[j - 1];
                    if (s1.charAt(i - 1) != s2.charAt(j - 1))
                        newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                    costs[j - 1] = lastValue;
                    lastValue = newValue;
                }
            }
        }
        if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
};

const calculateSimilarity = (s1, s2) => {
    let longer = s1.length > s2.length ? s1 : s2;
    let shorter = s1.length > s2.length ? s2 : s1;
    if (longer.length === 0) return 1.0;
    return (longer.length - editDistance(longer, shorter)) / parseFloat(longer.length);
};

const findBestUrbanismoMatch = (queryUrb) => {
    if (!queryUrb) return null;
    const normalizedQuery = normalizeText(queryUrb);
    const availableSectors = Object.keys(sectorAgenciaMap);

    // 0. PRIORIDAD MÁXIMA: Consultar el mapa de aliases primero
    // Convierte "Prados 1" -> "Prados I", "Comunidad Durpa" -> "Durpa", etc.
    if (urbanismoAliases[normalizedQuery]) {
        return urbanismoAliases[normalizedQuery];
    }

    // 1. Intento de match exacto
    const exactMatch = availableSectors.find(s => normalizeText(s) === normalizedQuery);
    if (exactMatch) return exactMatch;

    // 2. Intento de match por palabras clave (bolsa de palabras)
    const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 2);
    if (queryWords.length === 0) return null;

    let candidates = [];
    let maxMatchCount = 0;

    for (const sector of availableSectors) {
        const sectorNorm = normalizeText(sector);
        const sectorWords = sectorNorm.split(/\s+/).filter(w => w.length > 2);

        // Contar cuántas palabras de la consulta están en el sector
        const matchCount = queryWords.filter(qw => sectorWords.includes(qw)).length;

        if (matchCount >= maxMatchCount && matchCount > 0) {
            // Protección de Suffix: Solo bloqueamos si ambos tienen sufijos DISTINTOS
            // Si el query no tiene sufijo, permitimos que machee sectores con sufijo (ej: "Saman Tarazonero" -> "Saman Tarazonero I")
            const getSuffix = (text) => text.match(/\b(ii|iii|i|sur|norte|este|oeste|edificios)\b/i)?.[0];
            const querySuffix = getSuffix(normalizedQuery);
            const sectorSuffix = getSuffix(sectorNorm);

            if (querySuffix && sectorSuffix && querySuffix !== sectorSuffix) continue;

            if (matchCount > maxMatchCount) {
                maxMatchCount = matchCount;
                candidates = [sector];
            } else {
                candidates.push(sector);
            }
        }
    }

    // Si no hay candidatos con al menos la mitad de las palabras
    if (maxMatchCount < (queryWords.length / 2)) return null;

    // Si hay un solo candidato, es el ganador
    if (candidates.length === 1) return candidates[0];

    // Si hay varios, desempatamos por similitud difusa (Levenshtein)
    const scoredCandidates = candidates.map(c => {
        const score = getFuzzyUrbanismoSuggestion(queryUrb).score; // Reutilizamos el calculador
        // Pero calculamos específicamente para este candidato
        const calculateSimilarity = (s1, s2) => {
            let longer = s1.length > s2.length ? s1 : s2;
            let shorter = s1.length > s2.length ? s2 : s1;
            if (longer.length === 0) return 1.0;
            const editDistance = (str1, str2) => {
                str1 = str1.toLowerCase(); str2 = str2.toLowerCase();
                let costs = [];
                for (let i = 0; i <= str1.length; i++) {
                    let lastValue = i;
                    for (let j = 0; j <= str2.length; j++) {
                        if (i == 0) costs[j] = j;
                        else if (j > 0) {
                            let newValue = costs[j - 1];
                            if (str1.charAt(i - 1) != str2.charAt(j - 1))
                                newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                            costs[j - 1] = lastValue; lastValue = newValue;
                        }
                    }
                    if (i > 0) costs[str2.length] = lastValue;
                }
                return costs[str2.length];
            };
            return (longer.length - editDistance(longer, shorter)) / parseFloat(longer.length);
        };
        return { name: c, score: calculateSimilarity(normalizedQuery, normalizeText(c)) };
    }).sort((a, b) => b.score - a.score);

    // Si el mejor tiene una ventaja clara (ej: > 0.1 de diferencia con el segundo), lo elegimos
    if (scoredCandidates.length > 1 && (scoredCandidates[0].score - scoredCandidates[1].score) > 0.1) {
        return scoredCandidates[0].name;
    }

    // Si están muy cerca (ambigüedad), devolvemos el array para que el handler pregunte
    return scoredCandidates.map(c => c.name);
};

// Nueva función mejorada para encontrar sugerencias con niveles de confianza
const getFuzzyUrbanismoSuggestion = (queryUrb) => {
    if (!queryUrb || queryUrb.length < 3) return { match: null, score: 0 };
    const normalizedQuery = normalizeText(queryUrb);
    const availableSectors = Object.keys(sectorAgenciaMap);

    const calculateSimilarity = (s1, s2) => {
        let longer = s1.length > s2.length ? s1 : s2;
        let shorter = s1.length > s2.length ? s2 : s1;
        if (longer.length === 0) return 1.0;
        return (longer.length - editDistance(longer, shorter)) / parseFloat(longer.length);
    };

    const editDistance = (s1, s2) => {
        s1 = s1.toLowerCase(); s2 = s2.toLowerCase();
        let costs = new Array();
        for (let i = 0; i <= s1.length; i++) {
            let lastValue = i;
            for (let j = 0; j <= s2.length; j++) {
                if (i == 0) costs[j] = j;
                else {
                    if (j > 0) {
                        let newValue = costs[j - 1];
                        if (s1.charAt(i - 1) != s2.charAt(j - 1))
                            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                        costs[j - 1] = lastValue;
                        lastValue = newValue;
                    }
                }
            }
            if (i > 0) costs[s2.length] = lastValue;
        }
        return costs[s2.length];
    };

    let bestMatch = null;
    let highestScore = 0;

    for (const sector of availableSectors) {
        const score = calculateSimilarity(normalizedQuery, normalizeText(sector));
        if (score > highestScore) {
            highestScore = score;
            bestMatch = sector;
        }
    }

    return { match: bestMatch, score: highestScore };
};

// Mapeo de sectores a agencias (Copiado de TopUrbanismo para cuadrar exacto los ingresos)
const sectorAgenciaMap = {
    "Villas El Carmen": "NODO MACARO", "El Macaro": "NODO MACARO", "Saman de Guere": "NODO MACARO",
    "Casco de Turmero": "NODO TURMERO", "Villa Los Tamarindos": "NODO MACARO", "Mata Caballo": "NODO PAYA",
    "Pantin": "NODO PAYA", "Saman Tarazonero II": "NODO MACARO", "Rio Seco": "NODO PAYA",
    "Ezequiel Zamora": "NODO TURMERO", "La Casona II": "NODO MACARO", "Durpa": "NODO PAYA",
    "Paya Abajo": "NODO PAYA", "Saman Tarazonero I": "NODO MACARO", "Prados III": "NODO PAYA",
    "Bicentenario": "NODO PAYA", "Prados II": "NODO PAYA", "La Casona I": "NODO MACARO",
    "Palmeras II": "NODO MACARO", "Guanarito": "NODO TURMERO", "La Macarena": "NODO MACARO",
    "Brisas de Paya": "NODO PAYA", "Isaac Oliveira": "NODO MACARO", "La Magdalena": "NODO MACARO",
    "El Paraiso": "NODO MACARO", "Antigua Hacienda De Paya": "NODO PAYA", "San Sebastian": "NODO MACARO",
    "Ppal Paya": "NODO PAYA", "Lascenio Guerrero": "NODO MACARO", "Los Hornos": "NODO PAYA",
    "Callejon Lim": "NODO PAYA", "Tibisay Guevara": "NODO TURMERO", "Plaza Jardin": "NODO MACARO",
    "Antigua Hacienda De Paya II": "NODO PAYA", "Villas Del Sur": "NODO TURMERO", "San Pablo": "NODO TURMERO",
    "Vallecito": "NODO PAYA", "Jabillar": "NODO MACARO", "Prados I": "NODO PAYA",
    "La Concepcion": "NODO MACARO", "Las Rurales": "NODO PAYA", "Valle Paraiso": "NODO TURMERO",
    "Simon Bolivar": "NODO MACARO", "Canaima": "NODO PAYA", "Vista Hermosa": "NODO PAYA",
    "Valle Verde": "NODO PAYA", "Palma Real": "NODO PAYA", "Palmeras I": "NODO MACARO",
    "Prados de Cafetal": "NODO TURMERO", "Santa Eduviges": "NODO MACARO", "El Naranjal": "NODO PAYA",
    "Villa De San Jose": "NODO MACARO", "La Floresta": "NODO TURMERO", "Terrazas de Paya": "NODO PAYA",
    "Salto Angel": "NODO MACARO", "Villeguita": "NODO TURMERO", "La Esperanza": "NODO MACARO",
    "La Arboleda": "NODO PAYA", "La Concepcion III": "NODO MACARO", "La Julia": "NODO MACARO",
    "Terrazas de Turmero": "NODO TURMERO", "Haras de San Pablo": "NODO TURMERO", "Taguapire": "NODO MACARO",
    "La Casona II Edificios": "NODO MACARO", "Antonio Jose de Sucre": "NODO MACARO", "Valle del Rosario": "NODO MACARO",
    "Arturo Luis Berti": "NODO MACARO", "Callejon Cañaveral": "NODO PAYA", "Laguna Plaza": "NODO TURMERO",
    "La Casona I Edificios": "NODO MACARO", "Villa Caribe": "NODO TURMERO", "Narayola II": "NODO MACARO",
    "Luz y Vida": "NODO PAYA", "Terrazas de Juan Pablo": "NODO MACARO", "Residencias Candys": "NODO TURMERO",
    "El Nispero": "NODO TURMERO", "Ciudad Bendita": "NODO TURMERO", "Residencias Mariño": "NODO TURMERO",
    "San Carlos": "NODO TURMERO", "Los Mangos": "NODO PAYA", "Callejon Los Jabillos": "NODO PAYA",
    "Guerito": "NODO MACARO", "Laguna II": "NODO TURMERO", "Marina Caribe": "NODO TURMERO",
    "Dios Es Mi Refugio": "NODO PAYA", "Huerta Los Pajaros": "NODO PAYA", "La Montañita": "NODO TURMERO",
    "Betania": "NODO PAYA", "1ro de Mayo Norte": "NODO PAYA", "Payita": "NODO PAYA",
    "Las Palmas": "NODO PAYA", "1ro de Mayo Sur": "NODO PAYA", "El Cambur": "NODO PAYA",
    "La Orquidea": "NODO PAYA", "Sector los Mangos": "NODO PAYA", "La Aduana": "NODO TURMERO",
    "Valle Fresco": "NODO TURMERO", "El Bosque": "NODO PAYA", "Leocolbo": "NODO MACARO",
    "Callejon Rosales": "NODO PAYA", "Prados": "NODO PAYA", "Calle Peñalver": "NODO TURMERO",
    "Los Caobos": "NODO MACARO", "Callejon 17": "NODO PAYA", "Los Nisperos": "NODO TURMERO",
    "La Montaña": "NODO TURMERO", "Santa Barbara": "NODO MACARO", "Valle lindo": "NODO TURMERO",
    "Polvorin": "NODO PAYA", "Guayabita": "NODO PAYA", "La Marcelota": "NODO PAYA",
    "Manirito": "NODO PAYA", "Paraguatan": "NODO PAYA", "La Guzman": "NODO PAYA",
    "18 de Septiembre": "NODO MACARO", "Edif. El Torreon": "NODO TURMERO", "Edif. El Portal": "NODO TURMERO",
    "Urb. Vista Hermosa La Julia": "NODO MACARO", "Guerrero de Chavez": "NODO PAYA", "19 de Abril": "NODO MACARO",
    // Sectores adicionales (Caballerizas usa sector_name 'Palma Real' en BD, Prados de Canaima usa 'Canaima')
    "Prados de Canaima": "NODO PAYA"
};

// Alias de urbanismos: Nombres alternativos que el usuario puede escribir -> nombre oficial en sectorAgenciaMap
// IMPORTANTE: 'Caballerizas' es un barrio dentro de 'Palma Real' en la data maestra (sector_name = 'Palma Real')
const urbanismoAliases = {
    "prados 1": "Prados I",
    "prados i": "Prados I",
    "prados 2": "Prados II",
    "prados ii": "Prados II",
    "prados 3": "Prados III",
    "prados iii": "Prados III",
    "comunidad durpa": "Durpa",
    "durpa": "Durpa",
    "canaima": "Canaima",
    "prados de canaima": "Prados de Canaima",
    "la orquidea": "La Orquidea",
    "orquidea": "La Orquidea",
    "brisas de paya": "Brisas de Paya",
    "bicentenario": "Bicentenario",
    "palma real": "Palma Real",
    "luz y vida": "Luz y Vida",
    "prados de cafetal": "Prados de Cafetal"
};

// Sub-Sectores: Barrios que viven DENTRO de un sector en la BD.
// Se filtran por sector_name + palabra clave en la dirección (address_tax).
// Formato: { sectorPadre: "nombre en BD", keyword: "palabra en dirección" }
const subSectorMap = {
    "caballerizas": { sectorPadre: "Palma Real", keyword: "caballeriza", label: "Caballerizas (en Palma Real)" },
    "barrio caballerizas": { sectorPadre: "Palma Real", keyword: "caballeriza", label: "Caballerizas (en Palma Real)" }
};

const pageKnowledge = {
    "/TopUrbanismo": {
        name: "Líderes de Sectores (Top Urbanismos)",
        description: "Aquí medimos el rendimiento de cada zona urbana para saber nuestras fortalezas.",
        data: "Muestro el total de clientes, ingresos por sector y tarjetas detalladas por zona (Paya, Turmero, etc.).",
        guide: "💡 **Tip rápido**: Usa los filtros de arriba y genera el **Excel** para ver datos detallados de los clientes."
    },
    "*": {
        name: "Indicadores (Reportes PowerBI)",
        description: "Sección de análisis avanzado con informes externos detallados.",
        data: "Aquí encontrarás múltiples tableros de **PowerBI**: Control Diario de Contratos, Cancelaciones, Ingresos Diarios, Activos por Día y Ventas.",
        guide: "💡 **Tip rápido**: Los datos aquí se alimentan de fuentes externas y son ideales para análisis de tendencias a largo plazo."
    },
    "/Indicadores": {
        name: "Resumen Estratégico (Dashboard)",
        description: "Es el panel principal de inteligencia de negocio donde mostramos la salud operativa y económica de la empresa.",
        data: "Muestro métricas clave: **Efectividad de Cartera** (¿% de clientes pagando?), **Oportunidad en USD** (ingreso potencial), **Sector Líder** y un **Resumen de Clientes** con conteos reales de Activos, Suspendidos y Cancelados.",
        guide: "💡 **Tip rápido**: Aquí puedes ver si el negocio está creciendo. Si la Efectividad de Cartera es baja, significa que hay muchos clientes suspendidos o cancelados."
    },
    "/Ventas": {
        name: "Monitor de Operaciones",
        description: "Es el centro de monitoreo en tiempo real de la actividad operativa del sistema.",
        data: "Muestro el ranking de los 5 Planes más vendidos, detallando su costo unitario, cantidad de clientes e ingresos generados por cada plan. También incluyo un resumen financiero segmentado por categorías: Total Residenciales y Total PYMEs, junto al Ingreso Total Global.",
        guide: "💡 **Tip rápido**: Aquí puedes ver qué planes son más rentables y cuánto aporta cada segmento (Pyme/Residencial) al negocio."
    },

    "/Admin": {
        name: "Adm. Ingresos (Centro de Comando Gerencial)",
        description: "El panel de control administrativo privado para la toma de decisiones gerenciales.",
        data: "Muestro tres KPIs críticos: **Ingresos Totales (Mes)**, **Clientes Activos** (comerciales) y **Clientes Suspendidos**. También incluyo un gráfico histórico de ingresos y un estado de carga sincronizado para la data de clientes y Sheets.",
        guide: "💡 **Atención**: Esta sección es el centro de mando. Si el gráfico no carga de inmediato, es porque estoy sincronizando los datos históricos en tiempo real para darte la cifra más exacta."
    },
    "/VentasGlobales": {
        name: "Ventas Globales (Histórico 2021-2026)",
        description: "Análisis estratégico de la evolución de ventas y proyecciones anuales.",
        data: "Muestro la evolución mensual desde 2021, comparativa de crecimiento vs Enero, proyección estimada para el cierre de 2026 y una matriz de calor (heatmap) para identificar picos de éxito.",
        guide: "💡 **Tip rápido**: Selecciona un año y un mes en la 'Consulta Detallada' para ver el impacto específico y la variación porcentual."
    }
};

// --- MOTOR NLU LOCAL DETERMINÍSTICO (Resiliencia Total Ante Fallos de Red o Clave) ---
export const parseQueryLocally = (rawQuery, history = [], currentPage = "", userName = "") => {
    const q = normalizeText(rawQuery);

    // 0. Saludos y Agradecimientos
    if (/^(hola|buenos dias|buenas tardes|buenas noches|saludos|que tal|hey)\b/i.test(q)) {
        return { intent: 'SALUDO', parameters: {}, message: "¡Hola! ¿En qué puedo asistirte hoy?" };
    }
    if (/^(gracias|muchas gracias|vale gracias|perfecto gracias|listo gracias)\b/i.test(q)) {
        return { intent: 'AGRADECIMIENTO', parameters: {}, message: "¡A tu orden siempre!" };
    }

    // 1. Detección de Reactivados (Transición 34 -> 16 desde 2026)
    if (q.includes("reactivad") || q.includes("reactivaron") || q.includes("reactivacion") || q.includes("recuperados") || (currentPage.includes("Reactivados") && (q.includes("mes") || q.includes("sector") || q.includes("cuanto") || q.includes("cuantos")))) {
        const monthMap = { enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5, julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11 };
        let detectedMonth = null;
        for (const [mName, mIdx] of Object.entries(monthMap)) {
            if (q.includes(mName)) { detectedMonth = mIdx; break; }
        }
        if (q.includes("este mes")) {
            detectedMonth = new Date().getMonth();
        }
        return {
            intent: 'REACTIVADOS',
            parameters: { month: detectedMonth },
            message: `Consultando contratos reactivados...`
        };
    }

    // 2. Detección de Comparativa de Ventas o Histórico de Ventas
    if (q.includes("venta") || q.includes("vendido") || q.includes("vendimos") || (currentPage.includes("VentasGlobales") && (q.includes("202") || q.includes("ano") || q.includes("mes") || q.includes("proyeccion") || q.includes("como estuvo") || q.includes("y 202")))) {
        const years = q.match(/\b(202[1-6])\b/g) || [];
        let year = "2026";
        let compareYear = null;

        if (years.length >= 2) {
            year = years[1];
            compareYear = years[0];
        } else if (years.length === 1) {
            year = years[0];
            if (q.includes("compara") || q.includes("vs") || q.includes("diferencia") || q.includes("respecto a")) {
                compareYear = year === "2026" ? "2025" : "2026";
            }
        } else if (q.includes("ano pasado") || q.includes("anterior")) {
            year = "2026";
            compareYear = "2025";
        }

        const isComparison = q.includes("compara") || q.includes("vs") || q.includes("diferencia") || compareYear !== null;

        const monthMap = { enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5, julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11 };
        let detectedMonth = null;
        for (const [mName, mIdx] of Object.entries(monthMap)) {
            if (q.includes(mName)) { detectedMonth = mIdx; break; }
        }

        return {
            intent: isComparison ? 'COMPARAR_VENTAS' : 'ANALISIS_VENTAS',
            parameters: { year, compareYear, month: detectedMonth },
            message: isComparison ? `Comparando ventas entre ${compareYear} y ${year}...` : `Consultando análisis de ventas para ${year}...`
        };
    }

    // 3. Detección de Ingresos Recuperables / Oportunidad
    if (q.includes("recuperar") || q.includes("recuperable") || q.includes("oportunidad") || (q.includes("pendiente") && q.includes("dinero")) || (currentPage.includes("Indicadores") && q.includes("oportunidad"))) {
        return {
            intent: 'INGRESOS_RECUPERABLES',
            parameters: {},
            message: "Calculando la oportunidad de ingresos recuperables..."
        };
    }

    // 4. Detección de Fuga de Capital / Cancelaciones
    if (q.includes("fuga") || (q.includes("perdida") && q.includes("cancel")) || (q.includes("dinero") && q.includes("cancelad")) || (currentPage.includes("Indicadores") && q.includes("fuga"))) {
        return {
            intent: 'FUGA_CAPITAL',
            parameters: {},
            message: "Calculando la fuga de capital por clientes cancelados..."
        };
    }

    // 5. Detección de Salud de Cartera
    if (q.includes("salud") || (q.includes("porcentaje") && q.includes("activo")) || q.includes("porcentaje pagando") || (currentPage.includes("Indicadores") && q.includes("salud"))) {
        return {
            intent: 'SALUD_CARTERA',
            parameters: {},
            message: "Calculando la salud de la cartera de clientes..."
        };
    }

    // 6. Detección de ARPU / Ticket Promedio
    if (q.includes("arpu") || q.includes("ticket promedio") || q.includes("ingreso promedio") || (q.includes("promedio") && q.includes("cliente"))) {
        return {
            intent: 'ARPU_METRICA',
            parameters: {},
            message: "Calculando el Ticket Promedio (ARPU) de Sisprot BI..."
        };
    }

    // 7. Detección de Tasa de Baja / Churn
    if (q.includes("tasa de baja") || q.includes("churn") || q.includes("tasa de cancelacion") || q.includes("tasa de abandono")) {
        return {
            intent: 'CHURN_METRICA',
            parameters: {},
            message: "Calculando la Tasa de Baja (Churn Rate)..."
        };
    }

    // 8. Detección de Recaudación Histórica Total
    if (q.includes("recaudado en total") || q.includes("total recaudado") || q.includes("recaudacion historica") || q.includes("ingresos acumulados")) {
        return {
            intent: 'RECAUDACION_HISTORICA',
            parameters: {},
            message: "Consultando el total histórico recaudado..."
        };
    }

    // 9. Detección de Resumen de KPIs
    if (q.includes("resume los principales kpis") || q.includes("resumen kpi") || q.includes("resumen general") || q.includes("kpis principales") || q.includes("resumen administrativo") || (currentPage.includes("Admin") && q.includes("resume"))) {
        return {
            intent: 'RESUMEN_KPIS',
            parameters: {},
            message: "Generando resumen ejecutivo de KPIs..."
        };
    }

    // 10. Detección de Diferencias conceptuales
    if (q.includes("diferencia") && (q.includes("suspendido") || q.includes("cancelado"))) {
        return {
            intent: 'EXPLICACION_REGLA',
            parameters: { tema: "suspendido_vs_cancelado" },
            message: "Explicando la diferencia entre clientes suspendidos y cancelados..."
        };
    }

    // 11. Detección de Bancos y Cobros
    const bancosKeywords = ["bnc", "bdv", "venezuela", "provincial", "banplus", "banesco", "mercantil", "zelle", "sofitasa", "banco", "bancos", "cobros", "cobro", "pagos", "pago", "recaudacion", "recaudo", "pago movil", "transferencia", "banca"];
    if (bancosKeywords.some(b => q.includes(b)) && !q.includes("arpu") && !q.includes("churn")) {
        let detectedBank = null;
        if (q.includes("bnc")) detectedBank = "BNC";
        else if (q.includes("venezuela") || q.includes("bdv")) detectedBank = "BDV";
        else if (q.includes("provincial")) detectedBank = "PROVINCIAL";
        else if (q.includes("banesco")) detectedBank = "BANESCO";
        else if (q.includes("banplus")) detectedBank = "BANPLUS";
        else if (q.includes("mercantil")) detectedBank = "MERCANTIL";
        else if (q.includes("zelle")) detectedBank = "ZELLE";

        const dateRange = parseSpanishDateRange(q);

        return {
            intent: 'INGRESOS_BANCOS',
            parameters: { banco: detectedBank, bank: detectedBank, startDate: dateRange.startDate, endDate: dateRange.endDate },
            message: "Consultando cobranza bancaria registrada..."
        };
    }

    // 12. Detección de Sector Específico / Ranking Sectores
    if (q.includes("sector con mas") || q.includes("top sector") || q.includes("mejores sectores") || q.includes("urbanismo con mas")) {
        return {
            intent: 'RANKING_SECTORES',
            parameters: {},
            message: "Consultando ranking de sectores..."
        };
    }

    // 13. Detección de Planes
    if (q.includes("que plan") || q.includes("plan genera mas") || q.includes("plan mas vendido") || q.includes("top planes")) {
        return {
            intent: 'PLANES',
            parameters: {},
            message: "Consultando métricas de planes..."
        };
    }

    // 14. Estatus específicos de clientes
    if (q.includes("activo") || q.includes("activos")) {
        return { intent: 'TOTAL_CLIENTES', parameters: { status: 'Activo' }, message: "Consultando clientes activos..." };
    }
    if (q.includes("suspendido") || q.includes("suspendidos") || q.includes("cortados")) {
        return { intent: 'TOTAL_CLIENTES', parameters: { status: 'Suspendido' }, message: "Consultando clientes suspendidos..." };
    }
    if (q.includes("cancelado") || q.includes("cancelados") || q.includes("cancelaron")) {
        return { intent: 'TOTAL_CLIENTES', parameters: { status: 'Cancelado' }, message: "Consultando clientes cancelados..." };
    }
    if (q.includes("pausado") || q.includes("pausados")) {
        return { intent: 'TOTAL_CLIENTES', parameters: { status: 'Pausado' }, message: "Consultando clientes pausados..." };
    }

    return {
        intent: 'UNKNOWN',
        parameters: {},
        message: null
    };
};

// Función para llamar a Gemini / OpenAI con Fallback Automático Resiliente
const callOpenAI = async (query, history, currentPage = "", userName = "") => {
    const apiKey = process.env.REACT_APP_GEMINI_API_KEY || process.env.REACT_APP_OPENAI_API_KEY;
    const context = pageKnowledge[currentPage] || null;

    if (!apiKey) {
        console.warn("No hay API Key configurada. Usando motor NLU local.");
        return parseQueryLocally(query, history, currentPage, userName);
    }

    try {
        const allSectionsContext = Object.entries(pageKnowledge).map(([path, info]) => {
            return `- **${info.name}** (Ruta: ${path}): ${info.description} Muestra: ${info.data}`;
        }).join('\n');

        let dynamicContextPrompt = `\nCONOCIMIENTO DE LAS SECCIONES DE LA APP:
Aquí tienes lo que hace cada parte del sistema:
${allSectionsContext}

Actualmente el usuario se encuentra en: "${context ? context.name : 'Desconocida'}".`;

        const todayDate = new Date().toLocaleDateString('en-CA');
        const systemPrompt = `NO DEBES INVENTAR DATOS NUMÉRICOS. Tu tarea es identificar la intención y parámetros técnicos para que el sistema busque la data real en Sisprot BI.

DEBES DEVOLVER UN JSON ESTRICTO:
{"intent": "NOMBRE_DEL_INTENT", "parameters": { "param_name": "param_value" }, "message": "Tu respuesta amable aquí"}

FECHA ACTUAL: ${todayDate}
${dynamicContextPrompt}

INTENCIONES DISPONIBLES:
- TOTAL_CLIENTES: Conteo de clientes por estado (status: Activo, Suspendido, Pausado, Cancelado).
- REACTIVADOS: Clientes reactivados de 34 (Cancelado) a 16 (Activo) desde 2026 (parameters: month, sector).
- ANALISIS_VENTAS: Ventas anuales, unidades e ingresos (parameters: year, month).
- COMPARAR_VENTAS: Comparación de ventas entre dos años (parameters: year, compareYear).
- INGRESOS_RECUPERABLES: Dinero pendiente de recuperar por clientes suspendidos (oportunidad USD).
- FUGA_CAPITAL: Dinero mensual perdido por clientes cancelados (bajas definitivas).
- SALUD_CARTERA: Porcentaje de clientes activos al día con su servicio.
- ARPU_METRICA: Ticket promedio o ingreso mensual por cliente activo.
- CHURN_METRICA: Tasa de baja / deserción de clientes.
- RECAUDACION_HISTORICA: Total acumulado histórico en estadísticas de Sisprot.
- RESUMEN_KPIS: Resumen ejecutivo del panel administrativo.
- EXPLICACION_REGLA: Diferencias conceptuales (ej: suspendido vs cancelado).
- INGRESOS_BANCOS: Cobros reales registrados en bancos (banco, metodo, startDate, endDate, periodo). Soporta cualquier fecha, día de la semana (ej: lunes de esta semana, martes, etc.), semana, mes (este mes, meses anteriores) o año. Si el usuario no menciona un banco particular (o dice 'en los bancos' / 'en el banco'), banco debe ser null (NUNCA poner 'todos' como banco). Si menciona un día o fecha específica, establece startDate y endDate en formato YYYY-MM-DD.
- INGRESOS: Dinero proyectado por planes de clientes activos.
- SECTOR_METRICAS: Métricas de un sector o urbanismo específico (parameters: urbanismo).
- RANKING_SECTORES: Sectores con más clientes o facturación.
- PLANES: Detalle y ranking por planes de internet.
- BUSCAR_CONTRATO / BUSCAR_CEDULA / BUSCAR_NOMBRE: Búsqueda de cliente específico.
- DATA_MAESTRA: Universo total de la base de datos.
- GENERAR_EXCEL: Descarga de archivo Excel.
- SALUDO / AGRADECIMIENTO / UNKNOWN.`;

        const recentHistory = history.slice(-5).map(msg => ({
            role: msg.sender === 'bot' ? 'model' : 'user',
            parts: [{ text: msg.text || "(Mostrando tarjeta de datos UI)" }]
        }));

        const contents = [
            ...recentHistory,
            { role: "user", parts: [{ text: query }] }
        ];

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemPrompt }] },
                contents: contents,
                generationConfig: {
                    temperature: 0.1,
                    responseMimeType: "application/json"
                }
            })
        });

        if (!response.ok) {
            console.warn(`Gemini API Error (HTTP ${response.status}). Activando NLU local determinístico.`);
            return parseQueryLocally(query, history, currentPage, userName);
        }

        const result = await response.json();
        if (result.error || !result.candidates || result.candidates.length === 0) {
            console.warn("Respuesta inválida de Gemini. Activando NLU local.");
            return parseQueryLocally(query, history, currentPage, userName);
        }

        const content = result.candidates[0].content.parts[0].text.trim();
        const parsed = JSON.parse(content);
        if (parsed.intent === 'UNKNOWN') {
            const localCheck = parseQueryLocally(query, history, currentPage, userName);
            if (localCheck.intent !== 'UNKNOWN') return localCheck;
        }
        return parsed;
    } catch (err) {
        console.warn("Excepción al consultar Gemini. Activando NLU local determinístico:", err.message);
        return parseQueryLocally(query, history, currentPage, userName);
    }
};


const getPlanesResponse = (filtroTxt, clientes) => {
    let titleSuffix = "Activos y Suspendidos";
    let validStatus = ["Activo", "Suspendido"];

    if (filtroTxt && filtroTxt.includes("activo") && !filtroTxt.includes("suspendido")) {
        validStatus = ["Activo"];
        titleSuffix = "Solo Activos";
    } else if (filtroTxt && filtroTxt.includes("suspendido") && !filtroTxt.includes("activo")) {
        validStatus = ["Suspendido"];
        titleSuffix = "Solo Suspendidos";
    }

    const planesData = clientes.reduce((acc, curr) => {
        if (validStatus.includes(curr.status_name)) {
            const planName = curr.plan?.name || 'Sin Plan';
            const planCost = parseFloat(curr.plan?.cost) || 0;

            if (!acc[planName]) {
                acc[planName] = {
                    name: planName,
                    count: 0,
                    cost: planCost,
                    revenue: 0,
                    category: planName.toUpperCase().includes("PYME") ? "PYME" : "RESIDENCIAL"
                };
            }
            acc[planName].count += 1;
            acc[planName].revenue += planCost;
        }
        return acc;
    }, {});

    const sortedPlanes = Object.values(planesData)
        .sort((a, b) => b.count - a.count);

    const topPlanes = sortedPlanes.slice(0, 5);

    const categoryStats = sortedPlanes.reduce((acc, curr) => {
        if (curr.category === "PYME") {
            acc.pymeRevenue += curr.revenue;
            acc.pymeCount += curr.count;
        } else {
            acc.residencialRevenue += curr.revenue;
            acc.residencialCount += curr.count;
        }
        acc.totalRevenue += curr.revenue;
        return acc;
    }, { pymeRevenue: 0, pymeCount: 0, residencialRevenue: 0, residencialCount: 0, totalRevenue: 0 });

    const statsArray = topPlanes.map(p => {
        const cleanName = p.name.replace(/RECURRENTE\s+/gi, "").replace(/PLAN\s+/gi, "").trim();
        return {
            label: cleanName,
            value: `${formatCurrency(p.revenue)}|(${p.count} cl. x ${p.cost} US$)`,
            color: p.category === "PYME" ? "#9b59b6" : "#3498db"
        };
    });

    // Añadir separador visual y resúmenes de categoría
    statsArray.push({ label: "──────────────────", value: "" });
    statsArray.push({ label: "Total Residencial", value: formatCurrency(categoryStats.residencialRevenue), color: "#3498db" });
    statsArray.push({ label: "Total PYME", value: formatCurrency(categoryStats.pymeRevenue), color: "#9b59b6" });
    statsArray.push({ label: "INGRESO TOTAL", value: formatCurrency(categoryStats.totalRevenue), color: "#00ff88" });

    return {
        text: `¡Claro! He generado el análisis financiero de planes para los clientes **${titleSuffix}**. Aquí tienes el desglose detallado de ingresos, costos y volumen:`,
        isCard: true,
        contextType: 'planes',
        cardData: {
            title: "Análisis Financiero de Planes",
            subtitle: `Corte: ${titleSuffix}`,
            color: "#9b59b6",
            stats: statsArray
        }
    };
};


// Función auxiliar para aplicar filtros comunes
const getFilteredDataset = (clientes, parameters, query = "") => {
    // 0. Soporte para Data Maestra (Sin filtros)
    if (parameters?.dataMaestra || normalizeText(query).includes("data maestra") || (normalizeText(query).includes("todo") && !parameters?.urbanismo && !parameters?.agencia && !parameters?.nombre)) {
        return { filtered: clientes, appliedTexts: ["Universo Total (Data Maestra)"] };
    }

    // REGLA: Filtrar por defecto solo Pymes y Residenciales (excluir empleados, institucional, etc.)
    let filtered = clientes.filter(c => {
        const type = normalizeText(c.client_subdivision || c.client_type_name || '');
        return type.includes('residencial') || type.includes('pyme');
    });
    let appliedTexts = [];

    // 0. Búsqueda Directa (Contrato, Cédula o Nombre) - NUEVO
    if (parameters?.contrato) {
        const nro = String(parameters.contrato);
        filtered = filtered.filter(c => String(c.id) === nro);
        appliedTexts.push(`Contrato: #${nro}`);
        if (filtered.length > 0) return { filtered, appliedTexts };
    }

    if (parameters?.cedula) {
        const ci = String(parameters.cedula).replace(/\D/g, '');
        filtered = filtered.filter(c => {
            const dbCi = String(c.client_identification || '').replace(/\D/g, '');
            return dbCi === ci;
        });
        appliedTexts.push(`Cédula: ${parameters.cedula}`);
        if (filtered.length > 0) return { filtered, appliedTexts };
    }

    if (parameters?.nombres || parameters?.nombre) {
        const names = parameters.nombres || [parameters.nombre];
        filtered = filtered.filter(c => {
            const dbName = normalizeText(c.client_name);
            return names.some(n => dbName.includes(normalizeText(n)));
        });
        appliedTexts.push(`Clientes: ${names.join(", ")}`);
    }

    // Pre-procesamiento: ¿Agencia es en realidad un Urbanismo?
    if (parameters?.agencia && !parameters?.urbanismo) {
        const matchedAsUrbanismo = findBestUrbanismoMatch(parameters.agencia);
        const isBaseAgency = /turmero|macaro|paya/i.test(normalizeText(parameters.agencia));
        if (matchedAsUrbanismo && !isBaseAgency) {
            parameters.urbanismo = parameters.agencia;
            delete parameters.agencia;
        }
    }

    // 1. Status
    if (parameters?.status && parameters.status !== 'Todos') {
        const statusParams = Array.isArray(parameters.status) ? parameters.status : [parameters.status];
        const normalizedStatus = statusParams.map(s => normalizeText(s));

        filtered = filtered.filter(c => {
            const allInfoStr = normalizeText(`${c.client_subdivision || ''} ${c.status_name || ''} `);
            return normalizedStatus.some(target => allInfoStr.includes(target));
        });

        appliedTexts.push(`Estado: ${statusParams.join(" y ")}`);
    } else if (parameters?.status === 'Todos') {
        appliedTexts.push(`Estado: Todos`);
    }

    // 2. Ciclo
    if (parameters?.ciclo) {
        const cicloReq = String(parameters.ciclo);
        filtered = filtered.filter(c => mapCycleValue(c.cycle, c) === cicloReq);
        appliedTexts.push(`Ciclo: ${cicloReq}`);
    }

    // 3. Agencia
    if (parameters?.agencia) {
        let ageReq = normalizeText(parameters.agencia).replace("agencia ", "").replace("nodo ", "").trim();
        let nodoBuscado = "";
        if (ageReq.includes("turmero")) nodoBuscado = "NODO TURMERO";
        else if (ageReq.includes("macaro") || ageReq.includes("mácaro")) nodoBuscado = "NODO MACARO";
        else if (ageReq.includes("paya")) nodoBuscado = "NODO PAYA";

        filtered = filtered.filter(c => {
            const p1 = normalizeText(c.agency_name || '').includes(ageReq) || normalizeText(c.client_agency || '').includes(ageReq);
            let p2 = false;
            if (c.sector_name && sectorAgenciaMap[c.sector_name]) {
                const mapUrb = normalizeText(sectorAgenciaMap[c.sector_name]);
                p2 = nodoBuscado ? sectorAgenciaMap[c.sector_name] === nodoBuscado : new RegExp(`(^|\\b|\\s)${ageReq}(\\b|\\s|$)`, 'i').test(mapUrb);
            }
            return p1 || p2;
        });
        appliedTexts.push(`Agencia: ${nodoBuscado ? nodoBuscado.replace('NODO ', '') : parameters.agencia}`);
    }

    // 4. Urbanismo
    if (parameters?.urbanismo) {
        // Soporte para múltiples urbanismos (Array, Comas o conjunción 'y')
        const urbParam = parameters.urbanismo;
        const urbList = Array.isArray(urbParam)
            ? urbParam
            : String(urbParam).split(/,| y /i).map(u => u.trim()).filter(u => u.length > 0);

        let finalFilter = [];
        let subSectorFilters = []; // Filtros especiales por dirección
        let labels = [];

        urbList.forEach(u => {
            const normU = normalizeText(u);

            // PRIORIDAD 0: ¿Es un sub-sector (barrio dentro de un sector)?
            if (subSectorMap[normU]) {
                subSectorFilters.push(subSectorMap[normU]);
                labels.push(subSectorMap[normU].label);
                return; // No lo procesamos como sector normal
            }

            // PRIORIDAD 1: ¿Tiene alias?
            const matchedSector = findBestUrbanismoMatch(u);
            if (matchedSector && !Array.isArray(matchedSector)) {
                finalFilter.push(matchedSector);
                labels.push(matchedSector);
            } else {
                const urbReq = normalizeText(u);
                finalFilter.push(urbReq); // Vago
                labels.push(u);
            }
        });

        // Filtrar y etiquetar por sub-sector para que el Excel los distinga
        if (finalFilter.length > 0 || subSectorFilters.length > 0) {
            filtered = filtered
                .filter(c => {
                    const sectorNorm = normalizeText(c.sector_name || '');
                    const addressNorm = normalizeText(c.address_tax || c.address || '');
                    const matchSector = finalFilter.some(f => c.sector_name === f || sectorNorm.includes(f));
                    const matchSubSector = subSectorFilters.some(sf =>
                        c.sector_name === sf.sectorPadre && addressNorm.includes(normalizeText(sf.keyword))
                    );
                    return matchSector || matchSubSector;
                })
                .map(c => {
                    // Si este cliente pertenece a un sub-sector, le ponemos una etiqueta especial
                    const addressNorm = normalizeText(c.address_tax || c.address || '');
                    const matchedSubSector = subSectorFilters.find(sf =>
                        c.sector_name === sf.sectorPadre && addressNorm.includes(normalizeText(sf.keyword))
                    );
                    if (matchedSubSector) {
                        // Clonamos el cliente con el sector visual correcto
                        return { ...c, _displaySector: matchedSubSector.label };
                    }
                    return c;
                });
        }
        appliedTexts.push(`Urbanismos: ${labels.join(", ")}`);
    }

    // 5. Tipo
    const extractTipo = (subdivision) => {
        if (!subdivision) return null;
        const partes = subdivision.split("_");
        if (partes.length >= 2 && partes[1]) return partes[1].toUpperCase();
        return null;
    };

    if (parameters?.tipo) {
        // Soporte para strings combinados ("Pyme y Residencial")
        let tipoParams = Array.isArray(parameters.tipo) ? parameters.tipo : [parameters.tipo];

        // Si hay un string con " y " o ",", lo dividimos en un array real
        if (tipoParams.length === 1 && typeof tipoParams[0] === 'string') {
            const raw = tipoParams[0].toLowerCase();
            if (raw.includes(" y ") || raw.includes(",")) {
                tipoParams = raw.split(/ y |,/).map(t => t.trim()).filter(t => t.length > 0);
            }
        }
        const normalizedReqs = tipoParams.map(t => normalizeText(t));

        filtered = filtered.filter(c => {
            let tipoCliente = null;
            if (c.client_subdivision) tipoCliente = extractTipo(c.client_subdivision);
            if (!tipoCliente && c.client_type_name) tipoCliente = c.client_type_name.trim().toUpperCase();
            if (!tipoCliente) tipoCliente = "OTROS";

            const rawClientType = normalizeText(tipoCliente);
            // Robustez: "pyme" debe marchar "pymes" y "residencial" debe marchar "residenciales"
            return normalizedReqs.some(req => {
                const r = req.includes('residencial') ? 'residencial' : (req.includes('pyme') ? 'pyme' : req);
                return rawClientType.includes(r);
            });
        });

        appliedTexts.push(`Tipo: ${tipoParams.map(t => t.toUpperCase()).join(" y ")}`);
    }

    // 6. Migrado
    if (parameters?.migrado) {
        const migradoReq = normalizeText(parameters.migrado);
        if (migradoReq.includes("no migrado")) {
            filtered = filtered.filter(c => !c.migrate);
            appliedTexts.push(`Categoría: No migrados`);
        } else if (migradoReq.includes("migrado")) {
            filtered = filtered.filter(c => c.migrate);
            appliedTexts.push(`Categoría: Migrados`);
        }
    }

    return { filtered, appliedTexts };
};

const getLastUpdateTime = () => {
    const now = new Date();
    const hrs = now.getHours();
    if (hrs < 8) return "ayer (4:00 PM)";
    if (hrs < 12) return "8:00 AM";
    if (hrs < 16) return "12:00 PM";
    return "4:00 PM";
};

export const processQuery = async (message, data, history = [], userName = "", currentPage = "", userRole = "admin") => {
    // 1. Cargar contratos en tiempo real desde la API oficial de Sisprot (misma fuente que Top Urbanismo y Resumen BI)
    let liveContracts = [];
    try {
        const contractsRes = await fetchContractsByStatus(["Todos"], false);
        if (contractsRes && contractsRes.results && contractsRes.results.length > 0) {
            liveContracts = contractsRes.results;
        }
    } catch (e) {
        console.warn("AiEngine: Error al obtener contratos en vivo desde contractService:", e);
    }

    // Usar prioritariamente los contratos en vivo de la API; si falla por red offline, usar data.results como respaldo
    let clientes = liveContracts.length > 0 ? liveContracts : (data?.results || []);

    if (!clientes || clientes.length === 0) {
        return { text: "Aún no tengo datos cargados para analizar. Por favor, asegúrate de haber iniciado sesión.", isCard: false };
    }

    const lastBotMsg = history.length > 0 ? history[history.length - 1] : null;
    let intent = null;
    let parameters = null;
    let fromClarification = false;
    let query = normalizeText(message);
    // --- DETECTOR DE PERIODO (Persistencia) ---
    const explicitlyHoy = query.includes("hoy") || query.includes("17");
    const explicitlyAyer = query.includes("ayer") || query.includes("16") || query.includes("de ayer");

    let isTodayQuery = true;
    let periodKnownFromHistory = false;

    if (explicitlyAyer) {
        isTodayQuery = false;
    } else if (explicitlyHoy) {
        isTodayQuery = true;
    } else {
        // MEMORIA A LARGO PLAZO: Buscamos en todo el historial disponible si ya se eligió un día
        const fullHistory = [...history].reverse();
        for (const msg of fullHistory) {
            if (msg.sender === 'bot' && msg.cardData?.periodPreference) {
                isTodayQuery = msg.cardData.periodPreference === "Hoy";
                periodKnownFromHistory = true;
                break;
            }
        }
    }

    let dataLabel = "En Vivo";
    const now = new Date();

    // --- DETECTOR DE RESPALDO (Force Detection for Reunion Sectors) ---
    // Si la IA no extrajo urbanismos pero el mensaje los tiene, los forzamos
    const knownSectors = Object.keys(sectorAgenciaMap);
    const mentionedSectors = knownSectors.filter(s => query.includes(normalizeText(s)));

    try {
        if (!fromClarification) {

            // --- INTERCEPTOR PRIORITARIO: "Cuántos contratos tiene [nombre]" ---
            // Este interceptor corre ANTES que todo para evitar que el contexto previo
            // haga que el bot muestre el último cliente visto en vez de buscar todos los contratos.
            const contractCountPatterns = [
                /cu[aá]ntos?\s+contratos?\s+(?:tiene|hay\s+(?:de|para))\s+(.+)/i,
                /cuantas?\s+cuentas?\s+(?:tiene|hay\s+(?:de|para))\s+(.+)/i,
                /contratos?\s+(?:de|tiene|para)\s+(.+)/i,
            ];
            let contractCountName = null;
            for (const pat of contractCountPatterns) {
                const m = message.match(pat);
                if (m && m[1]) { contractCountName = m[1].replace(/\s+y\s+dame\s+.*$/i, "").trim(); break; }
            }

            if (contractCountName && contractCountName.length >= 3) {
                // Limpieza: quitar "esta cedula:", "el cliente:", "al sr", etc.
                let cleanSearch = contractCountName.replace(/^(esta\s+cedula:?|esta\s+ci:?|el\s+cliente:?|la\s+cedula:?|identidad:?|cedula:?)\s*/i, "").trim();

                const nameNorm = normalizeText(cleanSearch);
                const isNumeric = /^\d+$/.test(cleanSearch.replace(/\D/g, ''));

                const matches = clientes.filter(c => {
                    const dbName = normalizeText(c.client_name);
                    const dbId = String(c.id);
                    const dbCi = String(c.client_identification || '').replace(/\D/g, '');

                    // Si es numérico, priorizamos ID o Cédula
                    if (isNumeric) {
                        const pureNum = cleanSearch.replace(/\D/g, '');
                        return dbId === pureNum || dbCi === pureNum || dbName.includes(nameNorm);
                    }
                    return dbName.includes(nameNorm);
                });

                if (matches.length === 0) {
                    registerUnansweredQuery(query, userName, currentPage);
                    return {
                        text: `Revisé la base de datos ${userName} y no encontré ningún registro asociado a **"${cleanSearch}"**. Puede ser que el nombre esté escrito diferente o que aún no esté cargado en el sistema. ¿Quieres que intente con otro nombre o número de cédula?`,
                        isCard: false
                    };
                }

                const nameDisplay = matches[0].client_name;
                const intro = matches.length === 1
                    ? `Claro ${userName}, revisé el sistema y **${nameDisplay}** tiene registrado **1 contrato** actualmente:`
                    : `Claro ${userName}, revisé el sistema y en la base de datos aparecen **${matches.length} contratos** a nombre de **${nameDisplay}**. Aquí los tienes:`;

                const listText = matches.map((m, i) =>
                    `${i + 1}) Contrato **#${m.id}** · ${m.status_name} · ${m.sector_name} · Plan: ${m.plan?.name || 'Sin plan'} ($${m.plan?.cost || 0})`
                ).join("\n");

                const closing = matches.length === 1
                    ? `¿Deseas ver el perfil completo de este contrato o lo exportamos al **Excel**?`
                    : `¿Quieres que te muestre el detalle de alguno en específico? Solo dime el número de la opción. También puedo generarte el **Excel** con todos ellos si lo prefieres.`;

                return {
                    text: `${intro}\n\n${listText}\n\n${closing}`,
                    isCard: true,
                    offerExcel: true,
                    contextType: 'multi_client_confirmed',
                    cardData: {
                        title: "Contratos Encontrados",
                        value: matches.length,
                        subtitle: `registros de ${nameDisplay}`,
                        color: "#3498db",
                        confirmedClients: matches,
                        savedDataset: matches,
                        filtersText: [`Nombre: ${nameDisplay}`],
                        parameters: { nombres: [contractCountName] }
                    }
                };
            }

            // --- 0. INTERCEPTOR LOCAL PARA MEMORIA DE CONTEXTO ESTRICTA ---
            if (history && history.length > 0) {
                const lastBotMsg = history.length >= 2 ? history[history.length - 2] : null;

                if (lastBotMsg && lastBotMsg.sender === 'bot') {
                    // Interceptor 1: Nombres múltiples
                    if (lastBotMsg.contextType === 'multiple_names' && lastBotMsg.cardData && lastBotMsg.cardData.term) {
                        const vaguePhrases = ["lista", "verlos", "cuales", "dime", "no se", "no recuerdo", "ni idea", "olvido", "muestrame"];
                        if (vaguePhrases.some(w => query.includes(w))) {
                            const terminoRaw = lastBotMsg.cardData.term;
                            const Matches = clientes.filter(c => normalizeText(c.client_name).includes(normalizeText(terminoRaw)));
                            const maxMatches = 10;
                            const listToShow = Matches.slice(0, maxMatches).map(c => `- ${c.client_name} (Contrato: #${c.id}, Sector: ${c.sector_name})`).join("\n");
                            const extraMsg = Matches.length > maxMatches ? `\n\n * (Y ${Matches.length - maxMatches} más...)* ` : "";

                            const nameToUse = userName ? ` ${userName}` : "";
                            return {
                                text: `¡No te preocupes${nameToUse}! Aquí tienes la lista detallada de los clientes que coinciden con "${terminoRaw}": \n\n${listToShow}${extraMsg} \n\nDime el número de contrato del que te interese.`,
                                isCard: false,
                                contextType: 'multiple_names',
                                cardData: { term: terminoRaw }
                            };
                        }
                    }

                    // Interceptor 2: Clarificación de estatus
                    if (lastBotMsg.contextType === 'clarify_status' && lastBotMsg.cardData) {
                        const lowerQuery = query.toLowerCase();
                        let chosenStatus = null;
                        if (lowerQuery.includes("activo")) chosenStatus = "Activo";
                        else if (lowerQuery.includes("suspendido")) chosenStatus = "Suspendido";
                        else if (lowerQuery.includes("pausado") || lowerQuery.includes("pausa")) chosenStatus = "Pausado";
                        else if (lowerQuery.includes("por instalar") || lowerQuery.includes("instalacion")) chosenStatus = "Por Instalar";
                        else if (lowerQuery.includes("cancelado") || lowerQuery.includes("cortado") || lowerQuery.includes("de baja")) chosenStatus = "Cancelado";
                        else if (lowerQuery.includes("todos") || lowerQuery.includes("total") || lowerQuery.includes("combinado")) chosenStatus = "Todos";

                        if (chosenStatus) {
                            const { originalIntent, savedParameters } = lastBotMsg.cardData;
                            intent = originalIntent;
                            const newParams = { ...savedParameters, status: chosenStatus };
                            parameters = newParams;
                            fromClarification = true;
                        }
                    }

                    if (lastBotMsg.contextType === 'clarify_cycle' && lastBotMsg.cardData) {
                        const reqCycle = query.includes("15") ? "15" : query.includes("30") ? "30" : null;
                        if (reqCycle) {
                            const { originalIntent, savedParameters } = lastBotMsg.cardData;
                            intent = originalIntent;
                            parameters = { ...savedParameters, ciclo: reqCycle };
                            fromClarification = true;
                        }
                    }

                    // Interceptor 3: Clarificación de urbanismo
                    if (lastBotMsg.contextType === 'clarify_urbanismo' && lastBotMsg.cardData) {
                        const matched = findBestUrbanismoMatch(query);
                        // Si el usuario escribió algo que ahora sí da un match único (ej: puso el "I")
                        if (matched && !Array.isArray(matched)) {
                            const { originalIntent, savedParameters } = lastBotMsg.cardData;
                            intent = originalIntent;
                            parameters = { ...savedParameters, urbanismo: matched };
                            fromClarification = true;
                        }
                    }

                    // Interceptor 4: Clarificación de métrica (Total vs Ingresos)
                    if (lastBotMsg.contextType === 'clarify_metric' && lastBotMsg.cardData) {
                        const normQuery = query.toLowerCase();
                        const { savedParameters } = lastBotMsg.cardData;

                        if (normQuery.includes("total") || normQuery.includes("cuantos") || normQuery.includes("clientes")) {
                            intent = 'TOTAL_CLIENTES';
                            parameters = savedParameters;
                            fromClarification = true;
                        } else if (normQuery.includes("ingreso") || normQuery.includes("plata") || normQuery.includes("dinero") || normQuery.includes("venta")) {
                            intent = 'INGRESOS';
                            parameters = savedParameters;
                            fromClarification = true;
                        } else if (normQuery.includes("ambos") || normQuery.includes("los dos") || normQuery.includes("todo")) {
                            intent = 'AMBOS_METRICAS';
                            parameters = savedParameters;
                            fromClarification = true;
                        }
                    }

                    // Interceptor: Clarificación de origen de ingresos (Proyectado vs Bancos)
                    if (lastBotMsg.contextType === 'clarify_revenue_type' && lastBotMsg.cardData) {
                        const normQuery = query.toLowerCase();
                        const { savedParameters } = lastBotMsg.cardData;

                        if (normQuery.includes("banco") || normQuery.includes("recauda") || normQuery.includes("cobro") || normQuery.includes("real")) {
                            intent = 'INGRESOS_BANCOS';
                            parameters = savedParameters;
                            fromClarification = true;
                        } else if (normQuery.includes("factura") || normQuery.includes("proyecta") || normQuery.includes("plan")) {
                            intent = 'INGRESOS';
                            parameters = savedParameters;
                            fromClarification = true;
                        }
                    }

                    // Interceptor 5: Aceptación de Excel (Preguntar Columnas para Detalle)
                    if (lastBotMsg.offerExcel && (query.includes("si") || query.includes("claro") || query.includes("favor") || query.includes("generalo") || query.includes("descargar"))) {
                        const colsList = "Contrato, Cliente, Teléfono, Dirección, Urbanismo, Estatus, IP, MAC, Plan...";
                        return {
                            text: `¡Dicho y hecho ${userName}! Para la pestaña de **Detalle**, ¿qué columnas deseas incluir? \n\n(Dime "Todas" para el reporte completo o menciona las que necesites).`,
                            isCard: false,
                            contextType: 'clarify_excel_columns',
                            cardData: {
                                savedDataset: lastBotMsg.cardData?.dataset || lastBotMsg.cardData?.savedDataset,
                                savedFiltersText: lastBotMsg.cardData?.filtersText || ["Selección previa"]
                            }
                        };
                    }

                    // Interceptor 6: Selección de Columnas (Ahora descarga el Ejecutivo con esas columnas)
                    if (lastBotMsg.contextType === 'clarify_excel_columns' && lastBotMsg.cardData) {
                        const reqCols = query.toLowerCase();
                        const availableColsMap = {
                            "contrato": "Contrato", "nro": "Contrato", "id": "Contrato",
                            "cliente": "Cliente", "nombre": "Cliente",
                            "telefono": "Teléfono", "telfo": "Teléfono", "telf": "Teléfono", "celular": "Teléfono", "movil": "Teléfono",
                            "direccion": "Dirección", "ubicacion": "Dirección", "dir": "Dirección",
                            "urbanismo": "Urbanismo", "sector": "Urbanismo", "zona": "Urbanismo",
                            "estatus": "Estatus", "estado": "Estatus",
                            "dias": "Días Hábiles", "tiempo": "Días Hábiles",
                            "tipo": "Tipo_Cliente", "categoria": "Tipo_Cliente", "esquema": "Tipo_Cliente",
                            "plan": "Plan", "paquete": "Plan", "renta": "Plan",
                            "costo": "Costo", "precio": "Costo", "valor": "Costo",
                            "ip": "IP", "mac": "MAC", "ciclo": "Ciclo", "migrado": "Migrado",
                            "cedula": "Cedula", "identidad": "Cedula", "dni": "Cedula",
                            "interface": "Interface", "vlan": "Interface", "red": "Interface",
                            "fecha": "Fecha_Creación", "creado": "Fecha_Creación"
                        };

                        let matchedCols = [];
                        if (reqCols.includes("toda") || reqCols.includes("todo") || reqCols.includes("completo")) {
                            matchedCols = ["Todas"];
                        } else {
                            Object.keys(availableColsMap).forEach(key => {
                                if (reqCols.includes(key)) {
                                    if (!matchedCols.includes(availableColsMap[key])) {
                                        matchedCols.push(availableColsMap[key]);
                                    }
                                }
                            });
                        }

                        if (matchedCols.length === 0) {
                            matchedCols = ["Todas"];
                        }

                        const { savedDataset, savedFiltersText } = lastBotMsg.cardData;
                        return {
                            text: `¡Excelente selección ${userName}! Generando tu **Reporte Ejecutivo** con las columnas elegidas en la pestaña de detalle...`,
                            isCard: false,
                            action: 'download_excel_executive',
                            cardData: {
                                selectedColumns: matchedCols,
                                dataset: savedDataset,
                                filtersText: savedFiltersText
                            }
                        };
                    }

                    // Interceptor 7: Clarificación de Múltiples Clientes
                    if (lastBotMsg.contextType === 'multi_client_clarification' && lastBotMsg.cardData) {
                        const normQuery = query.toLowerCase();
                        const currentMatches = lastBotMsg.cardData.currentMatches;
                        const contractMatch = query.match(/\b(\d{4,6})\b/);
                        const matchedByContract = contractMatch ? currentMatches.find(m => String(m.id).includes(contractMatch[0])) : null;
                        const optionMatch = query.match(/\b([1-9]|10)\b/);
                        const choiceIdx = optionMatch ? parseInt(optionMatch[0]) - 1 : -1;
                        const isNewSearch = contractMatch && !matchedByContract;
                        const isComplex = normQuery.split(" ").length > 3;

                        if (!isNewSearch && !isComplex) {
                            const { currentName, pendingNames = [], confirmedClients = [] } = lastBotMsg.cardData;
                            const updatedConfirmed = [...confirmedClients];
                            let updatedPending = [...pendingNames];
                            let nextName = null;
                            let nextMatches = [];

                            if (matchedByContract) updatedConfirmed.push(matchedByContract);
                            else if (choiceIdx >= 0 && currentMatches && currentMatches[choiceIdx]) updatedConfirmed.push(currentMatches[choiceIdx]);
                            else if (normQuery.includes("saltar") || normQuery.includes("ninguno")) { /* salta */ }
                            else if (currentMatches && currentMatches.length > 0) {
                                return {
                                    text: `Disculpa ${userName}, esa opción no me figura para **${currentName}**. ¿Podrías indicarme el número correcto?\n\nSi quieres buscar otro contrato distinto, dímelo directamente.`,
                                    isCard: false,
                                    contextType: 'multi_client_clarification',
                                    cardData: lastBotMsg.cardData
                                };
                            }

                            while (updatedPending.length > 0) {
                                const nameToProcess = updatedPending.shift();
                                const matches = clientes.filter(c => normalizeText(c.client_name).includes(normalizeText(nameToProcess)));
                                if (matches.length === 1) updatedConfirmed.push(matches[0]);
                                else if (matches.length > 1) { nextName = nameToProcess; nextMatches = matches; break; }
                            }

                            if (nextName) {
                                const optionsList = nextMatches.map((m, i) => `${i + 1}) **${m.client_name}** (#${m.id}, ${m.sector_name})`).join("\n");
                                return {
                                    text: `Para **${nextName}** encontré ${nextMatches.length} registros. ¿Cuál incluyo?\n\n${optionsList}`,
                                    isCard: false,
                                    contextType: 'multi_client_clarification',
                                    cardData: { pendingNames: updatedPending, confirmedClients: updatedConfirmed, currentName: nextName, currentMatches: nextMatches }
                                };
                            } else if (updatedConfirmed.length > 0) {
                                const cliente = updatedConfirmed[updatedConfirmed.length - 1];
                                return {
                                    text: `¡Listo ${userName}! Detalle de **${cliente.client_name}** (#${cliente.id}).\n\nGuardado junto a los otros ${updatedConfirmed.length} contratos. ¿Deseas buscar más o **descargamos el Excel**?`,
                                    isCard: true,
                                    contextType: 'multi_client_confirmed',
                                    cardData: {
                                        title: cliente.client_name,
                                        subtitle: `${cliente.sector_name} | #${cliente.id}`,
                                        stats: [
                                            { label: "Estado", value: cliente.status_name },
                                            { label: "Plan", value: cliente.plan?.name },
                                            { label: "ID", value: cliente.client_identification }
                                        ],
                                        confirmedClients: updatedConfirmed,
                                        rawData: cliente,
                                        dataset: updatedConfirmed,
                                        filtersText: ["Búsqueda múltiple"]
                                    }
                                };
                            }
                        }
                    }

                    // Interceptor 8: Confirmación de lista personalizada
                    if (lastBotMsg.contextType === 'multi_client_confirmed' && lastBotMsg.cardData) {
                        const normQ = query.toLowerCase();
                        if (!normQ.includes("otro") && (normQ.includes("excel") || normQ.includes("si") || normQ.includes("proceder"))) {
                            return {
                                text: `¡Entendido! Generando Excel para los seleccionados. **¿Qué columnas incluyo?**\n\n(Escribe "Todas" o los nombres de las columnas)`,
                                isCard: false,
                                contextType: 'clarify_excel_columns',
                                cardData: { savedDataset: lastBotMsg.cardData.confirmedClients, savedFiltersText: ["Lista Personalizada"] }
                            };
                        }
                    }
                }
            }

            // --- LLAMADA PRINCIPAL A IA ---
            if (!fromClarification) {
                const openAIResult = await callOpenAI(message, history, currentPage, userName);
                intent = openAIResult.intent;
                parameters = openAIResult.parameters || {};

                // Sanitización
                ['ciclo', 'urbanismo', 'tipo', 'agencia'].forEach(key => {
                    if (parameters[key] && typeof parameters[key] === 'string') {
                        const val = parameters[key].toLowerCase();
                        if (val.includes('ayer') || val.includes('hoy') || val.includes('16') || val.includes('17')) delete parameters[key];
                    }
                });

                // Fallback sectores
                if ((!parameters.urbanismo || (Array.isArray(parameters.urbanismo) && parameters.urbanismo.length === 0)) && mentionedSectors.length > 0) {
                    parameters.urbanismo = mentionedSectors;
                    if (intent === 'UNKNOWN' || intent === 'SALUDO') intent = 'AMBOS_METRICAS';
                }

                // Fallback Periodo (Seguridad si la IA lo omite)
                if (query.toLowerCase().includes("ayer") && !parameters.periodo && !parameters.startDate) {
                    parameters.periodo = "ayer";
                } else if (query.toLowerCase().includes("hoy") && !parameters.periodo && !parameters.startDate) {
                    parameters.periodo = "hoy";
                }

                // Interceptor de Periodo deshabilitado para permitir respuestas directas con el día de hoy por defecto.

            }
        }

        // --- 2. EJECUCIÓN DE LOGICA (POST-IA & INTERCEPTORES) ---
        switch (intent) {
            case 'SALUDO': {
                const hour = new Date().getHours();
                let timeGreeting = "Hola";
                if (hour >= 5 && hour < 12) timeGreeting = "Buenos días";
                else if (hour >= 12 && hour < 19) timeGreeting = "Buenas tardes";
                else timeGreeting = "Buenas noches";

                const nameToUse = userName ? ` ${userName}` : "";

                const variations = [
                    `¡${timeGreeting}${nameToUse}! Un gusto saludarte. ¿Qué dato del negocio buscamos hoy?`,
                    `¡${timeGreeting}${nameToUse}! Qué gusto verte de nuevo. ¿En qué te puedo asistir con las métricas?`,
                    `¡${timeGreeting}${nameToUse}! Qué bueno saludarte. ¿Consultamos algún urbanismo o ingreso?`,
                    `¡${timeGreeting}${nameToUse}! Un placer saludarte. Dime, ¿qué información necesitas de la base de datos?`,
                    `¡${timeGreeting}${nameToUse}! Estoy listo para ayudarte con tus consultas analíticas.`
                ];

                const randomGreeting = variations[Math.floor(Math.random() * variations.length)];

                return {
                    text: randomGreeting,
                    isCard: false
                };
            }

            case 'AGRADECIMIENTO':
                const nameToUseAck = userName ? ` ${userName}` : "";
                return {
                    text: `¡De nada${nameToUseAck}! Siempre a la orden. Si necesitas algo más, solo escríbeme.`,
                    isCard: false
                };

            case 'GUIA_APP':
                return {
                    text: `¡Por supuesto ${userName}! Esta plataforma es el panel de control maestro. Aquí tienes un resumen de cada sección del menú principal: \n\n` +
                        `📊 **Indicadores**: Un panel general con gráficas y KPIs esenciales como clientes totales, activos, tipos y proyecciones.\n` +
                        `🏘️ **Top Urbanismos**: Te muestra en detalle cuáles son los sectores geográficos que más aportan clientes e ingresos.\n` +
                        `📋 **Lista de Clientes**: Una tabla robusta donde puedes ver a cada cliente, su Plan, Costo y Teléfono de contacto.\n` +
                        `💼 **Operaciones (Ventas)**: Un módulo destinado a registrar instalaciones nuevas, cobros y monitoreo del personal.\n` +
                        `📈 **Adm. Ingresos**: Sección financiera para balances detallados.\n` +
                        `**Assistant AI (Yo)**: Tu asistente personal lógico para consultar toda esta data.`,
                    isCard: false
                };

            case 'CONTEXTO_APP': {
                // Si por alguna razón no vino el mensaje de la IA, usamos el fallback humano (pero con tus palabras)
                let contextKey = Object.keys(pageKnowledge).find(k => currentPage.toLowerCase().includes(k.toLowerCase()));
                const context = contextKey ? pageKnowledge[contextKey] : null;

                if (!context) return { text: "Aquí solo usuarios autorizados pueden ver las métricas. ¿En qué te ayudo?", isCard: false };

                return {
                    text: `¡Claro ${userName}! Estamos en **${context.name}**. Básicamente ${context.description} Aquí puedes ver ${context.data}. ${context.guide}`,
                    isCard: false
                };
            }

            case 'TOTAL_CLIENTES':
            case 'ESTADOS':
            case 'TIPOS_CLIENTE': {
                // Prioridad 0: Filtrado Unificado (Soporta nombres y contratos)
                const { filtered, appliedTexts } = getFilteredDataset(clientes, parameters, message);
                let filteredClientes = filtered;
                let appliedFiltersText = appliedTexts;

                // 1. Desglose automático de Estado si no se especificó estatus ni filtros específicos
                const isDataMaestra = parameters?.dataMaestra || appliedFiltersText.includes("Universo Total (Data Maestra)");
                const statusNotSpecified = !isDataMaestra && !parameters?.status && !parameters?.nombre && !parameters?.nombres && !parameters?.contrato && intent !== 'ESTADOS' && intent !== 'TIPOS_CLIENTE';

                if (statusNotSpecified) {
                    const counts = filteredClientes.reduce((acc, c) => {
                        const st = c.status_name || 'Otros';
                        acc[st] = (acc[st] || 0) + 1;
                        return acc;
                    }, {});

                    const activeCount = filteredClientes.filter(c => c.status_name === "Activo").length;

                    const statsArray = [
                        { label: "🟢 Activos", value: counts.Activo || 0, color: "#2ecc71" },
                        { label: "🟡 Suspendidos", value: counts.Suspendido || 0, color: "#f1c40f" },
                        { label: "🔴 Cancelados", value: counts.Cancelado || 0, color: "#e74c3c" }
                    ];
                    if (counts.Pausado) {
                        statsArray.push({ label: "🔵 Pausados", value: counts.Pausado, color: "#3498db" });
                    }

                    return {
                        text: `Claro ${userName}, en la zona consultada (${appliedFiltersText.join(", ") || "General"}) he encontrado un total de **${filteredClientes.length}** clientes, de los cuales **${activeCount}** están activos.\n\nAquí tienes el desglose completo de estatus:`,
                        isCard: true,
                        cardData: {
                            periodPreference: isTodayQuery ? "Hoy" : yesterdayLabel,
                            title: `Clientes: ${appliedFiltersText.join(" | ") || "General"}`,
                            value: filteredClientes.length,
                            subtitle: "Clientes totales (todos los estatus)",
                            color: "#3498db",
                            stats: statsArray,
                            parameters: parameters,
                            savedDataset: filteredClientes,
                            filtersText: [...appliedFiltersText, "Todos los estatus"]
                        }
                    };
                }

                // Si se usó getFilteredDataset, ya tenemos el resultado base. 
                // Solo mantenemos la lógica de clarificación de urbanismo si no hubo match único arriba.
                if (parameters?.urbanismo && !appliedFiltersText.some(t => t.includes("Urbanismo:"))) {
                    const matchedSector = findBestUrbanismoMatch(parameters.urbanismo);
                    if (Array.isArray(matchedSector)) {
                        return {
                            text: `He encontrado varios sectores similares. ¿A cuál te refieres?\n\n` +
                                matchedSector.map(s => `- **${s}**`).join('\n') +
                                `\n\nPor favor, dime el nombre exacto del que te interese.`,
                            isCard: false,
                            contextType: 'clarify_urbanismo',
                            cardData: { originalIntent: intent, savedParameters: parameters }
                        };
                    }
                }

                const isTipoIntent = intent === 'TIPOS_CLIENTE' || parameters?.tipo;
                // If asking for types specifically and filters applied (or it's the original intent)
                if (isTipoIntent || intent === 'ESTADOS' || intent === 'TOTAL_CLIENTES') {
                    // If a specific type or status was requested, give direct result
                    if (appliedFiltersText.length > 0) {
                        // CASO: Desglose Dinámico por Tipos (Ej: Residencial + Empleado + Pyme)
                        let tipoParams = Array.isArray(parameters?.tipo) ? parameters.tipo : (parameters?.tipo ? [parameters.tipo] : []);

                        // Normalización: si es un string compuesto, lo dividimos
                        if (tipoParams.length === 1 && typeof tipoParams[0] === 'string') {
                            const raw = tipoParams[0].toLowerCase();
                            if (raw.includes(" y ") || raw.includes(",")) {
                                tipoParams = raw.split(/ y |,/).map(t => t.trim()).filter(t => t.length > 0);
                            }
                        }

                        const isMultipleTypes = tipoParams.length > 1;

                        if (isMultipleTypes && (intent === 'TOTAL_CLIENTES' || intent === 'TIPOS_CLIENTE')) {
                            const statusLabel = parameters?.status ? (Array.isArray(parameters.status) ? parameters.status.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(" y ") : parameters.status.charAt(0).toUpperCase() + parameters.status.slice(1)) : "Clientes";
                            const formatCurrencyLoc = (val) => {
                                const formatted = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val || 0);
                                return `${formatted} US$`;
                            };

                            const statsByType = tipoParams.map(t => {
                                const subDataset = filteredClientes.filter(c => {
                                    const clientType = normalizeText(c.client_subdivision || c.client_type_name || 'OTROS');
                                    return clientType.includes(normalizeText(t));
                                });
                                const revenue = subDataset.reduce((acc, curr) => acc + parseFloat(curr.plan?.cost || 0), 0);

                                // Asignar colores por tipo
                                let color = "#bdc3c7";
                                const tNorm = normalizeText(t);
                                if (tNorm.includes("pyme")) color = "#9b59b6";
                                else if (tNorm.includes("residencial")) color = "#3498db";
                                else if (tNorm.includes("empleado")) color = "#2ecc71";

                                return { label: t.charAt(0).toUpperCase() + t.slice(1).toLowerCase(), value: `${subDataset.length} (${formatCurrencyLoc(revenue)})`, color, rawRevenue: revenue };
                            });

                            const totalRevenue = statsByType.reduce((a, b) => a + b.rawRevenue, 0);

                            const cardTitle = dataLabel.startsWith("Hoy") ? `Dashboard de ${statusLabel}` : `Dashboard (${dataLabel})`;
                            return {
                                text: `**${userName}**, aquí tienes el balance detallado por tipo para los clientes **${statusLabel}** de tu consulta:\n\n` +
                                    statsByType.map(s => `• **${s.label}**: ${s.value}`).join("\n") +
                                    `\n\nEl total general es de **${filteredClientes.length}** clientes con una facturación proyectada de **${formatCurrencyLoc(totalRevenue)}**.`,
                                isCard: true,
                                cardData: {
                                    periodPreference: isTodayQuery ? "Hoy" : yesterdayLabel,
                                    title: cardTitle,
                                    value: filteredClientes.length,
                                    subtitle: appliedFiltersText.join(" | "),
                                    color: "#3498db",
                                    stats: statsByType,
                                    parameters: parameters,
                                    savedDataset: filteredClientes,
                                    filtersText: appliedFiltersText
                                }
                            };
                        }

                        // CASO: Desglose por múltiples estados (Ej: Activos y Suspendidos)
                        const statusParams = Array.isArray(parameters.status) ? parameters.status : [parameters.status];
                        const showBreakdown = statusParams.length > 1;

                        if (showBreakdown) {
                            const statsByStatus = statusParams.map(s => {
                                const count = filteredClientes.filter(c => normalizeText(c.status_name).includes(normalizeText(s))).length;
                                // Color basado en el estado
                                let color = "#bdc3c7";
                                if (normalizeText(s).includes("activo")) color = "#2ecc71";
                                else if (normalizeText(s).includes("suspendido")) color = "#f1c40f";
                                else if (normalizeText(s).includes("cancelado")) color = "#e74c3c";
                                else if (normalizeText(s).includes("pausado")) color = "#3498db";

                                return { label: s, value: count, color };
                            });

                            return {
                                text: `Claro ${userName}, aquí tienes el desglose detallado por estado según tu consulta: \n(${appliedFiltersText.join(', ')})\n\n¿Quieres que profundicemos en alguno o exportamos el **Excel**?`,
                                isCard: true,
                                cardData: {
                                    periodPreference: isTodayQuery ? "Hoy" : yesterdayLabel,
                                    title: "Distribución por Estado",
                                    value: filteredClientes.length,
                                    subtitle: "Clientes totales en la selección",
                                    color: "#3498db",
                                    stats: statsByStatus,
                                    parameters: parameters,
                                    savedDataset: filteredClientes,
                                    filtersText: appliedFiltersText
                                }
                            };
                        }

                        const hasSpecificType = parameters?.tipo || appliedFiltersText.some(t => t.includes("Tipo:"));
                        const finalAppliedLabel = hasSpecificType ? appliedFiltersText.join(', ') : `${appliedFiltersText.join(', ')} | Pyme y Residencial`;

                        const percentOfTotal = clientes.length > 0 ? ((filteredClientes.length / clientes.length) * 100).toFixed(1) : 0;
                        const statusNameShow = parameters?.status || "Activo";

                        return {
                            text: `Actualmente hay **${filteredClientes.length}** clientes **${String(statusNameShow).toLowerCase()}s** de un total de **${clientes.length}** clientes registrados en Sisprot BI, equivalente al **${percentOfTotal}%** de la cartera.\n\nFiltros aplicados: ${finalAppliedLabel.trim()}. Consulta actualizada con los datos disponibles del sistema.`,
                            isCard: true,
                            cardData: {
                                periodPreference: isTodayQuery ? "Hoy" : yesterdayLabel,
                                title: `Clientes ${statusNameShow}s`,
                                value: filteredClientes.length,
                                subtitle: `${percentOfTotal}% del total (${clientes.length} contratos)`,
                                color: String(statusNameShow).toLowerCase().includes("activo") ? "#2ecc71" : String(statusNameShow).toLowerCase().includes("suspendido") ? "#f1c40f" : "#e74c3c",
                                stats: [
                                    { label: `Total ${statusNameShow}s`, value: filteredClientes.length, color: String(statusNameShow).toLowerCase().includes("activo") ? "#2ecc71" : "#f1c40f" },
                                    { label: "Cartera General", value: clientes.length, color: "#00d2ff" },
                                    { label: "Porcentaje", value: `${percentOfTotal}%`, color: "#a855f7" }
                                ],
                                parameters: parameters,
                                savedDataset: filteredClientes,
                                filtersText: appliedFiltersText
                            }
                        };
                    } else if (intent === 'ESTADOS') {
                        const conteoEstados = clientes.reduce((acc, curr) => {
                            const estado = curr.status_name || 'Desconocido';
                            acc[estado] = (acc[estado] || 0) + 1;
                            return acc;
                        }, {});

                        const statsArray = Object.entries(conteoEstados)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 4)
                            .map(([estado, count]) => ({
                                label: estado,
                                value: count,
                                color: estado === 'Activo' ? '#2ecc71' : estado === 'Suspendido' ? '#f1c40f' : estado === 'Cancelado' ? '#e74c3c' : '#bdc3c7'
                            }));

                        return {
                            text: `Mira ${userName}, esta es la vista satelital actual del estado o condición técnica de tus clientes:`,
                            isCard: true,
                            cardData: {
                                title: "Estatus General",
                                stats: statsArray
                            }
                        };
                    } else {
                        // Distribución de tipos sin filtro
                        const extractTipo = (subdivision) => {
                            if (!subdivision) return null;
                            const partes = subdivision.split("_");
                            if (partes.length >= 2 && partes[1]) return partes[1].toUpperCase();
                            return null;
                        };

                        const conteoTipos = clientes.reduce((acc, curr) => {
                            if (curr.status_name === "Activo" || curr.status_name === "Suspendido") {
                                let tipo = null;
                                if (curr.client_subdivision) tipo = extractTipo(curr.client_subdivision);
                                if (!tipo && curr.client_type_name) tipo = curr.client_type_name.trim().toUpperCase();
                                if (!tipo) tipo = "OTROS";

                                acc[tipo] = (acc[tipo] || 0) + 1;
                            }
                            return acc;
                        }, {});

                        let statsArray = Object.entries(conteoTipos)
                            .sort((a, b) => b[1] - a[1])
                            .map(([tipo, count]) => ({
                                label: tipo,
                                value: count,
                                color: tipo === 'PYME' ? '#9b59b6' : tipo === 'RESIDENCIAL' ? '#3498db' : '#ecf0f1'
                            }));

                        return {
                            text: "Aquí la distribución por esquema comercial (Todos):",
                            isCard: true,
                            cardData: {
                                title: "Tipos de Cliente",
                                stats: statsArray
                            }
                        };
                    }
                }
                break;
            }

            case 'INGRESOS': {
                // Prioridad 0: Filtrado Unificado
                const { filtered, appliedTexts } = getFilteredDataset(clientes, parameters, message);
                let filteredClientes = filtered;
                let appliedFiltersText = appliedTexts;

                // 1. Desglose automático de Ingresos si no se especificó estatus ni filtros específicos
                const isDataMaestraIng = parameters?.dataMaestra || appliedFiltersText.includes("Universo Total (Data Maestra)");
                const statusNotSpecifiedIng = !isDataMaestraIng && !parameters?.status && !parameters?.nombre && !parameters?.nombres && !parameters?.contrato;

                if (statusNotSpecifiedIng) {
                    const activeClients = filteredClientes.filter(c => c.status_name === "Activo");
                    const suspendedClients = filteredClientes.filter(c => c.status_name === "Suspendido");
                    const cancelledClients = filteredClientes.filter(c => c.status_name === "Cancelado");

                    const activeRevenue = activeClients.reduce((acc, curr) => acc + parseFloat(curr.plan?.cost || 0), 0);
                    const suspendedRevenue = suspendedClients.reduce((acc, curr) => acc + parseFloat(curr.plan?.cost || 0), 0);
                    const cancelledRevenue = cancelledClients.reduce((acc, curr) => acc + parseFloat(curr.plan?.cost || 0), 0);

                    const totalRevenue = activeRevenue + suspendedRevenue + cancelledRevenue;

                    statsFinancial = [
                        { label: "🟢 Activos (Facturación)", value: formatCurrency(activeRevenue), color: "#2ecc71" },
                        { label: "🟡 Suspendidos (Cartera)", value: formatCurrency(suspendedRevenue), color: "#f1c40f" },
                        { label: "🔴 Cancelados (Sin cobrar)", value: formatCurrency(cancelledRevenue), color: "#e74c3c" }
                    ];

                    return {
                        text: `Claro ${userName}, he calculado los ingresos mensuales proyectados para la selección (${appliedFiltersText.join(", ") || "General"}). Aquí tienes el balance detallado por estado:`,
                        isCard: true,
                        cardData: {
                            periodPreference: isTodayQuery ? "Hoy" : yesterdayLabel,
                            title: "Balance de Facturación",
                            value: formatCurrency(activeRevenue),
                            subtitle: `Solo Activos (Total general: ${formatCurrency(totalRevenue)})`,
                            color: "#2ecc71",
                            stats: statsFinancial,
                            parameters: parameters,
                            savedDataset: filteredClientes,
                            filtersText: [...appliedFiltersText, "Desglose de Ingresos"]
                        }
                    };
                }

                // Los filtros de Ciclo, Agencia, Urbanismo, Tipo y Migrado ya vienen de getFilteredDataset arriba.
                const ingresosTotales = filteredClientes.reduce((acc, curr) => acc + parseFloat(curr.plan?.cost || 0), 0);
                const clientesCount = filteredClientes.length;

                // CASO: Desglose financiero por estado (Recuperado vs Pendiente)
                const statusParamsIngresos = Array.isArray(parameters.status) ? parameters.status : [parameters.status];
                const showFinancialBreakdown = statusParamsIngresos.length > 1;
                let statsFinancial = [];

                if (showFinancialBreakdown) {
                    statsFinancial = statusParamsIngresos.map(s => {
                        const subDataset = filteredClientes.filter(c => normalizeText(c.status_name).includes(normalizeText(s)));
                        const amount = subDataset.reduce((acc, curr) => acc + parseFloat(curr.plan?.cost || 0), 0);

                        let label = s;
                        let color = "#bdc3c7";
                        if (normalizeText(s).includes("activo")) { label = "Recuperado (Activos)"; color = "#2ecc71"; }
                        else if (normalizeText(s).includes("suspendido")) { label = "Pendiente (Susp.)"; color = "#f1c40f"; }

                        return { label, value: formatCurrency(amount), color };
                    });
                }

                const introText = appliedFiltersText.length > 1
                    ? `¡Perfecto ${userName}! He calculado los **ingresos mensuales proyectados** aplicando los filtros solicitados: \n(${appliedFiltersText.join(', ')})\n\n**Note: Este monto es la suma de los planes proyectados de estos clientes.**`
                    : `¡Claro ${userName}! He calculado los **ingresos mensuales proyectados** basados en tu consulta: \n\n**Note: Este valor se obtiene sumando los costos de los planes actuales de los clientes en tu base de datos.**`;

                return {
                    text: introText + "\n\n**Si necesitas descargar el listado oficial en Excel, solo pídeme el reporte.**",
                    isCard: true,
                    cardData: {
                        title: showFinancialBreakdown ? "Balance de Ingresos" : "Ingresos Proyectados",
                        value: formatCurrency(ingresosTotales),
                        subtitle: appliedFiltersText.join(" | "), // Dinámico
                        color: "#f1c40f",
                        stats: statsFinancial,
                        parameters: parameters,
                        savedDataset: filteredClientes,
                        filtersText: appliedFiltersText
                    }
                };
            }

            case 'COMPARAR_VENTAS': {
                try {
                    const year1 = parameters?.year ? String(parameters.year) : "2026";
                    const year2 = parameters?.compareYear ? String(parameters.compareYear) : (year1 === "2026" ? "2025" : "2026");

                    const sales = await getSalesMetrics({ year: year1, compareYear: year2 });
                    const comp = sales.comparison;

                    if (!comp) {
                        return {
                            text: `No se pudo contrastar las ventas entre ${year1} y ${year2}. Verifica que ambos años estén disponibles (2021 a 2026).`,
                            isCard: false
                        };
                    }

                    const isPositiveUnits = comp.diffUnits >= 0;
                    const isPositiveRev = comp.diffRev >= 0;

                    const msgText = `**${userName}**, aquí tienes la **Comparativa de Ventas (${comp.compareYear} vs ${comp.targetYear})**:\n\n` +
                        `• **Ventas en ${comp.targetYear}:** **${comp.targetTotalUnits} unidades vendidas** | **$${formatUSD(comp.targetTotalRev)} USD** facturados.\n` +
                        `• **Ventas en ${comp.compareYear}:** **${comp.compareTotalUnits} unidades vendidas** | **$${formatUSD(comp.compareTotalRev)} USD** facturados.\n` +
                        `• **Variación en Unidades:** **${isPositiveUnits ? '+' : ''}${comp.diffUnits} ventas** (${comp.percentUnits}%).\n` +
                        `• **Variación en Ingresos:** **${isPositiveRev ? '+' : ''}$${formatUSD(comp.diffRev)} USD** (${comp.percentRev}%).\n\n` +
                        `Fuente oficial: Auditorías de red de Sisprot (transición 18 "Por instalar" ➔ 16 "Activo") para 2025-2026 y registro histórico consolidado para 2021-2024.`;

                    return {
                        text: msgText,
                        isCard: true,
                        cardData: {
                            title: `Ventas ${comp.compareYear} vs ${comp.targetYear}`,
                            value: `${comp.targetTotalUnits} Ventas`,
                            subtitle: `${comp.diffUnits >= 0 ? '+' : ''}${comp.diffUnits} vs ${comp.compareYear}`,
                            color: comp.diffUnits >= 0 ? "#2ecc71" : "#e74c3c",
                            stats: [
                                { label: `Total ${comp.targetYear}`, value: `${comp.targetTotalUnits} unds | $${formatUSD(comp.targetTotalRev)}`, color: "#00d2ff" },
                                { label: `Total ${comp.compareYear}`, value: `${comp.compareTotalUnits} unds | $${formatUSD(comp.compareTotalRev)}`, color: "#1d8cf8" },
                                { label: "Crecimiento Unidades", value: `${comp.percentUnits}%`, color: isPositiveUnits ? "#2ecc71" : "#e74c3c" },
                                { label: "Crecimiento Ingresos", value: `${comp.percentRev}%`, color: isPositiveRev ? "#2ecc71" : "#e74c3c" }
                            ]
                        }
                    };
                } catch (e) {
                    return { text: `Error al comparar ventas: ${e.message}`, isCard: false };
                }
            }

            case 'HISTORICO_VENTAS':
            case 'ANALISIS_VENTAS': {
                try {
                    const yearParam = parameters?.year ? String(parameters.year) : "2026";
                    const monthParam = parameters?.month !== undefined && parameters?.month !== null ? Number(parameters.month) : null;
                    const compareParam = parameters?.compareYear ? String(parameters.compareYear) : null;

                    const sales = await getSalesMetrics({ year: yearParam, month: monthParam, compareYear: compareParam });

                    if (sales.comparison) {
                        const comp = sales.comparison;
                        const isPosU = comp.diffUnits >= 0;
                        const isPosR = comp.diffRev >= 0;
                        return {
                            text: `**${userName}**, aquí tienes la comparativa de ventas **${comp.compareYear} vs ${comp.targetYear}**:\n\n` +
                                `• **Ventas en ${comp.targetYear}:** **${comp.targetTotalUnits} ventas** ($${formatUSD(comp.targetTotalRev)} USD)\n` +
                                `• **Ventas en ${comp.compareYear}:** **${comp.compareTotalUnits} ventas** ($${formatUSD(comp.compareTotalRev)} USD)\n` +
                                `• **Variación en Unidades:** **${isPosU ? '+' : ''}${comp.diffUnits} ventas** (${comp.percentUnits}%)\n` +
                                `• **Variación en Ingresos:** **${isPosR ? '+' : ''}$${formatUSD(comp.diffRev)} USD** (${comp.percentRev}%)\n\n` +
                                `Datos obtenidos de la auditoría de red de Sisprot en tiempo real.`,
                            isCard: true,
                            cardData: {
                                title: `Comparativa ${comp.compareYear} vs ${comp.targetYear}`,
                                value: `${comp.targetTotalUnits} Ventas`,
                                subtitle: `${comp.diffUnits >= 0 ? '+' : ''}${comp.diffUnits} vs ${comp.compareYear}`,
                                color: comp.diffUnits >= 0 ? "#2ecc71" : "#e74c3c",
                                stats: [
                                    { label: `Total ${comp.targetYear}`, value: `${comp.targetTotalUnits} unds | $${formatUSD(comp.targetTotalRev)}`, color: "#00d2ff" },
                                    { label: `Total ${comp.compareYear}`, value: `${comp.compareTotalUnits} unds | $${formatUSD(comp.compareTotalRev)}`, color: "#1d8cf8" },
                                    { label: "Crecimiento Unidades", value: `${comp.percentUnits}%`, color: isPosU ? "#2ecc71" : "#e74c3c" },
                                    { label: "Crecimiento Ingresos", value: `${comp.percentRev}%`, color: isPosR ? "#2ecc71" : "#e74c3c" }
                                ]
                            }
                        };
                    }

                    const mesesNombres = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

                    if (sales.monthDetail) {
                        const md = sales.monthDetail;
                        return {
                            text: `**${userName}**, en **${md.monthName} de ${sales.year}** registramos **${md.units} ventas** con una facturación generada de **$${formatUSD(md.revenueUSD)} USD**.\n\n` +
                                `El acumulado del año **${sales.year}** alcanza **${sales.totalUnits} ventas** ($${formatUSD(sales.totalRevenueUSD)} USD).`,
                            isCard: true,
                            cardData: {
                                title: `Ventas ${md.monthName} ${sales.year}`,
                                value: `${md.units} Ventas`,
                                subtitle: `$${formatUSD(md.revenueUSD)} USD facturados`,
                                color: "#00d2ff",
                                stats: [
                                    { label: "Acumulado Anual", value: `${sales.totalUnits} ventas`, color: "#3498db" },
                                    { label: "Ingreso Anual", value: `$${formatUSD(sales.totalRevenueUSD)}`, color: "#2ecc71" }
                                ]
                            }
                        };
                    }

                    const validMonths = sales.unitsMonthly.filter(v => v > 0);
                    let projection2026 = 0;
                    if (validMonths.length > 0) {
                        const totalActual = validMonths.reduce((a, b) => a + b, 0);
                        projection2026 = Math.round((totalActual / validMonths.length) * 12);
                    }

                    const q1 = sales.unitsMonthly.slice(0, 3).reduce((a, b) => a + b, 0);
                    const q2 = sales.unitsMonthly.slice(3, 6).reduce((a, b) => a + b, 0);
                    const q3 = sales.unitsMonthly.slice(6, 9).reduce((a, b) => a + b, 0);
                    const q4 = sales.unitsMonthly.slice(9, 12).reduce((a, b) => a + b, 0);

                    return {
                        text: `**${userName}**, aquí tienes el informe de **Ventas Globales para ${sales.year}**:\n\n` +
                            `• **Total de Ventas:** **${sales.totalUnits} activaciones** (transición de "Por instalar" a "Activo").\n` +
                            `• **Ingresos por Ventas:** **$${formatUSD(sales.totalRevenueUSD)} USD** generados.\n` +
                            (sales.year === "2026" ? `• **Proyección Estimada 2026:** **${projection2026} ventas** al cierre del año (basado en el promedio mensual).\n` : "") +
                            `• **Distribución Trimestral:**\n` +
                            `  - T1 (Ene-Mar): **${q1}** | T2 (Abr-Jun): **${q2}**\n` +
                            `  - T3 (Jul-Sep): **${q3}** | T4 (Oct-Dic): **${q4}**\n\n` +
                            `¿Deseas comparar estas cifras con otro año o consultar un mes específico?`,
                        isCard: true,
                        cardData: {
                            title: `Ventas Globales ${sales.year}`,
                            value: `${sales.totalUnits} Ventas`,
                            subtitle: `$${formatUSD(sales.totalRevenueUSD)} USD facturados`,
                            color: "#00d2ff",
                            stats: [
                                { label: "Proyección Cierre", value: projection2026 > 0 ? `${projection2026} ventas` : `${sales.totalUnits} ventas`, color: "#00d2ff" },
                                { label: "Trimestres T1 / T2", value: `${q1} | ${q2}`, color: "#3498db" },
                                { label: "Trimestres T3 / T4", value: `${q3} | ${q4}`, color: "#a855f7" },
                                { label: "Facturación Ventas", value: `$${formatUSD(sales.totalRevenueUSD)}`, color: "#2ecc71" }
                            ]
                        }
                    };
                } catch (err) {
                    console.error("Error en ANALISIS_VENTAS:", err);
                    return { text: `Lo siento ${userName}, hubo un problema al obtener los datos de ventas: ${err.message}`, isCard: false };
                }
            }

            case 'REACTIVADOS': {
                try {
                    const monthParam = parameters?.month !== undefined ? parameters.month : (parameters?.mes !== undefined ? parameters.mes : null);
                    const sectorParam = parameters?.urbanismo || parameters?.sector || null;
                    const react = await getReactivationMetrics({ month: monthParam, sector: sectorParam });

                    const mesesNombres = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
                    const monthLabel = monthParam !== null && monthParam >= 0 && monthParam < 12 ? ` del mes de **${mesesNombres[Number(monthParam)]}**` : ` en lo que va de **2026**`;
                    const sectorLabel = sectorParam ? ` en el sector **${sectorParam}**` : "";

                    let topSectoresText = "";
                    if (react.topSectores && react.topSectores.length > 0) {
                        topSectoresText = react.topSectores.map(s => `${s.name} (${s.count})`).join(", ");
                    }

                    const msgText = `**${userName}**, he consultado el servicio de auditoría de red de Sisprot para contratos reactivados${monthLabel}${sectorLabel}:\n\n` +
                        `• **Total Reactivados:** **${react.total} clientes** rescatados (transición 34 'Cancelado' ➔ 16 'Activo').\n` +
                        `• **Facturación Recuperada:** **$${formatUSD(react.totalRevenue)} USD** mensuales incorporados nuevamente a la cartera.\n` +
                        `• **Distribución por Tipo:** **${react.totalResidencial} Residenciales** (${react.percentResidencial}%) y **${react.totalPyme} Pymes** (${react.percentPyme}%).\n` +
                        (topSectoresText ? `• **Sectores con más reactivaciones:** ${topSectoresText}.\n` : "") +
                        `• **Regla de negocio aplicada:** Rango desde 01/01/2026, excluyendo cuentas internas (Freddy, Bryant, Elisaul) y empleados según normativa oficial.`;

                    const stats = [
                        { label: "💰 Ingreso Recuperado", value: `$${formatUSD(react.totalRevenue)}`, color: "#2ecc71" },
                        { label: "🏠 Residencial", value: `${react.totalResidencial} (${react.percentResidencial}%)`, color: "#00d2ff" },
                        { label: "🏢 Pyme", value: `${react.totalPyme} (${react.percentPyme}%)`, color: "#f39c12" }
                    ];

                    if (react.trends && react.trends.total) {
                        stats.push({ label: "📈 Tendencia", value: react.trends.total, color: "#a855f7" });
                    }

                    return {
                        text: msgText,
                        isCard: true,
                        cardData: {
                            title: "Control de Reactivados 2026",
                            value: `${react.total} Clientes`,
                            subtitle: `$${formatUSD(react.totalRevenue)} USD / mes recuperados`,
                            color: "#2ecc71",
                            stats,
                            dataset: react.items,
                            filtersText: [`Reactivados 2026`, monthLabel.replace(/\*/g, '').trim()]
                        }
                    };
                } catch (reactErr) {
                    console.error("Error REACTIVADOS:", reactErr);
                    return {
                        text: `Lo siento ${userName}, ocurrió un error al consultar los contratos reactivados: ${reactErr.message}`,
                        isCard: false
                    };
                }
            }

            case 'INGRESOS_RECUPERABLES': {
                try {
                    const metrics = getHealthAndOpportunityMetrics(clientes);
                    return {
                        text: `**${userName}**, de acuerdo a los datos de Sisprot BI:\n\n` +
                            `• **Oportunidad / Ingresos Recuperables:** **$${formatUSD(metrics.recuperable)} USD mensuales**.\n` +
                            `• **Población en riesgo:** Corresponde a **${metrics.totalSuspendidos} clientes** en estado **Suspendido** (ID 19).\n\n` +
                            `💡 **Regla de negocio:** Este monto representa la facturación mensual recurrente de clientes que mantienen contratos en la red pero tienen el servicio inhabilitado por morosidad. **No representa dinero cobrado**, sino ingresos potenciales a recuperar mediante gestión de cobranza.`,
                        isCard: true,
                        cardData: {
                            title: "Oportunidad de Recuperación",
                            value: `$${formatUSD(metrics.recuperable)} USD`,
                            subtitle: `${metrics.totalSuspendidos} clientes suspendidos`,
                            color: "#f39c12",
                            stats: [
                                { label: "Clientes Suspendidos", value: metrics.totalSuspendidos, color: "#f39c12" },
                                { label: "Cartera Total", value: metrics.totalCartera, color: "#00d2ff" },
                                { label: "Tasa de Mora", value: `${((metrics.totalSuspendidos / (metrics.totalCartera || 1)) * 100).toFixed(1)}%`, color: "#e74c3c" }
                            ]
                        }
                    };
                } catch (e) {
                    return { text: `Error al calcular ingresos recuperables: ${e.message}`, isCard: false };
                }
            }

            case 'FUGA_CAPITAL': {
                try {
                    const metrics = getHealthAndOpportunityMetrics(clientes);
                    return {
                        text: `**${userName}**, el análisis de bajas definitivas arroja lo siguiente:\n\n` +
                            `• **Fuga de Capital:** **$${formatUSD(metrics.fuga)} USD mensuales**.\n` +
                            `• **Clientes Cancelados:** **${metrics.totalCancelados} clientes** en estado **Cancelado** (ID 34).\n\n` +
                            `💡 **Impacto:** Esta cartera representa contratos desincorporados de la red. Para recuperarlos es necesario procesar una **Reactivación** de servicio formal.`,
                        isCard: true,
                        cardData: {
                            title: "Fuga de Capital (Bajas)",
                            value: `$${formatUSD(metrics.fuga)} USD`,
                            subtitle: `${metrics.totalCancelados} clientes cancelados`,
                            color: "#e74c3c",
                            stats: [
                                { label: "Clientes Cancelados", value: metrics.totalCancelados, color: "#e74c3c" },
                                { label: "Porcentaje de Fuga", value: `${((metrics.totalCancelados / (metrics.totalCartera || 1)) * 100).toFixed(1)}%`, color: "#e74c3c" }
                            ]
                        }
                    };
                } catch (e) {
                    return { text: `Error al calcular fuga de capital: ${e.message}`, isCard: false };
                }
            }

            case 'SALUD_CARTERA': {
                try {
                    const metrics = getHealthAndOpportunityMetrics(clientes);
                    return {
                        text: `**${userName}**, el índice de salud de cartera es del **${formatPercent(metrics.salud)}**:\n\n` +
                            `• **Clientes Activos:** **${metrics.totalActivos} clientes** al día disfrutando del servicio.\n` +
                            `• **Cartera Total Registrada:** **${metrics.totalCartera} clientes**.\n` +
                            `• **Clientes en Suspensión:** **${metrics.totalSuspendidos}** (${formatPercent((metrics.totalSuspendidos / (metrics.totalCartera || 1)) * 100)}).\n` +
                            `• **Clientes Cancelados:** **${metrics.totalCancelados}** (${formatPercent((metrics.totalCancelados / (metrics.totalCartera || 1)) * 100)}).`,
                        isCard: true,
                        cardData: {
                            title: "Salud de Cartera",
                            value: `${formatPercent(metrics.salud)}`,
                            subtitle: `${metrics.totalActivos} de ${metrics.totalCartera} activos`,
                            color: "#00d2ff",
                            stats: [
                                { label: "Activos", value: metrics.totalActivos, color: "#2ecc71" },
                                { label: "Suspendidos", value: metrics.totalSuspendidos, color: "#f39c12" },
                                { label: "Cancelados", value: metrics.totalCancelados, color: "#e74c3c" }
                            ]
                        }
                    };
                } catch (e) {
                    return { text: `Error al calcular salud de cartera: ${e.message}`, isCard: false };
                }
            }

            case 'ARPU_METRICA': {
                try {
                    const kpis = getExecutiveKpis(clientes, userRole);
                    return {
                        text: `**${userName}**, el **ARPU actual (Ticket Promedio)** en Sisprot BI es de **$${formatUSD(kpis.ticketPromedio)} USD** por cliente activo.\n\n` +
                            `• **Metodología oficial de cálculo:**\n` +
                            `  ARPU = Facturación Mensual Proyectada ($${formatUSD(kpis.ingresosTotales)} USD) / Total Clientes Activos (${kpis.activos}).\n` +
                            `• **Población considerada:** Clientes comerciales activos (Residencial y Pyme), excluyendo empleados y pruebas.`,
                        isCard: true,
                        cardData: {
                            title: "Ticket Promedio (ARPU)",
                            value: `$${formatUSD(kpis.ticketPromedio)} USD`,
                            subtitle: "Promedio mensual por cliente activo",
                            color: "#9b59b6",
                            stats: [
                                { label: "Facturación Proyectada", value: `$${formatUSD(kpis.ingresosTotales)}`, color: "#2ecc71" },
                                { label: "Clientes Activos", value: kpis.activos, color: "#00d2ff" }
                            ]
                        }
                    };
                } catch (e) {
                    return { text: `Error al calcular ARPU: ${e.message}`, isCard: false };
                }
            }

            case 'CHURN_METRICA': {
                try {
                    const kpis = getExecutiveKpis(clientes, userRole);
                    return {
                        text: `**${userName}**, la **Tasa de Baja (Churn Rate)** oficial registrada en el Panel Administrativo es del **${formatPercent(kpis.churnRate)}**.\n\n` +
                            `• **Fórmula oficial en Sisprot BI:**\n` +
                            `  Churn Rate = ((Suspendidos + Cancelados) / Total Cartera) * 100\n` +
                            `• **Valores considerados:**\n` +
                            `  - Suspendidos: **${kpis.suspendidos}** (${kpis.percentSuspendidos}%)\n` +
                            `  - Cancelados: **${kpis.cancelados}** (${kpis.percentCancelados}%)\n` +
                            `  - Total en Mora o Baja: **${kpis.suspendidos + kpis.cancelados} clientes** de un universo de **${kpis.totalClientes}**.`,
                        isCard: true,
                        cardData: {
                            title: "Tasa de Baja (Churn Rate)",
                            value: `${formatPercent(kpis.churnRate)}`,
                            subtitle: `${kpis.suspendidos + kpis.cancelados} de ${kpis.totalClientes} clientes`,
                            color: "#e67e22",
                            stats: [
                                { label: "Suspendidos", value: kpis.suspendidos, color: "#f39c12" },
                                { label: "Cancelados", value: kpis.cancelados, color: "#e74c3c" },
                                { label: "Total Cartera", value: kpis.totalClientes, color: "#00d2ff" }
                            ]
                        }
                    };
                } catch (e) {
                    return { text: `Error al calcular Churn Rate: ${e.message}`, isCard: false };
                }
            }

            case 'RECAUDACION_HISTORICA': {
                try {
                    const hist = await getHistoricalRevenueMetrics();
                    return {
                        text: `**${userName}**, la **recaudación histórica total acumulada** en Sisprot BI asciende a **$${formatUSD(hist.totalAccumulated)} USD** (registrada desde enero de 2025 hasta la fecha).\n\n` +
                            `• **Fuente:** Endpoint de estadísticas de ingresos agrupados por tipo de servicio y migración (\`/statistics/income/\`).\n` +
                            `• **Corte analizado:** Enero 2025 a la fecha actual.`,
                        isCard: true,
                        cardData: {
                            title: "Recaudación Total Acumulada",
                            value: `$${formatUSD(hist.totalAccumulated)} USD`,
                            subtitle: "Histórico consolidado en bancos y estadísticas",
                            color: "#2ecc71",
                            stats: [
                                { label: "Total Acumulado", value: `$${formatUSD(hist.totalAccumulated)}`, color: "#2ecc71" },
                                { label: "Meses Registrados", value: hist.chartLabels?.length || 0, color: "#00d2ff" }
                            ]
                        }
                    };
                } catch (e) {
                    return { text: `Error al consultar recaudación histórica: ${e.message}`, isCard: false };
                }
            }

            case 'RESUMEN_KPIS': {
                try {
                    const kpis = getExecutiveKpis(clientes, userRole);
                    const health = getHealthAndOpportunityMetrics(clientes);

                    const isAdmin = userRole === "admin";
                    const revText = isAdmin ? `• **Facturación Mensual Proyectada:** **$${formatUSD(kpis.ingresosTotales)} USD**\n• **ARPU (Ticket Promedio):** **$${formatUSD(kpis.ticketPromedio)} USD**\n` : "";

                    return {
                        text: `**${userName}**, aquí tienes el **Resumen Ejecutivo de Sisprot BI** con datos sincronizados:\n\n` +
                            `• **Cartera Total:** **${kpis.totalClientes} contratos**\n` +
                            `• **Clientes Activos:** **${kpis.activos}** (${kpis.percentActivos}% - Salud de Cartera)\n` +
                            `• **Suspendidos:** **${kpis.suspendidos}** (Oportunidad recuperable: **$${formatUSD(health.recuperable)} USD**)\n` +
                            `• **Cancelados:** **${kpis.cancelados}** (Fuga mensual: **$${formatUSD(health.fuga)} USD**)\n` +
                            `• **Tasa de Baja (Churn Rate):** **${formatPercent(kpis.churnRate)}**\n` +
                            revText +
                            `• **Top Sector:** **${kpis.topSectores[0]?.name || 'N/A'}** (${kpis.topSectores[0]?.count || 0} clientes activos).\n\n` +
                            `Consulta actualizada con la base de datos oficial de Sisprot BI.`,
                        isCard: true,
                        cardData: {
                            title: "Resumen Estratégico BI",
                            value: `${kpis.activos} Activos`,
                            subtitle: `${kpis.percentActivos}% de ${kpis.totalClientes} clientes`,
                            color: "#00d2ff",
                            stats: [
                                { label: "Suspendidos", value: kpis.suspendidos, color: "#f39c12" },
                                { label: "Cancelados", value: kpis.cancelados, color: "#e74c3c" },
                                { label: "Salud Cartera", value: `${formatPercent(kpis.saludCartera)}`, color: "#2ecc71" },
                                { label: "ARPU", value: isAdmin ? `$${formatUSD(kpis.ticketPromedio)}` : "Restringido", color: "#9b59b6" }
                            ]
                        }
                    };
                } catch (e) {
                    return { text: `Error al generar resumen de KPIs: ${e.message}`, isCard: false };
                }
            }

            case 'EXPLICACION_REGLA': {
                const health = getHealthAndOpportunityMetrics(clientes);
                return {
                    text: `**${userName}**, en Sisprot BI existen diferencias fundamentales entre los estados de cliente:\n\n` +
                        `• **Suspendido (ID 19):** El cliente mantiene su contrato y equipos instalados en la red, pero su servicio de internet ha sido cortado temporalmente por falta de pago o trámite operativo. Su valor se clasifica como **Oportunidad / Ingreso Recuperable** ($${formatUSD(health.recuperable)} USD) porque se reactiva de inmediato al liquidar el saldo pendiente.\n\n` +
                        `• **Cancelado (ID 34):** El contrato ha sido rescindido definitivamente de la cartera. Se cuantifica como **Fuga de Capital** ($${formatUSD(health.fuga)} USD). Para volver a contar con servicio debe pasar por un proceso formal de **Reactivación de Contrato** (auditoría 34 ➔ 16).\n\n` +
                        `• **Cálculo de Churn:** Para medir la deserción total de la cartera, Sisprot BI suma ambos estados sobre el total de clientes: \`((Suspendidos + Cancelados) / Total) * 100\`.`,
                    isCard: false
                };
            }

            case 'SECTOR_METRICAS': {
                const secName = parameters?.urbanismo || parameters?.sector || null;
                if (!secName) {
                    return { text: `¿De qué sector o urbanismo te gustaría consultar las métricas? Por ejemplo: El Macaro, Turmero, Saman Tarazonero, Pantin, etc.`, isCard: false };
                }

                const secDetail = getSectorClientsDetail(clientes, secName);
                if (!secDetail) {
                    return { text: `No encontré ningún sector o urbanismo que coincida con "${secName}". ¿Podrías verificar el nombre?`, isCard: false };
                }

                return {
                    text: `**${userName}**, métricas del sector **${secDetail.sectorName}** (${secDetail.parishName}):\n\n` +
                        `• **Total Contratos:** **${secDetail.total} clientes**\n` +
                        `• **Clientes Activos:** **${secDetail.activosCount}** ($${formatUSD(secDetail.facturacionActivos)} USD/mes en facturación)\n` +
                        `• **Suspendidos:** **${secDetail.suspendidosCount}** (Oportunidad recuperable: $${formatUSD(secDetail.ingresoRecuperable)} USD)\n` +
                        `• **Cancelados:** **${secDetail.canceladosCount}**\n` +
                        `• **Tasa de Salud Local:** ${formatPercent((secDetail.activosCount / secDetail.total) * 100)}`,
                    isCard: true,
                    cardData: {
                        title: secDetail.sectorName,
                        value: `${secDetail.activosCount} Activos`,
                        subtitle: `${secDetail.total} clientes en total | ${secDetail.parishName}`,
                        color: "#00d2ff",
                        stats: [
                            { label: "Facturación Activa", value: `$${formatUSD(secDetail.facturacionActivos)}`, color: "#2ecc71" },
                            { label: "Suspendidos", value: secDetail.suspendidosCount, color: "#f39c12" },
                            { label: "Cancelados", value: secDetail.canceladosCount, color: "#e74c3c" }
                        ],
                        dataset: secDetail.clients,
                        filtersText: [`Sector: ${secDetail.sectorName}`]
                    }
                };
            }

            case 'RANKING_SECTORES': {
                const kpis = getExecutiveKpis(clientes, userRole);
                const top5 = kpis.topSectores || [];

                const listText = top5.map((s, i) => `${i + 1}) **${s.name}**: **${s.count} clientes activos** ($${formatUSD(s.revenue)} USD facturados)`).join("\n");

                return {
                    text: `**${userName}**, los sectores con mayor facturación y presencia de clientes activos en Sisprot BI son:\n\n${listText}\n\n¿Deseas ver el detalle completo de alguno de estos sectores?`,
                    isCard: true,
                    cardData: {
                        title: "Top 5 Sectores por Facturación",
                        value: top5[0]?.name || "N/A",
                        subtitle: `${top5[0]?.count || 0} clientes activos ($${formatUSD(top5[0]?.revenue || 0)} USD)`,
                        color: "#00d2ff",
                        stats: top5.slice(0, 4).map(s => ({
                            label: s.name,
                            value: `${s.count} clis | $${formatUSD(s.revenue)}`,
                            color: "#2ecc71"
                        }))
                    }
                };
            }

            case 'TOP_URBANISMO': {
                const urbanismos = clientes.reduce((acc, curr) => {
                    if (curr.status_name === "Activo" || curr.status_name === "Suspendido") {
                        if (curr.sector_name) {
                            acc[curr.sector_name] = (acc[curr.sector_name] || 0) + 1;
                        }
                    }
                    return acc;
                }, {});

                let maxUrbanismo = "";
                let maxClientes = 0;
                for (const [urb, count] of Object.entries(urbanismos)) {
                    if (count > maxClientes) {
                        maxClientes = count;
                        maxUrbanismo = urb;
                    }
                }

                return {
                    text: `Mira ${userName}, el urbanismo o sector líder dominante actualmente es ** ${maxUrbanismo}**.`,
                    isCard: true,
                    cardData: {
                        title: "Urbanismo Principal",
                        value: maxUrbanismo,
                        subtitle: `${maxClientes} clientes aportados`,
                        color: "#3498db"
                    }
                };
            }



            case 'PLANES': {
                const req = message.toLowerCase(); // OpenAI no me dirá si filtró por activos/suspendidos en planes en este prompt base, pero aplicamos helper si dice 'activo'
                return getPlanesResponse(req, clientes);
            }

            case 'BUSCAR_CEDULA':
            case 'BUSCAR_CONTRATO': {
                const nroRaw = parameters?.contrato || parameters?.cedula || extractNumber(message);
                if (nroRaw) {
                    const nro = String(nroRaw);
                    const nroOnlyDigits = nro.replace(/\D/g, '');

                    // 1. Intentar Contrato EXACTO
                    let matches = clientes.filter(c => String(c.id) === nro);
                    let foundType = "contrato";

                    // 2. Si no hay contrato, intentar Cédula (Normalizada sin letras V, E, J...)
                    if (matches.length === 0) {
                        matches = clientes.filter(c => {
                            const dbCi = String(c.client_identification || '').replace(/\D/g, '');
                            return dbCi === nroOnlyDigits;
                        });
                        foundType = "cédula";
                    }

                    if (matches.length === 1) {
                        const cliente = matches[0];
                        return {
                            text: `¡Búsqueda Exitosa ${userName}! Este es el perfil encontrado por ** ${foundType} **: `,
                            isCard: true,
                            contextType: 'viewing_client',
                            cardData: {
                                title: cliente.client_name,
                                subtitle: `${cliente.sector_name} | #${cliente.id}`,
                                stats: [
                                    { label: "Estado", value: cliente.status_name },
                                    { label: "Plan", value: `${cliente.plan?.name} (${cliente.plan?.cost} US$)` },
                                    { label: "Teléfono", value: cliente.client_mobile || "N/A" },
                                    { label: "Ciclo", value: mapCycleValue(cliente.cycle, cliente) },
                                    { label: "IP/MAC", value: `${cliente.service_detail?.ip || "N/A"} / ${cliente.service_detail?.mac || "N/A"}` },
                                    { label: "Caja NAP", value: cliente.nap_box_name || "N/A" },
                                    { label: "Dirección", value: cliente.address || "N/A" },
                                    { label: "Cédula", value: cliente.client_identification }
                                ],
                                parameters: { contrato: cliente.id, cedula: cliente.client_identification },
                                savedDataset: [cliente], // Solo este cliente
                                filtersText: [foundType === "contrato" ? `Contrato: #${cliente.id}` : `Cédula: ${nro}`],
                                rawData: cliente
                            }
                        };
                    } else if (matches.length > 1) {
                        // Caso: Una cédula con varios contratos
                        const optionsList = matches.map((m, i) => `${i + 1}) **${m.client_name}** (Contrato: **#${m.id}**, Estatus: ${m.status_name}, Sector: ${m.sector_name})`).join("\n");
                        return {
                            text: `He encontrado **${matches.length} contratos** asociados a la cédula "${nro}". ¿Cuál de ellos deseas consultar?\n\n${optionsList}\n\nResponde con el número de la opción para ver el detalle.`,
                            isCard: false,
                            contextType: 'multi_client_clarification',
                            cardData: {
                                currentName: `Cédula ${nro}`,
                                currentMatches: matches,
                                confirmedClients: [],
                                pendingNames: []
                            }
                        };
                    } else {
                        registerUnansweredQuery(query, userName, currentPage);
                        return { text: `El sistema indica que el número **${nro}** no coincide con ningún Contrato o Cédula en nuestros registros.`, isCard: false };
                    }
                }
                return { text: "Clasifiqué que buscas un perfil, pero no logré detectar el número de identificación.", isCard: false };
            }

            case 'BUSCAR_NOMBRE': {
                let nombresReq = parameters?.nombres || (parameters?.nombre ? [parameters.nombre] : []);

                // Fallback local: si la IA identificó BUSCAR_NOMBRE pero no extrajo el parámetro,
                // o si el usuario respondió directamente con un nombre en el flujo de chat.
                if (nombresReq.length === 0 && message) {
                    let cleanQuery = message
                        .replace(/^(buscar|busca|consultar|consulta|dame la informacion de|dame informacion de|informacion de|datos de|ver el cliente|ver a|ver al cliente|el cliente|cliente)\s+/gi, "")
                        .trim();
                    if (cleanQuery.length >= 3) {
                        nombresReq = [cleanQuery];
                    }
                }

                if (nombresReq.length === 0) {
                    return { text: `Dime los nombres de los clientes que buscas ${userName}.`, isCard: false };
                }

                // Si hay un historial previo con clientes confirmados, los mantenemos
                let confirmedClients = [];
                if (history && history.length > 0) {
                    const lastBotMsg = history.slice().reverse().find(m => m.sender === 'bot' && m.cardData && m.cardData.confirmedClients);
                    if (lastBotMsg) confirmedClients = [...lastBotMsg.cardData.confirmedClients];
                }

                let pendingNames = [...nombresReq];
                let resolvedInThisStep = [];
                let currentAmbiguous = null;
                let currentMatches = [];

                while (pendingNames.length > 0) {
                    const nameRaw = pendingNames.shift();
                    let nameClean = normalizeText(nameRaw)
                        .replace(/^(del\s+cliente|el\s+cliente|cliente|datos\s+de|datos\s+del|la\s+informacion\s+de)\s+/g, "")
                        .trim();

                    if (!nameClean || nameClean.length < 3) continue;

                    // Evitar procesar el mismo registro si ya está confirmado
                    const alreadyResolvedIds = resolvedInThisStep.map(c => c.id);
                    let matches = clientes.filter(c => normalizeText(c.client_name).includes(nameClean) && !alreadyResolvedIds.includes(c.id));

                    if (matches.length === 0 && nameClean.split(" ").length > 1) {
                        const words = nameClean.split(" ");
                        matches = clientes.filter(c => {
                            const dbName = normalizeText(c.client_name);
                            return words.every(w => dbName.includes(w)) && !alreadyResolvedIds.includes(c.id);
                        });
                    }

                    if (matches.length === 1) {
                        resolvedInThisStep.push(matches[0]);
                    } else if (matches.length > 1) {
                        currentAmbiguous = nameRaw;
                        currentMatches = matches;
                        break;
                    }
                }

                const allConfirmed = [...confirmedClients, ...resolvedInThisStep];

                if (currentAmbiguous) {
                    const optionsList = currentMatches.map((m, i) => `${i + 1}) **${m.client_name}** (Contrato: **#${m.id}**, Estatus: ${m.status_name}, Sector: ${m.sector_name})`).join("\n");
                    const introResolved = resolvedInThisStep.length > 0 ? `He agregado a ${resolvedInThisStep.map(c => c.client_name).join(", ")}. \n\n` : "";

                    return {
                        text: `${introResolved}He encontrado **${currentMatches.length} contratos** asociados a "${currentAmbiguous}". ¿Cuál de ellos deseas consultar?\n\n${optionsList}\n\nResponde con el número de la opción (1, 2, 3...) para ver el perfil detallado.`,
                        isCard: false,
                        contextType: 'multi_client_clarification',
                        cardData: {
                            pendingNames: pendingNames,
                            confirmedClients: allConfirmed,
                            currentName: currentAmbiguous,
                            currentMatches: currentMatches
                        }
                    };
                }
                else if (allConfirmed.length > 0) {
                    const confirmedList = allConfirmed.map(c => `- ${c.client_name} (#${c.id})`).join("\n");
                    const title = nombresReq.length > 1 ? "Clientes encontrados" : "Cliente encontrado";

                    // Si solo era un nombre y se resolvió directo, mostramos su card pero con opción a excel
                    if (nombresReq.length === 1 && allConfirmed.length === 1) {
                        const cliente = allConfirmed[0];
                        return {
                            text: `He encontrado a **${cliente.client_name}**. ¿Deseas buscar a alguien más o **generamos el Excel** con sus datos?`,
                            isCard: true,
                            contextType: 'multi_client_confirmed',
                            cardData: {
                                title: cliente.client_name,
                                subtitle: `#${cliente.id} | ${cliente.sector_name}`,
                                stats: [
                                    { label: "Estado", value: cliente.status_name },
                                    { label: "Plan", value: `${cliente.plan?.name} ($${cliente.plan?.cost})` },
                                    { label: "Teléfono", value: cliente.client_mobile || "N/A" },
                                    { label: "Ciclo", value: mapCycleValue(cliente.cycle, cliente) },
                                    { label: "IP/MAC", value: `${cliente.service_detail?.ip || "N/A"} / ${cliente.service_detail?.mac || "N/A"}` },
                                    { label: "Caja NAP", value: cliente.nap_box_name || "N/A" },
                                    { label: "Dirección", value: cliente.address || "N/A" },
                                    { label: "Cédula", value: cliente.client_identification }
                                ],
                                confirmedClients: allConfirmed,
                                rawData: cliente,
                                savedDataset: [cliente], // Solo este cliente
                                filtersText: [`Nombre: ${cliente.client_name}`]
                            }
                        };
                    }

                    return {
                        text: `He preparado la lista con los clientes encontrados:\n\n${confirmedList}\n\n¿Deseas buscar más nombres o **procedemos con el Excel**?`,
                        isCard: false,
                        contextType: 'multi_client_confirmed',
                        cardData: {
                            confirmedClients: allConfirmed
                        }
                    };
                }

                registerUnansweredQuery(query, userName, currentPage);
                return { text: `Lo siento ${userName}, no encontré ningún cliente que coincida con esos nombres.`, isCard: false };
            }

            case 'BUSQUEDA_VAGA':
                return {
                    text: `Por supuesto ${userName}, dime el nombre, apellido, o el número de contrato del cliente que necesitas consultar.`,
                    isCard: false
                };

            case 'SEGUIMIENTO_CLIENTE': {
                // OpenAI notifica que es una pregunta de seguimiento de informacion sobre un cliente recien visto.
                // Buscamos hacia atrás en el history el objeto rawData inyectado.
                let rawDataTarget = null;
                for (let i = history.length - 1; i >= 0; i--) {
                    if (history[i].cardData && history[i].cardData.rawData) {
                        rawDataTarget = history[i].cardData.rawData;
                        break;
                    }
                }

                if (!rawDataTarget) {
                    // Intento de rescate de contexto desde confirmedClients si existe
                    for (let i = history.length - 1; i >= 0; i--) {
                        if (history[i].cardData?.confirmedClients?.length > 0) {
                            rawDataTarget = history[i].cardData.confirmedClients[history[i].cardData.confirmedClients.length - 1];
                            break;
                        }
                    }
                }

                if (!rawDataTarget) {
                    return { text: "Me pides un dato adicional, pero he perdido el hilo del cliente que estábamos analizando. ¿Me recuerdas su nombre o número?", isCard: false };
                }

                const accion = parameters?.accion;
                // Caso especial: Ver el perfil o detalle completo
                if (accion === 'perfil' || accion === 'detalle' || query.includes("detalle") || query.includes("perfil") || query.includes("vuelve a mostrar")) {
                    return {
                        text: `¡Claro ${userName}! Aquí tienes de nuevo el perfil detallado de **${rawDataTarget.client_name}**:`,
                        isCard: true,
                        contextType: 'viewing_client',
                        cardData: {
                            title: rawDataTarget.client_name,
                            subtitle: `${rawDataTarget.sector_name} | #${rawDataTarget.id}`,
                            stats: [
                                { label: "Estado", value: rawDataTarget.status_name },
                                { label: "Plan", value: `${rawDataTarget.plan?.name} (${rawDataTarget.plan?.cost} US$)` },
                                { label: "Teléfono", value: rawDataTarget.client_mobile || "N/A" },
                                { label: "Ciclo", value: mapCycleValue(rawDataTarget.cycle, rawDataTarget) },
                                { label: "IP/MAC", value: `${rawDataTarget.service_detail?.ip || "N/A"} / ${rawDataTarget.service_detail?.mac || "N/A"}` },
                                { label: "Caja NAP", value: rawDataTarget.nap_box_name || "N/A" },
                                { label: "Dirección", value: rawDataTarget.address || "N/A" },
                                { label: "Cédula", value: rawDataTarget.client_identification }
                            ],
                            rawData: rawDataTarget,
                            savedDataset: [rawDataTarget],
                            filtersText: [`Contrato: #${rawDataTarget.id}`]
                        }
                    };
                }
                if (accion === 'direccion') {
                    const dir = rawDataTarget.address || rawDataTarget.direction || 'No registrada en sistema';
                    const detail = rawDataTarget.direction_detail ? ', ' + rawDataTarget.direction_detail : '';
                    return {
                        text: `La ubicación registrada en el expediente de ** ${rawDataTarget.client_name}** es: \n\n📍 ${dir}${detail} \n(Urbanismo: ${rawDataTarget.sector_name})`,
                        isCard: false,
                        contextType: 'viewing_client',
                        cardData: { rawData: rawDataTarget }
                    };
                }

                if (accion === 'deuda') {
                    return {
                        text: `No tengo información sobre la deuda específica de este cliente por motivos de seguridad. 🛑\n\nEn cambio, el ** total de ingresos ** de la empresa sí lo conozco. ¡Puedes preguntarme por eso si deseas!`,
                        isCard: false,
                        contextType: 'viewing_client',
                        cardData: { rawData: rawDataTarget }
                    };
                }

                if (accion === 'ciclo') {
                    return {
                        text: `El ciclo de facturación asignado a ** ${rawDataTarget.client_name}** es: \n\n🗓️ ** ${getCycleLabel(rawDataTarget.cycle)}** `,
                        isCard: false,
                        contextType: 'viewing_client',
                        cardData: { rawData: rawDataTarget }
                    };
                }

                if (accion === 'telefono') {
                    return {
                        text: `Si deseas comunicarte, el contacto asignado a ** ${rawDataTarget.client_name}** es: \n\n📱 ** ${rawDataTarget.client_mobile || 'No posee o es inválido'}** `,
                        isCard: false,
                        contextType: 'viewing_client',
                        cardData: { rawData: rawDataTarget }
                    };
                }

                if (accion === 'red') {
                    return {
                        text: `Parámetros de Networking de ** ${rawDataTarget.client_name}**: \n\n🌐 IP: ${rawDataTarget.ip_address || 'Asignación Dinamica/NA'} \n💻 MAC: ${rawDataTarget.mac_address || 'N/A'} `,
                        isCard: false,
                        contextType: 'viewing_client',
                        cardData: { rawData: rawDataTarget }
                    };
                }

                if (accion === 'plan') {
                    return {
                        text: `El contrato comercial de ** ${rawDataTarget.client_name}** está sujeto al siguiente paquete: \n\n📦 Plan: ** ${rawDataTarget.plan?.name || 'Vago/Ninguno'}**\n💳 Costo Mensual: ** $${rawDataTarget.plan?.cost || 0}** `,
                        isCard: false,
                        contextType: 'viewing_client',
                        cardData: { rawData: rawDataTarget }
                    };
                }

                // Por si acaso accion es rara que envia OpenAI
                return { text: "No estoy seguro de qué métrica específica pides de este cliente. Puedes preguntarme por su dirección, número de contacto, ciclo de facturación o datos de red.", isCard: false, contextType: 'viewing_client', cardData: { rawData: rawDataTarget } };
            }

            case 'AMBIGUEDAD_METRICA': {
                return {
                    text: `He detectado que te refieres a un grupo específico de clientes, pero ¿qué te gustaría saber de ellos?\n\n` +
                        `🔹 ¿El **Total de Clientes**?\n` +
                        `🔹 ¿Los **Ingresos** proyectados?\n` +
                        `🔹 ¿O prefieres ver **Ambos** datos?`,
                    isCard: false,
                    contextType: 'clarify_metric',
                    cardData: {
                        periodPreference: isTodayQuery ? "Hoy" : yesterdayLabel,
                        savedParameters: parameters
                    }
                };
            }

            case 'AMBIGUEDAD_INGRESOS': {
                return {
                    text: `He detectado tu consulta sobre ingresos ${userName}. ¿A qué tipo de dato te refieres específicamente?\n\n` +
                        `🔹 **Facturación Proyectada**: Suma de los planes (Activos/Suspendidos).\n` +
                        `🔹 **Recaudación Real**: Cobros efectivos en los bancos (BNC, BDV, etc.).`,
                    isCard: false,
                    contextType: 'clarify_revenue_type', // Nuevo tipo para botones
                    cardData: {
                        periodPreference: isTodayQuery ? "Hoy" : yesterdayLabel,
                        savedParameters: parameters
                    }
                };
            }

            case 'DATA_MAESTRA': {
                const { filtered, appliedTexts } = getFilteredDataset(clientes, { dataMaestra: true }, query);

                // Conteo por estados para el resumen visual
                const counts = filtered.reduce((acc, c) => {
                    const st = c.status_name || 'Otros';
                    acc[st] = (acc[st] || 0) + 1;
                    return acc;
                }, {});

                const formatCurrencyLoc = (val) => `$${parseFloat(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                const calculateRevenue = (subset) => subset.reduce((acc, curr) => acc + parseFloat(curr.plan?.cost || 0), 0);

                const stats = [
                    { label: "Activos", value: `${counts.Activo || 0} (${formatCurrencyLoc(calculateRevenue(filtered.filter(c => c.status_name === "Activo")))})`, color: "#2ecc71" },
                    { label: "Suspendidos", value: `${counts.Suspendido || 0} (${formatCurrencyLoc(calculateRevenue(filtered.filter(c => c.status_name === "Suspendido")))})`, color: "#f1c40f" },
                    { label: "Cancelados", value: `${counts.Cancelado || 0}`, color: "#e74c3c" },
                    { label: "Universo Total", value: filtered.length, color: "#3498db" },
                    { label: "Monto Proyectado", value: formatCurrencyLoc(calculateRevenue(filtered)), color: "#9b59b6" }
                ];

                return {
                    text: `¡Entendido ${userName}! Aquí tienes el reporte de la **Data Maestra** (Universo Total). He incluido todos los estados, tipos de clientes, ciclos y tecnologías.\n\n¿Deseas descargar el **archivo Excel completo** para un análisis más profundo?`,
                    isCard: true,
                    offerExcel: true,
                    cardData: {
                        title: "Reporte: Data Maestra",
                        value: filtered.length,
                        subtitle: "Universo total de clientes",
                        color: "#9b59b6",
                        stats: stats,
                        savedDataset: filtered,
                        filtersText: ["Universo Total (Data Maestra)"],
                        parameters: { dataMaestra: true }
                    }
                };
            }

            case 'AMBOS_METRICAS': {
                const { filtered, appliedTexts } = getFilteredDataset(clientes, parameters, query);

                // Cálculos unificados (Mejora solicitada: mostrar en mismo renglón)
                const calculateRevenue = (subset) => subset.reduce((acc, curr) => acc + parseFloat(curr.plan?.cost || 0), 0);
                const formatVal = (count, rev) => `${count} (${formatCurrency(rev)})`;

                const finalStats = [];
                const tipoParamsAmb = Array.isArray(parameters?.tipo) ? parameters.tipo : (parameters?.tipo ? [parameters.tipo] : []);

                if (tipoParamsAmb.length > 1) {
                    tipoParamsAmb.forEach(t => {
                        const subset = filtered.filter(c => normalizeText(c.client_subdivision || c.client_type_name || '').includes(normalizeText(t)));
                        const revenue = calculateRevenue(subset);

                        let color = "#bdc3c7";
                        const tNorm = normalizeText(t);
                        if (tNorm.includes("pyme")) color = "#9b59b6";
                        else if (tNorm.includes("residencial")) color = "#3498db";

                        finalStats.push({
                            label: `Tipo: ${t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()}`,
                            value: formatVal(subset.length, revenue),
                            color
                        });
                    });
                } else {
                    // Si no hay tipos, mostramos desglose por estado con sus montos reales
                    const statusList = Array.isArray(parameters?.status) ? parameters.status : ["Activo", "Suspendido", "Cancelado"];
                    statusList.forEach(s => {
                        const subset = filtered.filter(c => normalizeText(c.status_name).includes(normalizeText(s)));
                        if (subset.length > 0 || parameters?.status) {
                            let color = "#bdc3c7";
                            const sNorm = normalizeText(s);
                            if (sNorm.includes("activo")) color = "#2ecc71";
                            else if (sNorm.includes("suspendido")) color = "#f1c40f";
                            else if (sNorm.includes("cancelado")) color = "#e74c3c";

                            finalStats.push({ label: s, value: formatVal(subset.length, calculateRevenue(subset)), color });
                        }
                    });
                }

                const totalRev = calculateRevenue(filtered);
                finalStats.push({ label: "Total Proyectado", value: formatCurrency(totalRev), color: "#3498db" });

                return {
                    text: `He procesado el resumen estratégico para la reunión con los filtros indicados: \n(${appliedTexts.join(', ')})\n\n**Los detalles por urbanismo están listos para ser exportados al Excel.**`,
                    isCard: true,
                    cardData: {
                        periodPreference: isTodayQuery ? "Hoy" : yesterdayLabel,
                        title: dataLabel.startsWith("Hoy") ? "Resumen de Selección" : `Resumen: ${dataLabel}`,
                        stats: finalStats,
                        color: "#9b59b6",
                        parameters: parameters,
                        savedDataset: filtered,
                        filtersText: appliedTexts
                    }
                };
            }

            case 'GENERAR_EXCEL': {
                // Buscamos si el último mensaje tenía un dataset relevante (contexto)
                let targetDataset = null;
                let targetFilters = null;
                let targetParams = parameters;

                if (history && history.length >= 2) {
                    const lastBot = history[history.length - 2];
                    if (lastBot.sender === 'bot' && lastBot.cardData) {
                        if (lastBot.cardData.savedDataset || lastBot.cardData.dataset) {
                            targetDataset = lastBot.cardData.savedDataset || lastBot.cardData.dataset;
                            targetFilters = lastBot.cardData.filtersText;
                            targetParams = lastBot.cardData.parameters || parameters;
                        } else if (lastBot.cardData.confirmedClients && lastBot.cardData.confirmedClients.length > 0) {
                            targetDataset = lastBot.cardData.confirmedClients;
                            targetFilters = ["Lista Personalizada"];
                        } else if (lastBot.cardData.rawData) {
                            targetDataset = [lastBot.cardData.rawData];
                            targetFilters = [`Cliente: ${lastBot.cardData.rawData.client_name}`];
                        }
                    }
                }

                const { filtered, appliedTexts } = targetDataset
                    ? { filtered: targetDataset, appliedTexts: targetFilters }
                    : getFilteredDataset(clientes, targetParams, query);

                const reportType = parameters?.reportType || 'general';
                const reportName = reportType === 'operations' ? 'Operaciones (Seguimiento)' : 'General';
                const currentSource = dataLabel.startsWith("Hoy") ? "" : ` de **${dataLabel}**`;
                const filtersMsg = appliedTexts.join(', ') || (currentSource ? `Toda la data` : 'Global');

                let responseText = "";
                if (reportType === 'operations') {
                    responseText = `¡Entendido **${userName}**! He preparado el **Excel de Operaciones** con los datos${currentSource} para: **${filtersMsg}**.`;
                } else {
                    responseText = `¡Entendido **${userName}**! He preparado el **Excel General** con los datos${currentSource} de: **${filtersMsg}**. \n\n¿Deseas descargarlo ahora o prefieres que incluya alguna columna específica al principio?`;
                }

                return {
                    text: responseText,
                    isCard: true,
                    contextType: 'excel_ready',
                    cardData: {
                        periodPreference: isTodayQuery ? "Hoy" : yesterdayLabel,
                        title: `Excel ${reportName} listo`,
                        subtitle: appliedTexts.join(" | "),
                        color: "#27ae60",
                        parameters: { ...targetParams, reportType },
                        savedDataset: filtered,
                        filtersText: appliedTexts,
                        reportType: reportType
                    }
                };
            }

            case 'INGRESOS_BANCOS': {
                try {
                    const rawBank = parameters?.banco || parameters?.bank || null;
                    const invalidBankKeywords = ['todos', 'todo', 'all', 'bancos', 'banco', 'general', 'cualquiera', 'ninguno', 'total'];
                    const bankFilter = (!rawBank || invalidBankKeywords.includes(normalizeText(String(rawBank)).toLowerCase().trim())) ? null : rawBank;
                    const methodFilter = parameters?.metodo || parameters?.method || null;
                    // Parser universal de fechas en español (soporta cualquier fecha, día de la semana, mes o periodo)
                    const parsedDates = parseSpanishDateRange(message, parameters);
                    const startDate = parsedDates.startDate;
                    const endDate = parsedDates.endDate;

                    const { payments, startDate: sDate, endDate: eDate } = await fetchBankPayments(bankFilter, methodFilter, startDate, endDate);

                    const formatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
                    const startLabel = new Date(sDate + 'T12:00:00').toLocaleDateString('es-VE', formatOptions);
                    const endLabel = new Date(eDate + 'T12:00:00').toLocaleDateString('es-VE', formatOptions);

                    let labelFecha;
                    if (sDate === eDate) {
                        labelFecha = `el **${startLabel}**`;
                    } else if (sDate.slice(0, 7) === eDate.slice(0, 7) && sDate.endsWith('-01')) {
                        const monthName = new Date(sDate + 'T12:00:00').toLocaleDateString('es-VE', { month: 'long', year: 'numeric' });
                        labelFecha = `en el mes de **${monthName}** (hasta hoy)`;
                    } else {
                        labelFecha = `desde el **${startLabel}** hasta el **${endLabel}**`;
                    }

                    if (payments.length === 0) {
                        let filtroMsg = bankFilter ? ` para **${bankFilter}**` : '';
                        return {
                            text: `Revisé el sistema de cobros ${userName} y no encontré pagos registrados ${labelFecha}${filtroMsg}.\n\n¿Deseas que consulte otro banco o fecha?`,
                            isCard: false
                        };
                    }

                    // --- Agrupar por banco ---
                    const introLabel = labelFecha;
                    const cicloFilter = parameters?.ciclo || null;

                    const totalUsd = payments.reduce((s, p) => s + parseFloat(p.amount_data?.amount_usd || 0), 0);
                    const totalBs = payments.reduce((s, p) => s + parseFloat(p.amount_data?.amount_bs || 0), 0);
                    const totalPagos = payments.length;

                    // --- Agrupar por banco ---
                    const byBank = payments.reduce((acc, p) => {
                        const banco = p.bank_name || 'Desconocido';
                        if (!acc[banco]) acc[banco] = { count: 0, totalUsd: 0, totalBs: 0, methods: {} };
                        acc[banco].count++;
                        acc[banco].totalUsd += parseFloat(p.amount_data?.amount_usd || 0);
                        acc[banco].totalBs += parseFloat(p.amount_data?.amount_bs || 0);
                        const m = p.method_name || 'Otro';
                        acc[banco].methods[m] = (acc[banco].methods[m] || 0) + 1;
                        return acc;
                    }, {});

                    // --- Nombres legibles para métodos de pago ---
                    const methodLabel = (m) => {
                        const map = {
                            'PAGO MOVIL': 'Pago Móvil',
                            'TRANSFERENCIA': 'Transferencia',
                            'DEBITO INMEDIATO': 'Débito Inmediato',
                            'EFECTIVO': 'Efectivo',
                            'ZELLE': 'Zelle',
                            'DEPOSITO': 'Depósito'
                        };
                        return map[m] || m;
                    };

                    // --- Texto del desglose ---
                    const bancosSorted = Object.entries(byBank).sort((a, b) => b[1].totalUsd - a[1].totalUsd);
                    let desglose = '';
                    bancosSorted.forEach(([banco, d]) => {
                        const metodos = Object.entries(d.methods)
                            .map(([m, c]) => `${methodLabel(m)}: ${c}`)
                            .join(' | ');
                        desglose += `\n🏦 **${banco}** — **${d.count} pago(s)**\n     $${formatUSD(d.totalUsd)} USD | Bs ${d.totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })} — ${metodos}`;
                    });

                    // --- Stats para la tarjeta visual ---
                    const stats = [
                        { label: '💰 Monto Recaudado', value: `$${totalUsd.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`, color: '#2ecc71' }
                    ];

                    // El indicador especial que pidió el jefe (badge inferior)
                    stats.push({ label: '📊 Total de pagos registrados', value: totalPagos, color: '#3498db' });

                    const cycleText = cicloFilter ? ` del **Ciclo ${cicloFilter}**` : '';

                    return {
                        text: `**${userName}**, aquí tiene el balance de cobranza${cycleText} ${introLabel}:\n${desglose}\n\n📉 **Balance Final:**\n- Recaudado: **$${formatUSD(totalUsd)}** (${totalPagos} pagos)`,
                        isCard: true,
                        cardData: {
                            title: `💳 Balance de Ingresos`,
                            value: `$${formatUSD(totalUsd)} USD`,
                            subtitle: cicloFilter ? `Ciclo ${cicloFilter} | ${totalPagos} pagos` : (bankFilter ? `${bankFilter} | ${totalPagos} pagos` : `Todos los bancos | ${totalPagos} pagos`),
                            color: '#2ecc71',
                            stats
                        }
                    };
                } catch (bankErr) {
                    console.error('Error INGRESOS_BANCOS:', bankErr);
                    return {
                        text: `Lo siento ${userName}, ocurrió un error al consultar los cobros: *${bankErr.message}*.`,
                        isCard: false
                    };
                }
            }

            case 'UNKNOWN':
            default: {
                // Registrar consulta no respondida para mejora continua
                registerUnansweredQuery(query, userName, currentPage);

                return {
                    text: `Disculpa ${userName}, no logré entender muy bien tu mensaje. ¿Podrías decirme con más claridad qué intentaste consultar para poder ayudarte mejor? 😊\n\nSi gustas, puedes pedirme consultar clientes de una zona, ver el balance de cobros en los bancos, o buscar a un cliente específico por su nombre o cédula.`,
                    isCard: false
                };
            }
        }

    } catch (error) {
        console.error("AiEngine Error:", error);
        return {
            text: `Lo siento, hubo un error al procesar tu solicitud: ${error.message}. 🌐\n\nSi el error persiste, verifica la API Key o la conexión.`,
            isCard: false
        };
    }
};
