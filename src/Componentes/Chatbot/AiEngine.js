/**
 * Motor Híbrido: NLP por OpenAI + Filtrado y Cálculos Locales
 */

const normalizeText = (text) => {
    return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

const extractNumber = (text) => {
    const match = text.match(/\d+/);
    return match ? match[0] : null;
};

const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD' }).format(value);
};

const findBestUrbanismoMatch = (queryUrb) => {
    if (!queryUrb) return null;
    const normalizedQuery = normalizeText(queryUrb);
    const availableSectors = Object.keys(sectorAgenciaMap);

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
    "Urb. Vista Hermosa La Julia": "NODO MACARO", "Guerrero de Chavez": "NODO PAYA", "19 de Abril": "NODO MACARO"
};

const pageKnowledge = {
    "/TopUrbanismo": {
        name: "Líderes de Sectores (Top Urbanismos)",
        description: "Aquí medimos el rendimiento de cada zona urbana para saber nuestras fortalezas.",
        data: "Muestro el total de clientes, ingresos por sector y tarjetas detalladas por zona (Paya, Turmero, etc.).",
        guide: "💡 **Tip rápido**: Usa los filtros de arriba y genera el **Excel** para ver datos técnicos avanzados como **IPs y MACs** de los clientes."
    },
    "/Indicadores": {
        name: "Directorio Principal de Clientes",
        description: "Esta es tu base de datos en tiempo real. Un directorio completo para auditorías o soporte.",
        data: "Tienes contadores rápidos por estado (Activos, Suspendidos, etc.) y la lista completa con Nombres, Planes y Costos. (Nota: IPs/MACs solo disponibles en Excel).",
        guide: "💡 **Tip rápido**: Haz clic en las tarjetas de colores arriba para filtrar la lista al instante."
    },
    "/Ventas": {
        name: "Monitor de Operaciones Comerciales",
        description: "El panel táctico para ver el pulso de las instalaciones y ventas.",
        data: "Muestro el Top 5 de planes más vendidos, activaciones recientes y el 'Directorio Maestro' de Fibra Óptica.",
        guide: "💡 **Tip rápido**: Revisa el ranking para ver qué plan tiene más éxito o audita las migraciones en la tabla maestra."
    },
    "/Admin": {
        name: "Centro de Comando Administrativo (Dashboard)",
        description: "El panel global para la alta gerencia con métricas de desempeño y finanzas.",
        data: "Aquí puedes ver los informes interactivos (como PowerBI), controles de cancelaciones y flujos de ingresos.",
        guide: "💡 **Tip rápido**: Usa los gráficos interactivos del informe para analizar la rentabilidad a fondo."
    },
    "/Ventascalle2": {
        name: "Operaciones de Calle (Ventas Externas)",
        description: "Panel dedicado al seguimiento de las ventas y operaciones en terreno.",
        data: "Métricas de captación externa y seguimiento de asesores.",
        guide: "💡 **Tip rápido**: Monitorea aquí el rendimiento del equipo de promotores de calle."
    }
};

// Función para llamar a OpenAI
const callOpenAI = async (query, history, currentPage = "") => {
    const apiKey = process.env.REACT_APP_GEMINI_API_KEY || process.env.REACT_APP_OPENAI_API_KEY;
    const context = pageKnowledge[currentPage] || null;

    if (!apiKey) {
        throw new Error("No hay API Key configurada. Por favor declara REACT_APP_GEMINI_API_KEY en tu .env");
    }

    let dynamicContextPrompt = "";
    if (context) {
        dynamicContextPrompt = `\nCONTEXTO ACTUAL DE LA APP:
        El usuario está en la sección: "${context.name}".
        - Lo que muestra: ${context.description}
        - Información visual: ${context.data}
        - Guía de uso: ${context.guide}
        
        Si el usuario pregunta qué ve, cómo usar esta sección o similares, usa esta información para responder de forma amable y precisa.`;
    }

    const systemPrompt = `NO DEBES INVENTAR DATOS NUMÉRICOS. Tu tarea es doble: 
1. Identificar la intención y parámetros técnicos para que el sistema busque la data.
2. Redactar una respuesta humana, amable y contextualizada en el campo "message".

DEBES DEVOLVER UN JSON ESTRICTO CON LA SIGUIENTE ESTRUCTURA:
{"intent": "NOMBRE_DEL_INTENT", "parameters": { "param_name": "param_value" }, "message": "Tu respuesta humanizada aquí"}
${dynamicContextPrompt}
INTENCIONES DISPONIBLES:
- TOTAL_CLIENTES: El usuario quiere saber cuántos clientes hay registrados/totales o conteos específicos. Parámetros opcionales: {"status": "Activo" | "Suspendido" | "Pausado" | "Por Instalar" | "Cancelado", "ciclo": "15" | "25", "urbanismo": "nombre del sector", "agencia": "nombre", "tipo": "Pyme" | "Residencial" | "Intercambio" | "Empleado" | "Gratis", "migrado": "Migrado" | "No migrado"}
- INGRESOS: El usuario pregunta por ingresos, ventas, ganancias o facturación. Si menciona un lugar o zona (ej: "ingresos de mata caballo"), asígnalo al parámetro "urbanismo" aunque no diga la palabra explícita. Trata de extraer el nombre del sector lo más completo posible. Parámetros opcionales: {"status": "Activo" | "Suspendido" | "Pausado" | "Por Instalar" | "Cancelado", "ciclo": "15" | "25", "urbanismo": "nombre del sector", "agencia": "nombre", "tipo": "Pyme" | "Residencial" | "Intercambio" | "Empleado" | "Gratis", "migrado": "Migrado" | "No migrado"}
- TOP_URBANISMO: El usuario pregunta por el mejor sector, urbanismo líder o con más clientes.
- AMBIGUEDAD_METRICA: ¡SÚPER CRÍTICO! Usa esto si el usuario menciona cualquier filtro (sector, estatus, tipo, agencia) o dice simplemente "clientes [filtro]" (ej: "clientes activos", "los de paya", "pymes", "residenciales de turmero") pero NO incluye una palabra de acción métrica clara (cuantos, total, ingresos, plata). Frases como "activos de paya", "pymes de turmero", "quisiera los residenciales", "buscame los suspendidos" DEBEN ser categorizadas aquí.
- BUSCAR_CONTRATO: El usuario te da un NÚMERO EXACTO para buscar el perfil de un único cliente. Ej: "el contrato es 3063", "busca el 4301". Param requerido: {"contrato": "1234"} (EL PARÁMETRO DEBE SER SOLO NUMÉRICO).
- BUSCAR_NOMBRE: El usuario te da un NOMBRE DE PERSONA para buscar el perfil de ese cliente. Ej: "busca a Reyes", "se llama Juan". Param requerido: {"nombre": "Juan"}. NO uses esto para nombres de sectores urbanos.
- ESTADOS: El usuario pregunta por la distribución o estado de los clientes (activos, suspendidos, etc.). Parámetros opcionales: {"urbanismo": "nombre", "agencia": "nombre", "tipo": "Pyme" | "Residencial" | "Intercambio" | "Empleado" | "Gratis"}
- ROUTERS_OFFLINE: El usuario pregunta por clientes apagados, offline o sin conexión.
- PLANES: El usuario pregunta por los planes o paquetes más vendidos.
- TIPOS_CLIENTE: El usuario pregunta por la distribución de pymes, residenciales, etc.
- SALUDO: El usuario solo está saludando ("hola", "buenos días").
- AGRADECIMIENTO: El usuario solo está dando las gracias ("gracias", "muchas gracias").
- GUIA_APP: El usuario pregunta para qué sirve la app.
- SEGUIMIENTO_CLIENTE: ¡ATENCIÓN! ESTE ES SOLO SI EL USUARIO PIDE UN DATO (CUAL ES SU PLAN, DONDE VIVE, SU TELEFONO, DE QUE CICLO ES, CUANTO DEBE) PERO NO INGRESA NINGÚN NOMBRE NI NÚMERO DE CONTRATO NUEVO EN LA FRASE. Ej: "¿en qué ciclo está?", "¿cuanto debe?". Parámetros permitidos: {"accion": "direccion" | "ciclo" | "telefono" | "red" | "plan" | "deuda"}
  * MÁXIMA REGLA: Frases iniciales vagas como "necesito saber informacion de un cliente", "buscame a alguien", o "quiero saber un dato" NO SON SEGUIMIENTO. Si no te pregunta expresamente por el plan, el ciclo, el teléfono, la dirección, la deuda o la red, elije BUSQUEDA_VAGA u otro.
  * REGLA ESTRICTA 2: Si el usuario dice "es el numero 3063" o "se llama Reyes", eso es BUSCAR_CONTRATO o BUSCAR_NOMBRE, NUNCA es seguimiento. 
- GENERAR_EXCEL: SOLO si el usuario pide específicamente un ARCHIVO, EXCEL o DOCUMENTO. Ej: "generame un excel", "descargar archivo", "bájame el excel", "claro", "si por favor" (si el bot acaba de ofrecer un excel). NO uses esto para frases como "dame la data", "muestrame los clientes" o "listado de...".
- CONTEXTO_APP: Usa esta intención si el usuario pregunta específicamente sobre la página actual, qué información hay en pantalla, para qué sirve esta sección o pide que lo guíes en la vista donde se encuentra actualmente.
- UNKNOWN: Si la intención no coincide con ninguna de las opciones anteriores.

REGLA DE ORO PARA URBANISMOS: 
Si el usuario menciona un sector, asegúrate de extraerlo tal cual lo dice o su versión más cercana. Ej: "Paya abajo", "Prados II", "Antigua Hacienda de Paya", "Salto Angel". No inventes sufijos si el usuario no los dice.
ATENCIÓN: Existen sectores con NOMBRES DE PERSONA que NO deben confundirse con clientes. Si el usuario menciona: "Isaac Oliveira", "Tibisay Guevara", "Antonio Jose de Sucre", "Arturo Luis Berti", "Santa Eduviges", "Simon Bolivar", "Guerrero de Chavez", "Lascenio Guerrero" o "Salto Angel", clasifícalos como URBANISMO, NO como nombre de cliente o seguimiento.

REGLA DE PERSISTENCIA DE FILTROS:
Si el usuario hace una pregunta de continuidad (ej: "¿y los pausados?", "¿ahora los activos?"), DEBES mantener el "urbanismo" o "agencia" mencionado en el mensaje anterior como parámetros, cambiando solo el "status" o el filtro solicitado. Solo limpia los filtros si el usuario cambia drásticamente de tema o menciona un nuevo sector explícitamente.

REGLA SOBRE DATOS TÉCNICOS (IP/MAC):
Si el usuario pregunta por la IP o MAC de clientes, explícale de forma humana (en el campo "message") que esa información NO se ve directamente en pantalla por seguridad y espacio, pero que se encuentra en los reportes de EXCEL. Indícale que puede ir a 'Top Urbanismos', filtrar y descargar el reporte, o que tú mismo puedes generarle un Excel aquí mismo si lo solicita. 

REGLA DE HUMANIZACIÓN:
- Evita sonar como un robot. No uses siempre la misma estructura.
- Si el usuario te pregunta por la página actual o qué hay en pantalla, usa la información del "CONTEXTO ACTUAL DE LA APP" para explicarlo con tus propias palabras, de forma fluida, como si estuvieras viendo la pantalla con él.
- Si saludan o agradecen, responde de forma variada y cálida.`;

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

    const conteoPlanes = clientes.reduce((acc, curr) => {
        if (validStatus.includes(curr.status_name)) {
            const planName = curr.plan?.name || 'Sin Plan';
            acc[planName] = (acc[planName] || 0) + 1;
        }
        return acc;
    }, {});

    const topPlanes = Object.entries(conteoPlanes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([plan, count]) => ({
            label: plan,
            value: count
        }));

    return {
        text: `Estos son los planes o paquetes más populares entre tus clientes(Filtro: ${titleSuffix}): `,
        isCard: true,
        contextType: 'planes',
        cardData: {
            title: "Planes más populares",
            subtitle: `Basado en clientes ${titleSuffix} `,
            color: "#9b59b6",
            stats: topPlanes
        }
    };
};

// Función auxiliar para aplicar filtros comunes
const getFilteredDataset = (clientes, parameters, query = "") => {
    let filtered = clientes;
    let appliedTexts = [];

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
        const statusStr = normalizeText(parameters.status);
        filtered = filtered.filter(c => {
            const allInfoStr = normalizeText(`${c.client_subdivision || ''} ${c.status_name || ''} `);
            return allInfoStr.includes(statusStr);
        });
        appliedTexts.push(`Estado: ${parameters.status}`);
    } else if (parameters?.status === 'Todos') {
        appliedTexts.push(`Estado: Todos`);
    }

    // 2. Ciclo
    if (parameters?.ciclo) {
        const cicloReq = String(parameters.ciclo);
        filtered = filtered.filter(c => String(c.cycle) === cicloReq);
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
        const matchedSector = findBestUrbanismoMatch(parameters.urbanismo);
        if (matchedSector && !Array.isArray(matchedSector)) {
            filtered = filtered.filter(c => c.sector_name === matchedSector);
            appliedTexts.push(`Urbanismo: ${matchedSector}`);
        } else {
            const urbReq = normalizeText(parameters.urbanismo);
            filtered = filtered.filter(c => normalizeText(c.sector_name || '').includes(urbReq));
            appliedTexts.push(`Urbanismo: ${parameters.urbanismo}`);
        }
    }

    // 5. Tipo
    const extractTipo = (subdivision) => {
        if (!subdivision) return null;
        const partes = subdivision.split("_");
        if (partes.length >= 2 && partes[1]) return partes[1].toUpperCase();
        return null;
    };

    if (parameters?.tipo) {
        let tipoReq = normalizeText(parameters.tipo);
        // Estandarizar "residenciales" a "residencial" para asegurar match local
        if (tipoReq.includes('residencial')) tipoReq = 'residencial';

        filtered = filtered.filter(c => {
            let tipoCliente = null;
            if (c.client_subdivision) tipoCliente = extractTipo(c.client_subdivision);
            if (!tipoCliente && c.client_type_name) tipoCliente = c.client_type_name.trim().toUpperCase();
            if (!tipoCliente) tipoCliente = "OTROS";

            // Re-chequeo para asegurar estandarización en data origen
            const rawClientType = normalizeText(tipoCliente);
            return rawClientType.includes(tipoReq);
        });

        appliedTexts.push(`Tipo: ${parameters.tipo}`);
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

export const processQuery = async (message, data, history = [], userName = "", currentPage = "") => {
    if (!data || !data.results) {
        return { text: "Aún no tengo datos cargados para analizar. Por favor, asegúrate de haber iniciado sesión.", isCard: false };
    }

    const clientes = data.results;
    const query = normalizeText(message);

    try {
        let intent = null;
        let parameters = null;
        let fromClarification = false;

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
                        parameters = { ...savedParameters, status: chosenStatus }; // Guardamos el string ('Todos', 'Activo', etc.)
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

                // Interceptor 5: Aceptación de Excel
                if (lastBotMsg.offerExcel && (query.includes("si") || query.includes("claro") || query.includes("favor") || query.includes("generalo") || query.includes("descargar"))) {
                    intent = 'GENERAR_EXCEL';
                    parameters = lastBotMsg.cardData?.parameters || {};
                    fromClarification = true;
                }
            }
        }

        if (!fromClarification) {
            const openAIResult = await callOpenAI(message, history, currentPage);
            intent = openAIResult.intent;
            parameters = openAIResult.parameters;

            // --- INTERCEPTOR LOCAL DE EMERGENCIA PARA MÉTRICAS ---
            // Si OpenAI devuelve una métrica pero el usuario no pidió explícitamente "cuántos" o "dinero"
            const queryLower = normalizeText(message);
            const actionWords = ["cuanto", "total", "numero", "cantidad", "ingreso", "venta", "plata", "dinero", "factura", "conteo", "suma", "busca", "perfil"];
            const hasActionWord = actionWords.some(w => queryLower.includes(w));
            const hasFileWord = queryLower.includes("excel") || queryLower.includes("archivo") || queryLower.includes("documento") || queryLower.includes("xlsx");

            if ((intent === 'TOTAL_CLIENTES' || intent === 'INGRESOS' || intent === 'ESTADOS' || (intent === 'GENERAR_EXCEL' && !hasFileWord)) && !hasActionWord) {
                console.log("Interceptor Local: Detectada ambigüedad métrica.");
                intent = 'AMBIGUEDAD_METRICA';
            }

            intent = openAIResult.intent;
            parameters = openAIResult.parameters;
            const customMessage = openAIResult.message;

            // ... (resto de interceptores locales si existen)

            if (customMessage && (intent === 'SALUDO' || intent === 'AGRADECIMIENTO' || intent === 'GUIA_APP' || intent === 'CONTEXTO_APP' || intent === 'UNKNOWN')) {
                return { text: customMessage, isCard: false };
            }
        }

        // --- 1.1 INTERCEPTOR DE DESAMBIGUACIÓN (Nombres que son Sectores) ---
        // Si OpenAI cree que es una búsqueda de nombre, pero coincide con un urbanismo conocido, lo corregimos a INGRESOS.
        if (intent === 'BUSCAR_NOMBRE' && parameters?.nombre) {
            const matchedUrbanismo = findBestUrbanismoMatch(parameters.nombre);
            if (matchedUrbanismo) {
                console.log("Re-clasificando búsqueda de nombre como búsqueda de urbanismo:", matchedUrbanismo);
                intent = 'INGRESOS';
                parameters.urbanismo = matchedUrbanismo;
                delete parameters.nombre;

                // Intentar rescatar otros parámetros de la frase
                const lowerMsg = message.toLowerCase();
                if (lowerMsg.includes("activo")) parameters.status = "Activo";
                if (lowerMsg.includes("residencial")) parameters.tipo = "Residencial";
                if (lowerMsg.includes("pyme")) parameters.tipo = "Pyme";
                if (lowerMsg.includes("empleado")) parameters.tipo = "Empleado";
                if (lowerMsg.includes("intercambio")) parameters.tipo = "Intercambio";
                if (lowerMsg.includes("gratis")) parameters.tipo = "Gratis";
                if (lowerMsg.includes("suspendido")) parameters.status = "Suspendido";
                if (lowerMsg.includes("pausado")) parameters.status = "Pausado";
                if (lowerMsg.includes("por instalar")) parameters.status = "Por Instalar";
                if (lowerMsg.includes("cancelado")) parameters.status = "Cancelado";
            }
        }

        // --- 2. EJECUCIÓN DEL FILTRADO/LOGICA LOCAL SEGÚN INTENT ---
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
                    text: `¡Por supuesto! Esta plataforma es el panel de control maestro. Aquí tienes un resumen de cada sección del menú principal: \n\n` +
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
                    text: `¡Claro! Estamos en **${context.name}**. Básicamente ${context.description} Aquí puedes ver ${context.data}. ${context.guide}`,
                    isCard: false
                };
            }

            case 'TOTAL_CLIENTES':
            case 'ESTADOS':
            case 'TIPOS_CLIENTE': {
                let filteredClientes = clientes;
                let appliedFiltersText = [];

                // 1. Filtrar por Estado (NUEVO: Soporte para 'Todos' explicito)
                if (parameters?.status && parameters.status !== 'Todos') {
                    const statusStr = normalizeText(parameters.status);
                    filteredClientes = filteredClientes.filter(c => {
                        const allInfoStr = normalizeText(`${c.client_subdivision || ''} ${c.status_name || ''} `);
                        return allInfoStr.includes(statusStr);
                    });
                    appliedFiltersText.push(`Estado: ${parameters.status} `);
                } else if (parameters?.status === 'Todos') {
                    appliedFiltersText.push(`Estado: Todos`);
                } else if (!parameters?.status && intent !== 'ESTADOS') {
                    // DISPARAR CLARIFICACIÓN: Si no especifican estado, preguntamos de forma humana
                    return {
                        text: `He preparado el resumen, pero ¿deseas filtrar por algún estado específico(** Activos **, ** Suspendidos **, ** Pausados **, ** Cancelados **, ** Por Instalar **) o prefieres verlos ** Todos **? `,
                        isCard: false,
                        contextType: 'clarify_status',
                        cardData: { originalIntent: intent, savedParameters: parameters }
                    };
                }

                // 2. Filtrar por Tipo
                const isTipoIntent = intent === 'TIPOS_CLIENTE' || parameters?.tipo;
                if (parameters?.tipo) {
                    const tipoReq = normalizeText(parameters.tipo);
                    filteredClientes = filteredClientes.filter(c => {
                        const allInfoStr = normalizeText(`${c.client_subdivision || ''} ${c.client_type_name || ''}`);
                        return allInfoStr.includes(tipoReq);
                    });
                    appliedFiltersText.push(`Tipo: ${parameters.tipo}`);
                }

                // --- FILTRADO GEOGRÁFICO UNIFICADO (Agencia) ---
                if (parameters?.agencia) {
                    let ageReq = normalizeText(parameters.agencia).replace("agencia ", "").replace("nodo ", "").trim();
                    let nodoBuscado = "";
                    if (ageReq.includes("turmero")) nodoBuscado = "NODO TURMERO";
                    else if (ageReq.includes("macaro") || ageReq.includes("mácaro")) nodoBuscado = "NODO MACARO";
                    else if (ageReq.includes("paya")) nodoBuscado = "NODO PAYA";

                    filteredClientes = filteredClientes.filter(c => {
                        const p1 = normalizeText(c.agency_name || '').includes(ageReq) || normalizeText(c.client_agency || '').includes(ageReq);
                        let p2 = false;
                        if (c.sector_name && sectorAgenciaMap[c.sector_name]) {
                            const mapUrb = normalizeText(sectorAgenciaMap[c.sector_name]);
                            p2 = nodoBuscado ? sectorAgenciaMap[c.sector_name] === nodoBuscado : new RegExp(`(^|\\b|\\s)${ageReq}(\\b|\\s|$)`, 'i').test(mapUrb);
                        }
                        return p1 || p2;
                    });
                    appliedFiltersText.push(`Agencia: ${nodoBuscado ? nodoBuscado.replace('NODO ', '') : parameters.agencia}`);
                }

                // --- FILTRADO GEOGRÁFICO UNIFICADO (Urbanismo) ---
                if (parameters?.urbanismo) {
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

                    if (matchedSector) {
                        filteredClientes = filteredClientes.filter(c => c.sector_name === matchedSector);
                        appliedFiltersText.push(`Urbanismo: ${matchedSector}`);
                    } else {
                        const suggestion = getFuzzyUrbanismoSuggestion(parameters.urbanismo);
                        if (suggestion.match && suggestion.score >= 0.6) { // Bajé a 0.6 para ser menos estricto con errores de tipeo
                            filteredClientes = filteredClientes.filter(c => c.sector_name === suggestion.match);
                            appliedFiltersText.push(`Urbanismo: ${suggestion.match}`);
                        } else {
                            // FALLBACK SEGURO: Si no se parece a nada que exista en la DB, abortamos y pedimos precisión
                            return {
                                text: `Disculpa, pero no encuentro ningún urbanismo o sector llamado "${parameters.urbanismo}" en mis registros. ¿Podrías indicarme el nombre exacto o verificar si está bien escrito?`,
                                isCard: false
                            };
                        }
                    }
                }

                if (intent === 'TOTAL_CLIENTES' && appliedFiltersText.length === 0) {
                    const total = clientes.length;
                    const activos = clientes.filter(c => c.status_name === "Activo").length;
                    const suspendidos = clientes.filter(c => c.status_name === "Suspendido").length;
                    const pausados = clientes.filter(c => c.status_name === "Pausado").length;
                    const porInstalar = clientes.filter(c => c.status_name === "Por Instalar").length;
                    const cancelados = clientes.filter(c => c.status_name === "Cancelado").length;

                    return {
                        text: "Aquí tienes el resumen completo de la base de datos:",
                        isCard: true,
                        cardData: {
                            title: "Resumen Total",
                            stats: [
                                { label: "Total", value: total },
                                { label: "Activos", value: activos, color: "#27ae60" },
                                { label: "Suspendidos", value: suspendidos, color: "#f1c40f" },
                                { label: "Pausados", value: pausados, color: "#3498db" },
                                { label: "Por Instalar", value: porInstalar, color: "#9b59b6" },
                                { label: "Cancelados", value: cancelados, color: "#e74c3c" }
                            ]
                        }
                    };
                }

                // Si preguntan por tipos especificamente y aplicaron filtros (o es el intent original)
                if (isTipoIntent || intent === 'ESTADOS' || intent === 'TOTAL_CLIENTES') {
                    // Si pidieron un tipo específico o un estado específico, damos resultado directo
                    if (appliedFiltersText.length > 0) {
                        return {
                            text: `He filtrado la base de clientes según lo solicitado: \n(${appliedFiltersText.join(', ')})\n\n**Puedes obtener el reporte detallado en el botón de abajo.**`,
                            isCard: true,
                            offerExcel: true,
                            cardData: {
                                title: "Total Encontrados",
                                value: filteredClientes.length,
                                subtitle: "clientes exactos",
                                color: "#3498db",
                                parameters: parameters,
                                dataset: filteredClientes,
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
                            text: "Esta es la vista satelital actual del estado o condición técnica de tus clientes:",
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
                let filteredClientes = clientes;
                let appliedFiltersText = [];

                // Pre-procesamiento: ¿El usuario llamó "agencia" a lo que realmente es un "urbanismo"?
                if (parameters?.agencia && !parameters?.urbanismo) {
                    const matchedAsUrbanismo = findBestUrbanismoMatch(parameters.agencia);
                    const isBaseAgency = /turmero|macaro|paya/i.test(normalizeText(parameters.agencia));
                    if (matchedAsUrbanismo && !isBaseAgency) {
                        parameters.urbanismo = parameters.agencia;
                        delete parameters.agencia;
                    }
                }

                // NUEVO: Resolución de conflictos entre Agencia y Urbanismo redundantes (evita sobre-filtrado)
                if (parameters?.agencia && parameters?.urbanismo) {
                    const normAgencia = normalizeText(parameters.agencia);
                    const normUrbanismo = normalizeText(parameters.urbanismo);
                    const isBaseAgency = /turmero|macaro|paya/i.test(normAgencia);

                    if (isBaseAgency) {
                        // Si el urbanismo parece ser solo un sub-nombre de la agencia (ej: "El Macaro" vs "Macaro")
                        // y el usuario NO mencionó específicamente el nombre completo del urbanismo en el query,
                        // asumimos que OpenAI lo auto-completó por error.
                        const queryNorm = normalizeText(query);
                        // Si el query dice "agencia macaro" pero NO dice "el macaro" específicamente...
                        if (!queryNorm.includes(normUrbanismo) && queryNorm.includes("agencia")) {
                            delete parameters.urbanismo;
                        }
                    }
                }

                // 1. Filtrar por Status (Flujo Humano: Preguntar si no existe)
                if (parameters?.status) {
                    if (parameters.status !== 'Todos') {
                        const statusStr = normalizeText(parameters.status);
                        filteredClientes = filteredClientes.filter(c => normalizeText(c.status_name).includes(statusStr));
                        appliedFiltersText.push(`Estado: ${parameters.status} `);
                    } else {
                        appliedFiltersText.push(`Estado: Todos`);
                    }
                } else {
                    // Si no especifican estado, preguntamos de forma humana antes de calcular
                    return {
                        text: `He detectado tu consulta sobre ingresos. ¿Deseas ver los resultados para clientes ** Activos **, ** Suspendidos **, ** Pausados **, ** Cancelados **, ** Por Instalar ** o de ** Todos los estados ** combinado ? `,
                        isCard: false,
                        contextType: 'clarify_status',
                        cardData: { originalIntent: intent, savedParameters: parameters }
                    };
                }

                // 2. Filtrar por Ciclo
                if (parameters?.ciclo) {
                    const cicloReq = String(parameters.ciclo);
                    filteredClientes = filteredClientes.filter(c => String(c.cycle) === cicloReq);
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

                const introText = appliedFiltersText.length > 1
                    ? `He calculado los ingresos aplicando los filtros solicitados: \n(${appliedFiltersText.join(', ')})`
                    : "¡Claro! He calculado los ingresos proyectados basados en tu consulta:";

                return {
                    text: introText + "\n\n**He preparado un botón de descarga por si necesitas el listado en Excel.**",
                    isCard: true,
                    offerExcel: true,
                    cardData: {
                        title: "Ingresos Brutos Estimados",
                        value: formatCurrency(ingresosTotales),
                        subtitle: `${clientesCount} clientes base`,
                        color: "#f1c40f",
                        parameters: parameters,
                        dataset: filteredClientes,
                        filtersText: appliedFiltersText
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
                    text: `El urbanismo o sector líder dominante actualmente es ** ${maxUrbanismo}**.`,
                    isCard: true,
                    cardData: {
                        title: "Urbanismo Principal",
                        value: maxUrbanismo,
                        subtitle: `${maxClientes} clientes aportados`,
                        color: "#3498db"
                    }
                };
            }

            case 'ROUTERS_OFFLINE': {
                const offlineCount = clientes.filter(c => c.status_name === "Activo" && c.router_status !== "Online").length;
                const totalActivos = clientes.filter(c => c.status_name === "Activo").length;

                return {
                    text: `He escaneado el nivel de red.De nuestros ${totalActivos} clientes con estatus activo comercial, he detectado lo siguiente: `,
                    isCard: true,
                    cardData: {
                        title: "Fallas de Red Puntos (Offline)",
                        value: offlineCount,
                        subtitle: "Equipos que no están reportando conexión correcta",
                        color: "#e67e22"
                    }
                };
            }

            case 'PLANES': {
                const req = message.toLowerCase(); // OpenAI no me dirá si filtró por activos/suspendidos en planes en este prompt base, pero aplicamos helper si dice 'activo'
                return getPlanesResponse(req, clientes);
            }

            case 'BUSCAR_CONTRATO': {
                const nro = parameters?.contrato || extractNumber(message);
                if (nro) {
                    const cliente = clientes.find(c => String(c.id) === String(nro));
                    if (cliente) {
                        return {
                            text: `¡Búsqueda Exitosa! Este es el perfil del contrato #${nro}: `,
                            isCard: true,
                            contextType: 'viewing_client', // Marcador para seguimientos
                            cardData: {
                                title: cliente.client_name,
                                subtitle: cliente.sector_name,
                                stats: [
                                    { label: "Estado", value: cliente.status_name },
                                    { label: "Plan", value: `${cliente.plan?.name} (${cliente.plan?.cost}$)` },
                                    { label: "Teléfono", value: cliente.client_mobile }
                                ],
                                rawData: cliente
                            }
                        };
                    } else {
                        return { text: `El sistema indica que el contrato #${nro} no existe o no tiene datos indexados.`, isCard: false };
                    }
                }
                return { text: "Clasifiqué que buscas un contrato, pero no logré detectar cuál es el número.", isCard: false };
            }

            case 'BUSCAR_NOMBRE': {
                const nombreQ = parameters?.nombre ? normalizeText(parameters.nombre) : null;
                if (!nombreQ) {
                    return { text: "No logré captar el nombre en tu frase. Por favor dímelo nuevamente.", isCard: false };
                }

                const clientesEncontrados = clientes.filter(c => normalizeText(c.client_name).includes(nombreQ));

                if (clientesEncontrados.length === 0) {
                    return { text: `Consulté la base de datos pero no encontré ninguna coincidencia directa con el nombre o apellido "${parameters.nombre}". ¿Se escribe distinto ? `, isCard: false };
                }

                // Si encontramos demasiados y el texto fue muuy corto:
                if (clientesEncontrados.length > 2 && nombreQ.split(" ").length === 1) {
                    return {
                        text: `Hay ${clientesEncontrados.length} clientes en el sistema que coinciden con "${parameters.nombre}".Para ser preciso sin abrumarte, ¿me puedes regalar el nombre completo o número de contrato ? (O escribe "ver la lista" para mostrártelos)`,
                        isCard: false,
                        contextType: 'multiple_names', // Marcador para que el interceptor local reaccione
                        cardData: { term: parameters.nombre }
                    };
                }

                const cliente = clientesEncontrados[0];
                const infoExtra = clientesEncontrados.length > 1 ? ` (Hay ${clientesEncontrados.length - 1} coincidencias más en el motor, te muestro la primera relevante).` : "";

                return {
                    text: `He analizado la información.Esto es lo que resalta sobre ${cliente.client_name}${infoExtra}: `,
                    isCard: true,
                    contextType: 'viewing_client',
                    cardData: {
                        title: cliente.client_name,
                        subtitle: `#${cliente.id} | ${cliente.sector_name} `,
                        stats: [
                            { label: "Estado", value: cliente.status_name },
                            { label: "Teléfono", value: cliente.client_mobile || 'N/A' },
                            { label: "Plan", value: `${cliente.plan?.name} ($${cliente.plan?.cost})` }
                        ],
                        rawData: cliente
                    }
                };
            }

            case 'BUSQUEDA_VAGA':
                return {
                    text: "Por supuesto, dime el nombre, apellido, o el número de contrato del cliente que necesitas consultar.",
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
                    return { text: "Me pides un dato adicional, pero he perdido el hilo del cliente que estábamos analizando. ¿Me recuerdas su nombre o número?", isCard: false };
                }

                const accion = parameters?.accion;
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
                        text: `El ciclo de facturación asignado a ** ${rawDataTarget.client_name}** es: \n\n🗓️ ** Día ${rawDataTarget.cycle || 'No definido'}** `,
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
                    cardData: { savedParameters: parameters }
                };
            }

            case 'AMBOS_METRICAS': {
                const { filtered, appliedTexts } = getFilteredDataset(clientes, parameters, query);
                const total = filtered.length;
                const ingresos = filtered.reduce((acc, curr) => acc + parseFloat(curr.plan?.cost || 0), 0);

                return {
                    text: `Aquí tienes la comparativa completa para el segmento solicitado:\n(${appliedTexts.join(', ')})\n\n**Si necesitas los datos, abajo tienes el botón para descargar el Excel.**`,
                    isCard: true,
                    offerExcel: true,
                    cardData: {
                        title: "Resumen Comparativo",
                        stats: [
                            { label: "Total Clientes", value: total, color: "#3498db" },
                            { label: "Ingresos Proyectados", value: formatCurrency(ingresos), color: "#f1c40f" }
                        ],
                        color: "#9b59b6",
                        parameters: parameters,
                        dataset: filtered,
                        filtersText: appliedTexts
                    }
                };
            }

            case 'GENERAR_EXCEL': {
                const { filtered, appliedTexts } = getFilteredDataset(clientes, parameters, query);
                return {
                    text: `¡Entendido! Estoy preparando el archivo Excel con el listado de clientes (${appliedTexts.join(', ') || 'Global'}).\n\n**Iniciando descarga...**`,
                    isCard: false,
                    isDownload: true, // Flag para el frontend
                    cardData: {
                        dataset: filtered,
                        filtersText: appliedTexts
                    }
                };
            }

            case 'UNKNOWN':
            default:
                return {
                    text: "Lamento la confusión, mi Inteligencia Artificial no logró deducir con exactitud qué métrica de la base de datos buscas. 😔\n\nIntenta ser más directo como: 'Muéstrame los ingresos globales', 'Búscame al cliente Luis Silva' o '¿Cuántos morosos tenemos?'.",
                    isCard: false
                };
        }

    } catch (error) {
        console.error("AiEngine Error:", error);
        return {
            text: `Lo siento, hubo un error al procesar tu solicitud: ${error.message}. 🌐\n\nSi el error persiste, verifica la API Key o la conexión.`,
            isCard: false
        };
    }
};
