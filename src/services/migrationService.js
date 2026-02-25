/**
 * Servicio para obtener y procesar datos de migraciones desde la API de Sisprot.
 */

const API_URL = process.env.REACT_APP_MIGRATION_API_URL;
const API_KEY = process.env.REACT_APP_SISPROT_API_KEY;

export const fetchMigrationData = async () => {
    if (!API_URL || !API_KEY) {
        console.error("API URL o API Key no configuradas en .env");
        return null;
    }

    const allItems = [];
    let nextUrl = API_URL;

    try {
        while (nextUrl) {
            const response = await fetch(nextUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': API_KEY.trim()
                }
            });

            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            const data = await response.json();
            const results = data.results || [];
            allItems.push(...results);

            // Si hay una siguiente página, continuamos el bucle
            nextUrl = data.next ? data.next : null;

            // Seguridad: Si hay demasiadas páginas, detenemos para evitar bucles infinitos en dev
            if (allItems.length > 5000) break;
        }

        // Filtros específicos solicitados por el usuario
        const TARGET_PLAN = "RECURRENTE RESIDENCIAL PLAN 200M";
        const TARGET_COST = "19.00";

        const filtered = allItems.filter(item =>
            item.new_plan_name === TARGET_PLAN ||
            item.previous_plan_name === TARGET_PLAN ||
            (item.new_plan_cost && String(item.new_plan_cost) === TARGET_COST)
        );

        // Desglose por estatus
        const statusBreakdown = filtered.reduce((acc, curr) => {
            const status = curr.status_name || "Desconocido";
            if (!acc[status]) {
                acc[status] = { count: 0, revenue: 0 };
            }
            acc[status].count += 1;
            acc[status].revenue += parseFloat(curr.new_plan_cost || 0);
            return acc;
        }, {});

        // Log diario de integración
        const dailyLog = filtered.map(item => ({
            id: item.id,
            date: item.created_at ? item.created_at.split('T')[0] : 'S/F',
            fullDate: item.created_at,
            contractId: item.contract_gsoft_id,
            status: item.status_name,
            cost: item.new_plan_cost,
            previousPlanId: item.previous_plan,
            newPlanId: item.new_plan
        })).sort((a, b) => new Date(b.fullDate) - new Date(a.fullDate));

        // Agrupar para el mini-gráfico/timeline
        const timeline = filtered.reduce((acc, curr) => {
            const date = curr.created_at ? curr.created_at.split('T')[0] : 'S/F';
            acc[date] = (acc[date] || 0) + 1;
            return acc;
        }, {});

        return {
            totalClients: filtered.length,
            totalRevenue: filtered.reduce((acc, curr) => acc + parseFloat(curr.new_plan_cost || 0), 0),
            statusBreakdown: Object.entries(statusBreakdown).map(([name, data]) => ({ name, ...data })),
            dailyLog,
            timeline: Object.entries(timeline).sort((a, b) => b[0].localeCompare(a[0]))
        };
    } catch (error) {
        console.error("Error al obtener datos de migración:", error);
        return null;
    }
};
