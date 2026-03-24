/**
 * Motor Híbrido: NLP por Gemini + Filtrado y Cálculos Locales
 */
import { getFullSalesData } from '../../services/salesService';


const normalizeText = (text) => {
    if (!text) return "";
    return String(text).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
};

const extractNumber = (text) => {
    const match = text.match(/\d+/);
    return match ? match[0] : null;
};

const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD' }).format(value);
};

const mapCycleValue = (val) => {
    if (val === null || val === undefined) return "N/A";
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

// ─── PAGOS BANCARIOS: Fetch de cobros con soporte para rangos de fechas ──────────
const fetchBankPayments = async (bankFilter = null, methodFilter = null, startDate = null, endDate = null) => {
    const PAYMENTS_URL = "https://api.sisprotgf.com/api/public/payments/payment_company/";
    const TOKEN = process.env.REACT_APP_PAYMENTS_API_KEY;

    // Si no hay fecha, usamos hoy por defecto (retrocompatibilidad)
    const nowLocal = new Date();
    const today = nowLocal.toLocaleDateString('en-CA'); 

    const start = startDate || today;
    const end = endDate || today;

    let allPayments = [];
    let nextUrl = `${PAYMENTS_URL}?page_size=500&created_at_after=${start}&created_at_before=${end}`;
    let iterations = 0;

    while (nextUrl && iterations < 15) { // Aumentamos iteraciones para rangos más largos
        const response = await fetch(nextUrl, {
            headers: {
                'x-api-key': TOKEN,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Error consultando pagos bancarios: HTTP ${response.status}`);
        }

        const raw = await response.json();
        const pageData = Array.isArray(raw) ? raw[0] : raw;
        const results = pageData.results || [];

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
        const resolvedBank = bankFilter
            ? (bankAcronymMap[normalizeText(bankFilter).toUpperCase()] || normalizeText(bankFilter))
            : null;

        const filtered = results.filter(p => {
            const bankOk = !resolvedBank || normalizeText(p.bank_name || '').includes(resolvedBank);
            const methodOk = !methodFilter || normalizeText(p.method_name || '').includes(normalizeText(methodFilter));
            return bankOk && methodOk;
        });

        allPayments = [...allPayments, ...filtered];
        nextUrl = pageData.next || null;
        iterations++;
    }

    return { payments: allPayments, startDate: start, endDate: end };
};

// --- DATA HISTÓRICA (RESPALDO GITHUB): Fetch de snapshot del día anterior ---
const fetchHistoricalClients = async () => {
    const RAW_URL = "https://raw.githubusercontent.com/YetBravoSisprot/data_json_dia_ayer/main/data%20empresa%2010-2.json.json";
    try {
        const response = await fetch(RAW_URL);
        if (!response.ok) throw new Error("Error HTTP al recuperar histórico");
        const rawJson = await response.json();
        // El JSON de GitHub es un array directo de clientes
        return Array.isArray(rawJson) ? rawJson : (rawJson.results || []);
    } catch (e) {
        console.error("Fallo al cargar data histórica de GitHub:", e);
        return null;
    }
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

const getCycleLabel = (val) => {
    const mapped = mapCycleValue(val);
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

// Función para llamar a OpenAI
const callOpenAI = async (query, history, currentPage = "", userName = "") => {
    const apiKey = process.env.REACT_APP_GEMINI_API_KEY || process.env.REACT_APP_OPENAI_API_KEY;
    const context = pageKnowledge[currentPage] || null;

    if (!apiKey) {
        throw new Error("No hay API Key configurada. Por favor declara REACT_APP_GEMINI_API_KEY en tu .env");
    }

    const allSectionsContext = Object.entries(pageKnowledge).map(([path, info]) => {
        return `- **${info.name}** (Ruta: ${path}): ${info.description} Muestra: ${info.data}`;
    }).join('\n');

    let dynamicContextPrompt = `\nCONOCIMIENTO DE LAS SECCIONES DE LA APP:
Aquí tienes lo que hace cada parte del sistema. Úsalo para responder si te preguntan por otras secciones:
${allSectionsContext}

Actualmente el usuario se encuentra físicamente en la sección: "${context ? context.name : 'Desconocida'}".`;

    const todayDate = new Date().toLocaleDateString('en-CA');
    const systemPrompt = `NO DEBES INVENTAR DATOS NUMÉRICOS. Tu tarea es doble: 
1. Identificar la intención y parámetros técnicos para que el sistema busque la data.
2. Redactar una respuesta humana, amable y contextualizada en el campo "message".

DEBES DEVOLVER UN JSON ESTRICTO CON LA SIGUIENTE ESTRUCTURA:
{"intent": "NOMBRE_DEL_INTENT", "parameters": { "param_name": "param_value" }, "message": "Tu respuesta humanizada aquí"}
${dynamicContextPrompt}
INTENCIONES DISPONIBLES:
- TOTAL_CLIENTES: Conteo de clientes (Solo si tienes el Estatus Y el Periodo).
- INGRESOS: Dinero proyectado (Solo si tienes el Estatus Y el Periodo).
- AMBOS_METRICAS: Conteo + Ingresos (Solo si tienes el Estatus Y el Periodo).
- PLANES: Detalle por planes de internet.
- BUSCAR_CONTRATO / BUSCAR_CEDULA / BUSCAR_NOMBRE: Búsqueda de cliente específico.
- DATA_MAESTRA: Universo total de la base de datos.
- GENERAR_EXCEL: Si el usuario pide descargar el archivo.
- SALUDO / AGRADECIMIENTO / UNKNOWN.

REGLA DE FILTRADO COMERCIAL:
Solo procesamos clientes PYME y RESIDENCIAL. Ignora empleados, gratis, etc.
- "status": Activo, Suspendido, Pausado, Cancelado.
- "periodo": hoy, ayer.

DEFINICIÓN TÉCNICA DE DATA MAESTRA:
- La "Data Maestra" incluye a **TODOS** los clientes sin excepción: Activos, Suspendidos, Pausados, Cancelados y Por Instalar.
- Incluye todos los tipos (Residencial, Pyme, Empleado, etc.).
- Incluye ambos ciclos (15 y 30).
- Incluye migrados y no migrados.
- **Si el usuario te pide la "Data Maestra", no le preguntes por estatus ni filtros, entrégale el resumen total directamente.**

REGLA DE EXCLUSIVIDAD DE CLIENTES COMERCIALES:
- **IMPORTANTE**: Al usuario solo le interesan los clientes de tipo **PYME** y **RESIDENCIAL**. 
- Siempre que el usuario pregunte por cantidad de clientes o ingresos, el sistema DEBE filtrar automáticamente para excluir: Empleados, Gratuitos, Institucionales, Cortesía y Proyectos. 
- A nadie le importa la data de esas categorías no comerciales en las consultas rápidas.

REGLA DE FLUJO OBLIGATORIO:
1. **Paso 1: Estatus**: Si falta el estatus ("activos", "suspendidos", etc.), pídelo.
2. **Paso 2: Ciclo (SOLO PARA SUSPENDIDOS)**: Si el usuario eligió "Suspendido" y aún no dice qué ciclo, el bot DEBE preguntar: "¿Deseas ver los suspendidos del **Ciclo 15** o del **Ciclo 30**?".
3. **Paso 3: Periodo**: Una vez aclarado lo anterior, pregunta si desean los datos de **Hoy** o de **Ayer**.

REGLA DE PARÁMETROS:
- "status": Activo, Suspendido, Pausado, Cancelado.
- "ciclo": "15" o "30".
- "periodo": hoy, ayer.
- "urbanismo": Nombre del sector.

REGLA DE EXCEL Y REPORTES:
- El bot **SOLO** genera el **Reporte Ejecutivo**. No genera el excel de operaciones ni el de planes.
- **Solo ofrece el reporte si el usuario lo pide explícitamente** (ej: "genérame un excel", "descarga el reporte", "pásame un archivo"). No lo ofrezcas por iniciativa propia.
- Al ofrecer el Reporte Ejecutivo, explícale con detalle que incluye: 
    1️⃣ **Dashboard Visual**: Con KPIs de Clientes, Ingresos y Ticket Promedio.
    2️⃣ **Análisis Gráfico**: Distribución de estatus y el Top de Urbanismos.
    3️⃣ **Detalle de Clientes**: Una hoja con la lista exacta de clientes y las columnas que él elija.
- Si pide el **Excel de Operaciones** (técnico con IP/MAC): Explícale que ese archivo se descarga en la sección **Top Urbanismos**.
- Si pide el **Excel de Planes**: Explícale que se descarga en la sección **Ventas**.

REGLA DE HUMANIZACIÓN:
- Sé directo y amable. Llama al usuario por su nombre: **${userName}**.
- Si eligieron suspendidos y no hay ciclo, haz la pregunta del ciclo 15 ó 30.
- Finalmente pregunta por el periodo (hoy/ayer).
- **No uses markdown exagerado**, mantén la elegancia.`;


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
        headers: {
            "Content-Type": "application/json"
        },
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
        const errorText = await response.text();
        console.error("Gemini API Error Detail:", response.status, errorText);
        try {
            const errorData = JSON.parse(errorText);
            throw new Error(errorData.error?.message || `Error HTTP: ${response.status}. Detalle: ${errorText}`);
        } catch (e) {
            throw new Error(`Error HTTP: ${response.status}. Respuesta: ${errorText.substring(0, 100)}`);
        }
    }

    const result = await response.json();
    if (result.error) {
        throw new Error(result.error.message);
    }

    if (!result.candidates || result.candidates.length === 0) {
        throw new Error("No se obtuvo respuesta del modelo");
    }

    const content = result.candidates[0].content.parts[0].text.trim();
    return JSON.parse(content);
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
            value: `${formatCurrency(p.revenue)}|(${p.count} cl. x $${p.cost})`,
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
        filtered = filtered.filter(c => mapCycleValue(c.cycle) === cicloReq);
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
        const tipoParams = Array.isArray(parameters.tipo) ? parameters.tipo : [parameters.tipo];
        const normalizedReqs = tipoParams.map(t => normalizeText(t));

        filtered = filtered.filter(c => {
            let tipoCliente = null;
            if (c.client_subdivision) tipoCliente = extractTipo(c.client_subdivision);
            if (!tipoCliente && c.client_type_name) tipoCliente = c.client_type_name.trim().toUpperCase();
            if (!tipoCliente) tipoCliente = "OTROS";

            const rawClientType = normalizeText(tipoCliente);
            // Si el requerimiento es "residencial" o similar, buscamos coincidencia parcial
            return normalizedReqs.some(req => {
                let r = req;
                if (r.includes('residencial')) r = 'residencial';
                if (r.includes('pyme')) r = 'pyme';
                return rawClientType.includes(r);
            });
        });

        appliedTexts.push(`Tipo: ${tipoParams.join(" y ")}`);
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

export const processQuery = async (message, data, history = [], userName = "", currentPage = "") => {
    if (!data || !data.results) {
        return { text: "Aún no tengo datos cargados para analizar. Por favor, asegúrate de haber iniciado sesión.", isCard: false };
    }

    const lastBotMsg = history.length > 0 ? history[history.length - 1] : null;
    let intent = null;
    let parameters = null;
    let fromClarification = false;
    let query = normalizeText(message);
    let clientes = data.results;
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
    
    let dataLabel = isTodayQuery ? "Hoy" : "Ayer";
    
    // --- CÁLCULO DINÁMICO DE AYER (Para evitar hardcoding) ---
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayLabel = yesterday.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });

    // --- DETECTOR DE FECHAS NO DISPONIBLES (Semanas/Meses) ---
    // Mejoramos el detector para evitar falsos positivos con "pymes"
    const pastKeywords = ["semana", "mes", "pasado", "antier", "hace", "historico", "2024", "2023", "2022"];
    const isOtherPastDate = pastKeywords.some(w => {
        // Usamos regex para asegurar límites de palabra y evitar "pymes" -> "mes"
        const regex = new RegExp(`\\b${w}\\b`, "i");
        return regex.test(query);
    }) && !query.includes("ayer") && !query.includes(yesterday.getDate().toString());

    if (isOtherPastDate && !query.includes("ventas") && !query.includes("historico")) {
        return {
            text: `Lo siento ${userName}, en el chatbot actualmente tengo visibilidad total de la data de **Hoy** y el cierre de **Ayer (${yesterdayLabel})**. No cuento con acceso directo a históricos de semanas o meses anteriores para clientes específicos por ahora, pero puedo darte un resumen de hoy muy detallado.`,
            isCard: false
        };
    }

    // --- INTERCEPTOR: Clarificación Hoy/Ayer ---
    if (lastBotMsg?.contextType === 'clarify_data_source' && (query.includes("hoy") || query.includes("ayer") || query.includes("16"))) {
        intent = lastBotMsg.cardData.originalIntent;
        parameters = lastBotMsg.cardData.savedParameters;
        fromClarification = true;
        
        if (query.includes("ayer") || query.includes("16")) {
            isTodayQuery = false;
        } else {
            isTodayQuery = true;
        }
    }

    // --- CARGA DE DATA SEGÚN SELECCIÓN ---
    if (!isTodayQuery) {
        const histData = await fetchHistoricalClients();
        if (histData && histData.length > 0) {
            clientes = histData;
            dataLabel = "Corte Ayer (8:00 PM)";
        }
    } else {
        dataLabel = `Hoy (Actualizado: ${getLastUpdateTime()})`;
    }

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
            const nameNorm = normalizeText(contractCountName);
            const matches = clientes.filter(c => normalizeText(c.client_name).includes(nameNorm));

            if (matches.length === 0) {
                registerUnansweredQuery(query, userName, currentPage);
                return {
                    text: `Revisé la base de datos ${userName} y no encontré ningún registro asociado a **"${contractCountName}"**. Puede ser que el nombre esté escrito diferente o que aún no esté cargado en el sistema. ¿Quieres que intente con otro nombre o número de cédula?`,
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

            // Interceptor Data Source (Hoy vs Ayer)
            const metricIntents = ['TOTAL_CLIENTES', 'AMBOS_METRICAS', 'ESTADOS', 'TIPOS_CLIENTE'];
            const hasDateKeyword = query.includes("ayer") || query.includes("hoy") || query.includes("16") || query.includes("respaldo");
            if (metricIntents.includes(intent) && !hasDateKeyword && !fromClarification && !periodKnownFromHistory) {
                return {
                    text: `Perfecto ${userName}, ¿Deseas ver los resultados de **Hoy** o el cierre de **Ayer**?`,
                    isCard: false,
                    contextType: 'clarify_data_source',
                    cardData: { originalIntent: intent, savedParameters: parameters }
                };
            }

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

                // 1. Clarificación de Estado (Solo si no hay otros filtros de identidad ya aplicados y NO es DATA MAESTRA)
                const isDataMaestra = parameters?.dataMaestra || appliedFiltersText.includes("Universo Total (Data Maestra)");
                
                if (!isDataMaestra && !parameters?.status && !parameters?.nombre && !parameters?.nombres && !parameters?.contrato && intent !== 'ESTADOS' && intent !== 'TIPOS_CLIENTE') {
                    // DISPARAR CLARIFICACIÓN: Si no especifican estado, preguntamos de forma humana
                    return {
                        text: `Prepararé tu reporte de inmediato ${userName}. Para darte la cifra exacta, ¿deseas ver los clientes **Activos**, **Suspendidos**, **Pausados** o **Cancelados**?`,
                        isCard: false,
                        contextType: 'clarify_status',
                        cardData: { originalIntent: intent, savedParameters: parameters }
                    };
                }

                if ((parameters?.status === "Suspendido" || normalizeText(String(parameters?.status)).includes("suspendido")) && !parameters?.ciclo && !fromClarification) {
                     return {
                        text: `Perfecto ${userName}, vamos con los **Suspendidos**. ¿Deseas ver los del **Ciclo 15** o del **Ciclo 30**?`,
                        isCard: false,
                        contextType: 'clarify_cycle',
                        cardData: { originalIntent: intent, savedParameters: parameters }
                    };
                }

                // 2. Clarificación de Periodo (Hoy vs Ayer)
                // Si ya tenemos el estatus pero el usuario no ha especificado si "hoy" o "ayer" y no viene de una clarificación previa
                if (!isDataMaestra && (parameters?.status || parameters?.nombre || parameters?.contrato) && !explicitlyHoy && !explicitlyAyer && !periodKnownFromHistory && !fromClarification) {
                    return {
                        text: `¡Entendido ${userName}! Ya tengo el estatus. Por último, ¿deseas la información actualizada de **Hoy** o prefieres el cierre de **Ayer**?`,
                        isCard: false,
                        contextType: 'clarify_data_source', // Reutilizamos el tipo existente
                        cardData: { originalIntent: intent, savedParameters: parameters }
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
                        const tipoParams = Array.isArray(parameters?.tipo) ? parameters.tipo : (parameters?.tipo ? [parameters.tipo] : []);
                        const isMultipleTypes = tipoParams.length > 1;

                        if (isMultipleTypes && (intent === 'TOTAL_CLIENTES' || intent === 'TIPOS_CLIENTE')) {
                            const statusLabel = parameters?.status ? (Array.isArray(parameters.status) ? parameters.status.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(" y ") : parameters.status.charAt(0).toUpperCase() + parameters.status.slice(1)) : "Clientes";
                            const formatCurrencyLoc = (val) => `$${parseFloat(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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

                        return {
                            text: `Excelente ${userName}, he filtrado la base de clientes según lo solicitado: \n(${appliedFiltersText.join(', ')} | Solo Pyme y Residencial)\n\n**Si necesitas el reporte detallado en Excel, solo dímelo.**`,
                            isCard: true,
                            cardData: {
                                periodPreference: isTodayQuery ? "Hoy" : yesterdayLabel,
                                title: dataLabel.startsWith("Hoy") ? (appliedFiltersText.length > 0 ? "Reporte Filtrado" : "Total Clientes") : `Reporte: ${dataLabel}`,
                                value: filteredClientes.length,
                                subtitle: appliedFiltersText.length > 0 ? appliedFiltersText.join(" | ") : (dataLabel.startsWith("Hoy") ? "clientes totales" : "Snapshot histórico"),
                                color: "#3498db",
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

                // 1. Filtrar por Status (Flujo Humano: Preguntar si no existe, a menos que sea DATA MAESTRA)
                const isDataMaestraIng = parameters?.dataMaestra || appliedFiltersText.includes("Universo Total (Data Maestra)");

                if (!isDataMaestraIng && !parameters?.status && !parameters?.nombre && !parameters?.nombres && !parameters?.contrato) {
                    // Si no especifican estado, preguntamos de forma humana antes de calcular
                    return {
                        text: `He detectado tu consulta sobre ingresos ${userName}. ¿Deseas ver el dinero proyectado para clientes **Activos**, **Suspendidos**, **Pausados** o **Cancelados**?`,
                        isCard: false,
                        contextType: 'clarify_status',
                        cardData: { originalIntent: intent, savedParameters: parameters }
                    };
                }

                if ((parameters?.status === "Suspendido" || normalizeText(String(parameters?.status)).includes("suspendido")) && !parameters?.ciclo && !fromClarification) {
                     return {
                        text: `Excelente ${userName}, vamos con los **Suspendidos**. ¿Deseas ver el dinero de los del **Ciclo 15** o del **Ciclo 30**?`,
                        isCard: false,
                        contextType: 'clarify_cycle',
                        cardData: { originalIntent: intent, savedParameters: parameters }
                    };
                }

                // 2. Clarificación de Periodo (Hoy vs Ayer)
                if (!isDataMaestraIng && (parameters?.status || parameters?.nombre || parameters?.contrato) && !explicitlyHoy && !explicitlyAyer && !periodKnownFromHistory && !fromClarification) {
                    return {
                        text: `¡Excelente ${userName}! Ya tengo el estatus para el cálculo. ¿Deseas usar la data de **Hoy** o la del cierre de **Ayer**?`,
                        isCard: false,
                        contextType: 'clarify_data_source',
                        cardData: { originalIntent: intent, savedParameters: parameters }
                    };
                }

                // 2. Ciclo
                if (parameters?.ciclo) {
                    const cicloReq = String(parameters.ciclo);
                    filteredClientes = filteredClientes.filter(c => mapCycleValue(c.cycle) === cicloReq);
                    appliedFiltersText.push(`Ciclo: ${cicloReq} `);
                }

                // 3. Filtrar por Agencia (Prioridad si el usuario dice "agencia de X")
                if (parameters?.agencia) {
                    let ageReq = normalizeText(parameters.agencia);
                    // Limpiamos palabras extra
                    ageReq = ageReq.replace("agencia ", "").replace("nodo ", "").trim();

                    // Identificar el Nodo correcto basado en la palabra clave
                    let nodoBuscado = "";
                    if (ageReq.includes("turmero")) nodoBuscado = "NODO TURMERO";
                    else if (ageReq.includes("macaro") || ageReq.includes("mácaro")) nodoBuscado = "NODO MACARO";
                    else if (ageReq.includes("paya")) nodoBuscado = "NODO PAYA";

                    filteredClientes = filteredClientes.filter(c => {
                        // 1. Intentar match por el dato en duro si existe
                        const p1 = normalizeText(c.agency_name || '').includes(ageReq) || normalizeText(c.client_agency || '').includes(ageReq);
                        // 2. Intentar match cruzando el sector con el mapa de agencias (Igual que hace TopUrbanismo)
                        let p2 = false;
                        if (c.sector_name && sectorAgenciaMap[c.sector_name]) {
                            const mapUrb = normalizeText(sectorAgenciaMap[c.sector_name]);
                            p2 = nodoBuscado ? sectorAgenciaMap[c.sector_name] === nodoBuscado : new RegExp(`(^|\\b |\\s)${ageReq} (\\b |\\s | $)`, 'i').test(mapUrb);
                        }
                        return p1 || p2;
                    });

                    // Asegurar etiqueta clara en la respuesta
                    appliedFiltersText.push(`Agencia: ${nodoBuscado ? nodoBuscado.replace('NODO ', '') : parameters.agencia} `);

                    // Removido temporalmente el bloqueo de similitud para permitir Agencia Paya + Paya Abajo
                }

                // 4. Filtrar por Urbanismo (Solo si no fue sobrescrito por la validación de Agencia)
                if (parameters?.urbanismo) {
                    const matchedSector = findBestUrbanismoMatch(parameters.urbanismo);
                    if (Array.isArray(matchedSector)) {
                        return {
                            text: `He encontrado varios sectores para ingresos. ¿A cuál te refieres?\n\n` +
                                matchedSector.map(s => `- **${s}**`).join('\n') +
                                `\n\nPor favor, confírmame el nombre completo.`,
                            isCard: false,
                            contextType: 'clarify_urbanismo',
                            cardData: { originalIntent: intent, savedParameters: parameters }
                        };
                    }

                    if (matchedSector) {
                        filteredClientes = filteredClientes.filter(c => c.sector_name === matchedSector);
                        appliedFiltersText.push(`Urbanismo: ${matchedSector} `);
                    } else {
                        // NOVEDAD: Búsqueda difusa con niveles de confianza
                        const result = getFuzzyUrbanismoSuggestion(parameters.urbanismo);

                        if (result.match && result.score >= 0.8) {
                            // NIVEL 1: ALTA CONFIANZA -> Auto-corrección humana proactiva
                            const autoCorrection = result.match;
                            filteredClientes = filteredClientes.filter(c => c.sector_name === autoCorrection);
                            appliedFiltersText.push(`Urbanismo: ${autoCorrection} `);
                        } else if (result.match && result.score >= 0.6) {
                            // NIVEL 2: CONFIANZA MEDIA -> Sugerencia "Did you mean?"
                            return {
                                text: `No encontré el sector "${parameters.urbanismo}". ¿Quizás quisiste decir **"${result.match}"**?\n\nPor favor, verifica el nombre e intenta de nuevo.`,
                                isCard: false
                            };
                        } else {
                            // FALLBACK SEGURO: BAJA CONFIANZA -> Abortar en vez de buscar amplio
                            registerUnansweredQuery(query, userName, currentPage);
                            return {
                                text: `Disculpa, pero no encuentro ningún urbanismo o sector llamado "${parameters.urbanismo}" en mis registros. ¿Podrías indicarme el nombre exacto o verificar si está bien escrito?`,
                                isCard: false
                            };
                        }
                    }
                }

                // 5. Filtrar por Tipo (Pyme, Residencial, etc.)
                if (parameters?.tipo) {
                    const extractTipo = (subdivision) => {
                        if (!subdivision) return null;
                        const partes = subdivision.split("_");
                        if (partes.length >= 2 && partes[1]) return partes[1].toUpperCase();
                        return null;
                    };

                    const tipoReq = normalizeText(parameters.tipo);
                    filteredClientes = filteredClientes.filter(c => {
                        let tipoCliente = null;
                        if (c.client_subdivision) tipoCliente = extractTipo(c.client_subdivision);
                        if (!tipoCliente && c.client_type_name) tipoCliente = c.client_type_name.trim().toUpperCase();
                        if (!tipoCliente) tipoCliente = "OTROS";

                        return normalizeText(tipoCliente).includes(tipoReq);
                    });
                    appliedFiltersText.push(`Tipo: ${parameters.tipo} `);
                }

                // 6. Filtrar por Migrado
                if (parameters?.migrado) {
                    const migradoReq = normalizeText(parameters.migrado);
                    if (migradoReq.includes("no migrado")) {
                        filteredClientes = filteredClientes.filter(c => !c.migrate);
                        appliedFiltersText.push(`Categoría: No migrados`);
                    } else if (migradoReq.includes("migrado")) {
                        filteredClientes = filteredClientes.filter(c => c.migrate);
                        appliedFiltersText.push(`Categoría: Migrados`);
                    }
                }

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

            case 'HISTORICO_VENTAS': {
                const salesData = await getFullSalesData();
                const year = parameters?.year ? String(parameters.year) : new Date().getFullYear().toString();
                const monthIdx = parameters?.month ? parseInt(parameters.month) - 1 : new Date().getMonth();
                const yearData = salesData[year] || new Array(12).fill(0);
                const mesesNombres = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
                const monthName = mesesNombres[monthIdx] || mesesNombres[new Date().getMonth()];
                const value = yearData[monthIdx] || 0;
                
                const totalYear = yearData.reduce((a, b) => a + b, 0);
                const avgMonth = totalYear / 12;

                return {
                    text: `Claro ${userName}, he consultado el histórico global de ventas. En **${monthName} de ${year}** cerramos con un total de **${value} ventas** reales.\n\n` +
                          `En todo el año **${year}** logramos acumular **${totalYear} ventas** (un promedio mensual de ${avgMonth.toFixed(1)}).`,
                    isCard: true,
                    cardData: {
                        title: `Ventas en ${monthName}`,
                        value: value,
                        subtitle: `Año ${year}`,
                        color: "#e67e22",
                        stats: [
                            { label: `Total ${year}`, value: totalYear },
                            { label: "Promedio", value: avgMonth.toFixed(1) }
                        ]
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
                                    { label: "Plan", value: `${cliente.plan?.name} ($${cliente.plan?.cost})` },
                                    { label: "Teléfono", value: cliente.client_mobile || "N/A" },
                                    { label: "Ciclo", value: mapCycleValue(cliente.cycle) },
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
                const nombresReq = parameters?.nombres || (parameters?.nombre ? [parameters.nombre] : []);

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
                                    { label: "Ciclo", value: mapCycleValue(cliente.cycle) },
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
                                { label: "Plan", value: `${rawDataTarget.plan?.name} ($${rawDataTarget.plan?.cost})` },
                                { label: "Teléfono", value: rawDataTarget.client_mobile || "N/A" },
                                { label: "Ciclo", value: mapCycleValue(rawDataTarget.cycle) },
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
                    const bankFilter = parameters?.banco || null;
                    const methodFilter = parameters?.metodo || null;
                    const startDate = parameters?.startDate || null;
                    const endDate = parameters?.endDate || null;

                    const { payments, startDate: sDate, endDate: eDate } = await fetchBankPayments(bankFilter, methodFilter, startDate, endDate);

                    const formatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
                    const startLabel = new Date(sDate + 'T12:00:00').toLocaleDateString('es-VE', formatOptions);
                    const endLabel = new Date(eDate + 'T12:00:00').toLocaleDateString('es-VE', formatOptions);
                    
                    const labelFecha = sDate === eDate 
                        ? `el **${startLabel}**` 
                        : `desde el **${startLabel}** hasta el **${endLabel}**`;

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
                    
                    // --- CALCULO DE META vs REAL (Solicitado por Sr. Elisaul) ---
                    let activeClientsInSelection = clientes.filter(c => c.status_name === "Activo");
                    if(cicloFilter) activeClientsInSelection = activeClientsInSelection.filter(c => mapCycleValue(c.cycle) === String(cicloFilter));
                    
                    const totalExpectedAmount = activeClientsInSelection.reduce((s, c) => s + parseFloat(c.plan?.cost || 0), 0);
                    const totalExpectedClients = activeClientsInSelection.length;
                    
                    const totalUsd = payments.reduce((s, p) => s + parseFloat(p.amount_data?.amount_usd || 0), 0);
                    const totalBs = payments.reduce((s, p) => s + parseFloat(p.amount_data?.amount_bs || 0), 0);
                    const totalPagos = payments.length;

                    const pendingAmount = Math.max(0, totalExpectedAmount - totalUsd);
                    const pendingClients = Math.max(0, totalExpectedClients - totalPagos);

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
                        desglose += `\n🏦 **${banco}** — **${d.count} pago(s)**\n     $${d.totalUsd.toFixed(2)} USD | Bs ${d.totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })} — ${metodos}`;
                    });

                    // --- Stats para la tarjeta visual ---
                    const stats = [
                        { label: '💰 Monto Recaudado', value: `$${totalUsd.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`, color: '#2ecc71' },
                        { label: '💳 Pendiente por Cobrar', value: `$${pendingAmount.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`, color: '#f1c40f' },
                        { label: '👥 Clientes Pendientes', value: pendingClients, color: '#e74c3c' }
                    ];

                    // El indicador especial que pidió el jefe (badge inferior)
                    stats.push({ label: '📊 Total de pagos registrados', value: totalPagos, color: '#3498db' });

                    const cycleText = cicloFilter ? ` del **Ciclo ${cicloFilter}**` : '';

                    return {
                        text: `**${userName}**, aquí tiene el balance de cobranza${cycleText} ${introLabel}:\n${desglose}\n\n📉 **Balance Final:**\n- Recaudado: **$${totalUsd.toFixed(2)}** (${totalPagos} pagos)\n- Pendiente: **$${pendingAmount.toFixed(2)}** (~${pendingClients} clientes)`,
                        isCard: true,
                        cardData: {
                            title: `💳 Balance de Ingresos`,
                            value: `$${totalUsd.toFixed(2)} USD`,
                            subtitle: cicloFilter ? `Ciclo ${cicloFilter} | ${totalPagos} pagos` : `${totalPagos} pagos registrados`,
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
                // Registrar consulta no respondida (LOG DE ENTRENAMIENTO sugerido por el jefe)
                registerUnansweredQuery(query, userName, currentPage);

                return {
                    text: `Lo siento **${userName}**, mi Inteligencia Artificial no logró procesar esa solicitud específica sobre "${query}". He anotado tu consulta en mi **log de entrenamiento** para que mis desarrolladores puedan enseñarme a responderla pronto.\n\n¿Deseas intentar con una búsqueda de cliente, sector o ver los indicadores generales?`,
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
