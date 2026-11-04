/**
 * Servicio para consultar contratos en tiempo real desde la API de Sisprot (Gsoft).
 * Endpoint: /api/public/contracts/
 */

const API_BASE_URL = process.env.REACT_APP_CONTRACTS_API_URL || "https://api.sisprotgf.com/api/public/contracts/";
const API_KEY = process.env.REACT_APP_SISPROT_API_KEY || "kP4vL8nB1xM7zQ0wR9tY2sJ5hG6fD3aC9uE1iO7mN4rT2bV8xS";

/**
 * Códigos de estatus en Gsoft según especificación:
 * 16 = Activo
 * 18 = Por instalar
 * 19 = Suspendido
 * 20 = Pausado
 * 34 = Cancelado
 */
export const STATUS_CODES = {
    "Activo": 16,
    "Por instalar": 18,
    "Suspendido": 19,
    "Pausado": 20,
    "Cancelado": 34
};

export const CODE_TO_STATUS = {
    16: "Activo",
    18: "Por instalar",
    19: "Suspendido",
    20: "Pausado",
    34: "Cancelado"
};

// Caché en memoria para evitar re-consultar innecesariamente al cambiar de filtros
const contractsCache = new Map();

/**
 * Normaliza un contrato de la API al esquema utilizado por TopUrbanismo y exportadores.
 */
export const normalizeContract = (item) => {
    if (!item) return null;

    // Soportar tanto formato plano como formato anidado (view=powerbi)
    const clientObj = item.client || {};
    const planObj = item.plan || {};
    const sectorObj = item.sector || {};
    const statusObj = typeof item.status === 'object' && item.status !== null ? item.status : null;

    const fullName = clientObj.full_name || `${item.name || ""} ${item.last_name || ""}`.trim() || item.client_name || "Sin nombre";
    const idStr = String(clientObj.identification || item.identification || item.client_identification || "").toUpperCase();
    const planName = String(planObj.name || item.plan_name || "").toUpperCase();

    // Determinar tipo de cliente
    let clientType = planObj.client_type?.name || item.client_type_name || "";
    if (!clientType) {
        if (planName.includes("PYME") || idStr.startsWith("J") || idStr.startsWith("G")) {
            clientType = "PYME";
        } else if (planName.includes("EMPLEADO") || fullName.includes("BEJAS")) {
            clientType = "EMPLEADO";
        } else if (planName.includes("INTERCAMBIO")) {
            clientType = "INTERCAMBIO";
        } else if (planName.includes("GRATIS")) {
            clientType = "GRATIS";
        } else {
            clientType = "RESIDENCIAL";
        }
    }

    // Determinar nombre de estatus y código numérico
    const statusCode = statusObj ? statusObj.id : (item.status !== undefined ? Number(item.status) : 16);
    let statusName = statusObj?.name || item.status_name || CODE_TO_STATUS[statusCode] || "Activo";

    const clientSubdivision = `${statusName.toUpperCase()}_${clientType.toUpperCase()}`;
    const planCost = item.plan_cost !== undefined ? item.plan_cost : (planObj.cost || 0);

    const sectorName = sectorObj.name || item.sector_name || "";
    const parishName = sectorObj.parish?.name || item.parish_name || "";

    return {
        id: item.id,
        client_id: clientObj.id || item.client_id,
        client_name: fullName,
        client_type_name: clientType,
        client_subdivision: clientSubdivision,
        status_name: statusName,
        status: statusCode,
        cycle: item.cycle !== undefined && item.cycle !== null ? item.cycle : (clientType === "PYME" ? 10 : 1),
        cycle_old: item.cycle_old !== undefined ? item.cycle_old : null,
        cycle_end: item.cycle_end !== undefined ? item.cycle_end : null,
        migrate: item.migrate !== undefined ? Boolean(item.migrate) : true,
        sector_name: sectorName,
        parish_name: parishName,
        installation_order: item.installation_order || "",
        pin_code: item.pin_code || "",
        plan: {
            id: planObj.id || item.plan_id || null,
            name: planObj.name || item.plan_name || "N/A",
            cost: String(planCost)
        },
        client_mobile: clientObj.mobile || item.mobile || item.client_mobile || "N/A",
        client_email: clientObj.email || item.email || item.client_email || "N/A",
        address: item.address_tax || item.address || "",
        address_tax: item.address_tax || "",
        client_identification: clientObj.identification || item.identification || item.client_identification || "N/A",
        created_at: item.created_at || item.status_updated_at || null,
        service_detail: item.service_detail || null,
        nap_box_name: item.nap_box_name || "",
        debt: item.debt !== undefined ? item.debt : 0,
        debt_bs: item.debt_bs !== undefined ? item.debt_bs : 0,
        bank_associated: item.bank_associated || null,
        contract_detail_id: item.contract_detail_id || null
    };
};

/**
 * Filtra contratos de prueba y usuarios de prueba del sistema.
 */
export const filterValidContracts = (contractsList) => {
    if (!Array.isArray(contractsList)) return [];

    const excludedNames = ["FREDDY CARRILLO", "BRYANT REYES", "ELISAUL REYES"];
    const whitelist = ["THAIS BEJAS"];

    return contractsList.filter(cliente => {
        if (!cliente) return false;
        const name = (cliente.client_name || "").toUpperCase().replace(/\s+/g, " ");

        // Excluir nombres específicos solicitados
        if (excludedNames.some(ex => name.includes(ex))) return false;

        // Excluir clientes empleados si están cancelados
        const isCancelled = cliente.status === 34 || 
                            String(cliente.status_name).toUpperCase() === "CANCELADO" || 
                            (cliente.client_subdivision && String(cliente.client_subdivision).toUpperCase().includes("CANCELADO"));
        const isEmpleado = cliente.client_type_name === "EMPLEADO" ||
                           (cliente.client_subdivision && String(cliente.client_subdivision).toUpperCase().includes("EMPLEADO")) ||
                           (cliente.plan?.name && String(cliente.plan.name).toUpperCase().includes("EMPLEADO"));
        if (isCancelled && isEmpleado) {
            return false;
        }

        // Lista blanca permitida
        const isWhitelisted = whitelist.some(w => name.includes(w.toUpperCase().replace(/\s+/g, " ")));
        if (isWhitelisted) return true;

        const searchFields = [
            cliente.client_name,
            cliente.address,
            cliente.sector_name,
            cliente.client_mobile,
            cliente.client_identification,
            cliente.client_type_name,
            cliente.plan?.name
        ];

        return !searchFields.some(val =>
            val !== null && val !== undefined && String(val).toUpperCase().includes("PRUEBA")
        );
    });
};

// Promesas en vuelo y configuración de caché persistente (IndexedDB + sessionStorage)
const inFlightRequests = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos de vigencia para caché persistente

const IDB_NAME = "sisprot_bi_cache_db";
const IDB_STORE = "contracts_store";

const openCacheDB = () => {
    return new Promise((resolve, reject) => {
        if (typeof window === "undefined" || !window.indexedDB) {
            return reject(new Error("IndexedDB no disponible"));
        }
        const request = window.indexedDB.open(IDB_NAME, 1);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(IDB_STORE)) {
                db.createObjectStore(IDB_STORE);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

const getFromPersistentCache = async (key) => {
    // 1. Intentar sessionStorage primero (para listas pequeñas)
    try {
        if (typeof window !== "undefined" && window.sessionStorage) {
            const raw = window.sessionStorage.getItem(`sisprot_contracts_${key}`);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        }
    } catch (_) {}

    // 2. Intentar IndexedDB (soporta payloads > 5MB como "all")
    try {
        const db = await openCacheDB();
        return await new Promise((resolve) => {
            const tx = db.transaction(IDB_STORE, "readonly");
            const store = tx.objectStore(IDB_STORE);
            const req = store.get(`sisprot_contracts_${key}`);
            req.onsuccess = () => {
                const record = req.result;
                if (record && Array.isArray(record.data) && record.data.length > 0) {
                    if (!record.timestamp || (Date.now() - record.timestamp) < CACHE_TTL_MS) {
                        resolve(record.data);
                        return;
                    }
                }
                resolve(null);
            };
            req.onerror = () => resolve(null);
        });
    } catch (_) {
        return null;
    }
};

const saveToPersistentCache = async (key, data) => {
    try {
        if (typeof window !== "undefined" && window.sessionStorage) {
            window.sessionStorage.setItem(`sisprot_contracts_${key}`, JSON.stringify(data));
        }
    } catch (_) {
        // Si supera la cuota de 5MB de sessionStorage, IndexedDB actúa como respaldo principal
    }

    try {
        const db = await openCacheDB();
        const tx = db.transaction(IDB_STORE, "readwrite");
        const store = tx.objectStore(IDB_STORE);
        store.put({ timestamp: Date.now(), data }, `sisprot_contracts_${key}`);
    } catch (_) {}
};

const filterContractsByStatusIds = (contracts, statusIds) => {
    if (!statusIds || statusIds.length === 0) return contracts;
    return contracts.filter(c => statusIds.includes(Number(c.status)));
};

/**
 * Consulta los contratos en tiempo real por lista de estados (ej: ["Activo"], ["Suspendido"], o ["Todos"]).
 *
 * @param {string[]} selectedStatuses - Lista de nombres de estados ("Activo", "Suspendido", etc.)
 * @param {boolean} forceRefresh - Forzar actualización omitiendo caché
 * @param {number} timeoutMs - Tiempo máximo de espera en ms (default 30s)
 * @returns {Promise<{ count: number, results: Array, fromCache: boolean }>}
 */
export const fetchContractsByStatus = async (selectedStatuses = ["Activo"], forceRefresh = false, timeoutMs = 30000) => {
    const isTodos = selectedStatuses.includes("Todos") || selectedStatuses.length === 0;

    // Convertir nombres a códigos numéricos
    let statusIds = [];
    if (!isTodos) {
        selectedStatuses.forEach(st => {
            if (STATUS_CODES[st] !== undefined) {
                statusIds.push(STATUS_CODES[st]);
            }
        });
    }

    const cacheKey = isTodos ? "all" : statusIds.sort((a, b) => a - b).join(",");

    // 1. Verificar caché en memoria (exacta o derivada de "all")
    if (!forceRefresh) {
        if (contractsCache.has(cacheKey)) {
            const cached = contractsCache.get(cacheKey);
            return {
                count: cached.length,
                results: cached,
                fromCache: true
            };
        }
        if (!isTodos && contractsCache.has("all")) {
            const allCached = contractsCache.get("all");
            const derived = filterContractsByStatusIds(allCached, statusIds);
            contractsCache.set(cacheKey, derived);
            return {
                count: derived.length,
                results: derived,
                fromCache: true
            };
        }
    }

    // 2. Verificar caché persistente (sessionStorage / IndexedDB)
    if (!forceRefresh) {
        const persisted = await getFromPersistentCache(cacheKey);
        if (persisted && Array.isArray(persisted) && persisted.length > 0) {
            contractsCache.set(cacheKey, persisted);
            return {
                count: persisted.length,
                results: persisted,
                fromCache: true
            };
        }
        if (!isTodos) {
            const persistedAll = await getFromPersistentCache("all");
            if (persistedAll && Array.isArray(persistedAll) && persistedAll.length > 0) {
                contractsCache.set("all", persistedAll);
                const derived = filterContractsByStatusIds(persistedAll, statusIds);
                contractsCache.set(cacheKey, derived);
                return {
                    count: derived.length,
                    results: derived,
                    fromCache: true
                };
            }
        }
    }

    // 3. Reutilizar petición en curso si otro componente ya la disparó
    if (!forceRefresh && inFlightRequests.has(cacheKey)) {
        return inFlightRequests.get(cacheKey);
    }

    let url = `${API_BASE_URL}?remove_pagination=true&view=powerbi`;
    if (!isTodos && statusIds.length > 0) {
        url += `&status=${statusIds.join(",")}`;
    }

    const fetchPromise = (async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(url, {
                method: "GET",
                signal: controller.signal,
                headers: {
                    "X-API-KEY": (API_KEY || "").trim(),
                    "Accept": "application/json"
                }
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            const rawResults = Array.isArray(data) ? data : (data.results || []);

            // Normalizar contratos al formato de la aplicación
            const normalized = rawResults.map(normalizeContract).filter(Boolean);

            // Aplicar filtro de registros de prueba
            const validResults = filterValidContracts(normalized);

            // Guardar en caché de memoria y almacenamiento persistente
            contractsCache.set(cacheKey, validResults);
            saveToPersistentCache(cacheKey, validResults);

            return {
                count: validResults.length,
                results: validResults,
                fromCache: false
            };
        } catch (err) {
            clearTimeout(timeoutId);
            if (err.name === "AbortError") {
                console.warn("fetchContractsByStatus: Timeout de red alcanzado");
                throw new Error("Tiempo de espera agotado al consultar la API de contratos");
            }
            console.error("Error en fetchContractsByStatus:", err);
            throw err;
        } finally {
            inFlightRequests.delete(cacheKey);
        }
    })();

    inFlightRequests.set(cacheKey, fetchPromise);
    return fetchPromise;
};

/**
 * Limpia la caché en memoria y sesión de contratos.
 */
export const clearContractsCache = () => {
    contractsCache.clear();
    inFlightRequests.clear();
    try {
        if (typeof window !== "undefined" && window.sessionStorage) {
            Object.keys(window.sessionStorage).forEach(k => {
                if (k.startsWith("sisprot_contracts_")) {
                    window.sessionStorage.removeItem(k);
                }
            });
        }
    } catch (_) {}
    try {
        openCacheDB().then(db => {
            const tx = db.transaction(IDB_STORE, "readwrite");
            tx.objectStore(IDB_STORE).clear();
        }).catch(() => {});
    } catch (_) {}
};
