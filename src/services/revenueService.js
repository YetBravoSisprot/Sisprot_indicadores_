/**
 * Service to fetch and process historical revenue data from the Sisprot API.
 */

const REVENUE_API_URL = "https://api.sisprotgf.com/api/public/statistics/income/";
const API_KEY = "PgfFJ9K6LkM7ggghQJh4HP22bfqu1b43d2f1TITeil2c";

export const getHistoricalRevenueData = async () => {
    try {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        const formatDate = (date) => date.toISOString().split('T')[0];

        const dateFrom = "2025-01-01";
        const dateTo = formatDate(yesterday);

        const url = `${REVENUE_API_URL}?date_from=${dateFrom}&date_to=${dateTo}&group_by=service_type_name&group_by=migrate`;

        const response = await fetch(url, {
            headers: {
                "x-api-key": API_KEY
            }
        });

        if (!response.ok) {
            throw new Error(`Error fetching revenue data: ${response.statusText}`);
        }

        const jsonData = await response.json();
        return processRevenueData(jsonData);
    } catch (error) {
        console.error("Error in getHistoricalRevenueData:", error);
        return null;
    }
};

/**
 * Processes raw API data into monthly trends and totals.
 */
const processRevenueData = (rawData) => {
    if (!rawData || !rawData.data) return null;

    const data = rawData.data;
    const totalAccumulated = rawData.total?.total_amount ? parseFloat(rawData.total.total_amount) : 0;

    // Group by month/year
    const monthlyData = {};
    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

    data.forEach(item => {
        // Use string splitting to avoid timezone issues with new Date()
        const dateParts = item.date.split('-'); // Format: YYYY-MM-DD
        if (dateParts.length < 2) return;

        const year = parseInt(dateParts[0]);
        const monthIndex = parseInt(dateParts[1]) - 1; // 0-indexed

        const key = `${year}-${monthIndex}`;

        if (!monthlyData[key]) {
            monthlyData[key] = {
                year,
                monthIndex,
                monthLabel: `${monthNames[monthIndex]} ${year}`,
                amount: 0
            };
        }
        monthlyData[key].amount += parseFloat(item.amount);
    });

    // Convert to sorted array for charts
    const chartLabels = [];
    const chartValues = [];

    const sortedKeys = Object.keys(monthlyData).sort((a, b) => {
        const [yA, mA] = a.split('-').map(Number);
        const [yB, mB] = b.split('-').map(Number);
        return yA !== yB ? yA - yB : mA - mB;
    });

    sortedKeys.forEach(key => {
        chartLabels.push(monthlyData[key].monthLabel);
        chartValues.push(parseFloat(monthlyData[key].amount.toFixed(2)));
    });

    return {
        totalAccumulated,
        chartLabels,
        chartValues,
        rawData: data
    };
};
