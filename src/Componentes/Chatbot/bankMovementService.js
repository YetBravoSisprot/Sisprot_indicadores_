/**
 * SGF · Servicio de Movimientos Bancarios en Vivo
 * 
 * Fuente: API Pública Sisprot /api/public/payments/bank-movements/
 * Autor: Sisprot GF / Freddy & Bryant Integration
 */

import { PLAN_DE_BANCOS, findCuentaByLastDigits } from '../Componentes/Chatbot/planDeBancos.js';

const BANK_MOVEMENTS_URL = 'https://api.sisprotgf.com/api/public/payments/bank-movements/';
const BANK_ASSOCIATED_URL = 'https://api.sisprotgf.com/api/public/payments/bank_associated/';
const TOKEN = (
    process.env.REACT_APP_PAYMENTS_API_KEY ||
    process.env.REACT_APP_SISPROT_API_KEY ||
    'kP4vL8nB1xM7zQ0wR9tY2sJ5hG6fD3aC9uE1iO7mN4rT2bV8xS'
).trim();

// Cache en memoria para evitar saturar el servidor (3 minutos)
const movementsCache = {};
const catalogCache = { data: null, timestamp: 0 };

/**
 * Consulta el catálogo de cuentas bancarias asociadas en Sisprot
 */
export const fetchBankAssociated = async () => {
    const now = Date.now();
    if (catalogCache.data && now - catalogCache.timestamp < 10 * 60 * 1000) {
        return catalogCache.data;
    }

    try {
        const response = await fetch(BANK_ASSOCIATED_URL, {
            headers: {
                'X-API-KEY': TOKEN,
                'Accept': 'application/json'
            }
        });

        if (response.ok) {
            const raw = await response.json();
            const list = Array.isArray(raw) ? raw : (raw.results || []);
            catalogCache.data = list;
            catalogCache.timestamp = now;
            return list;
        }
    } catch (e) {
        console.warn('Error al obtener bank_associated:', e);
    }
    return [];
};

/**
 * Consulta los movimientos bancarios reales según filtros y fechas
 * @param {Object} options Filtros: { dateFrom, dateTo, destinationAccount, bankCode, movementType, category, isUsed, removePagination }
 */
export const fetchBankMovements = async (options = {}) => {
    const {
        dateFrom = null,
        dateTo = null,
        destinationAccount = null,
        bankCode = null,
        movementType = null,
        category = null,
        isUsed = null,
        removePagination = true
    } = options;

    const todayStr = new Date().toLocaleDateString('en-CA');
    const start = dateFrom || todayStr;
    const end = dateTo || todayStr;

    // Generar clave de caché
    const cacheKey = `${start}_${end}_${destinationAccount || 'all'}_${bankCode || 'all'}_${movementType || 'all'}_${category || 'all'}_${isUsed !== null ? isUsed : 'all'}`;
    const now = Date.now();
    if (movementsCache[cacheKey] && now - movementsCache[cacheKey].timestamp < 3 * 60 * 1000) {
        return movementsCache[cacheKey].data;
    }

    const params = new URLSearchParams();
    params.append('date_from', start);
    params.append('date_to', end);

    if (removePagination) {
        params.append('remove_pagination', 'true');
    }
    if (destinationAccount) {
        params.append('destination_account_number', destinationAccount);
    }
    if (bankCode) {
        params.append('bank_code', bankCode);
    }
    if (movementType) {
        params.append('movement_type', movementType);
    }
    if (category) {
        params.append('category', category);
    }
    if (isUsed !== null && isUsed !== undefined) {
        params.append('is_used', String(isUsed));
    }

    const fullUrl = `${BANK_MOVEMENTS_URL}?${params.toString()}`;

    try {
        const response = await fetch(fullUrl, {
            headers: {
                'X-API-KEY': TOKEN,
                'Accept': 'application/json'
            }
        });

        if (response.ok) {
            const raw = await response.json();
            const list = Array.isArray(raw) ? raw : (raw.results || []);

            // Enriquecer cada movimiento con la información del Plan de Bancos
            const enriched = list.map(m => {
                const last4 = m.destination_account_number ? String(m.destination_account_number).slice(-4) : null;
                const cuentaInfo = findCuentaByLastDigits(last4);
                return {
                    ...m,
                    last4,
                    cuentaInfo,
                    amountNumber: parseFloat(m.amount) || 0
                };
            });

            movementsCache[cacheKey] = { data: enriched, timestamp: now };
            return enriched;
        } else {
            console.warn(`Error ${response.status} en bank-movements`);
            return [];
        }
    } catch (error) {
        console.error('Excepción consultando bank-movements:', error);
        return [];
    }
};

/**
 * Genera un resumen consolidado por cuenta bancaria y globales (Ingresos, Egresos, Flujo Neto, Depósitos no identificados)
 */
export const getBankMovementsSummary = async (dateFrom, dateTo) => {
    const movements = await fetchBankMovements({ dateFrom, dateTo, removePagination: true });

    let totalIncomeBs = 0;
    let totalExpenseBs = 0;
    let totalUnusedCount = 0;
    let totalUnusedBs = 0;

    const byAccount = {};

    movements.forEach(m => {
        const last4 = m.last4 || 'otro';
        const amt = m.amountNumber;

        if (!byAccount[last4]) {
            const info = m.cuentaInfo || findCuentaByLastDigits(last4) || {
                banco: m.bank_name || 'Desconocido',
                rol: 'No clasificada',
                categoria: 'OTRA',
                codigoContableV6: 'N/A'
            };
            byAccount[last4] = {
                last4,
                accountNumber: m.destination_account_number || 'N/A',
                banco: info.banco || m.bank_name,
                rol: info.rol || 'No clasificada',
                codigoContableV6: info.codigoContableV6 || 'N/A',
                incomeBs: 0,
                expenseBs: 0,
                incomeCount: 0,
                expenseCount: 0,
                unusedCount: 0,
                unusedBs: 0,
                totalTransactions: 0
            };
        }

        byAccount[last4].totalTransactions++;

        if (m.movement_type === 'income') {
            byAccount[last4].incomeBs += amt;
            byAccount[last4].incomeCount++;
            totalIncomeBs += amt;

            // Depósito pendiente de identificar (is_used === false)
            if (m.is_used === false) {
                byAccount[last4].unusedCount++;
                byAccount[last4].unusedBs += amt;
                totalUnusedCount++;
                totalUnusedBs += amt;
            }
        } else {
            byAccount[last4].expenseBs += amt;
            byAccount[last4].expenseCount++;
            totalExpenseBs += amt;
        }
    });

    const netFlowBs = totalIncomeBs - totalExpenseBs;

    return {
        movements,
        dateFrom,
        dateTo,
        totalMovements: movements.length,
        totalIncomeBs,
        totalExpenseBs,
        netFlowBs,
        totalUnusedCount,
        totalUnusedBs,
        byAccount: Object.values(byAccount).sort((a, b) => b.incomeBs - a.incomeBs)
    };
};
