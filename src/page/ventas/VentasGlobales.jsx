import React, { useState, useEffect } from "react";
import PageNav from "../../Componentes/PageNav";
import LogoTitulo from "../../Componentes/LogoTitulo";
import DropdownMenu from "../../Componentes/DropdownMenu";
import { getFullSalesData } from "../../services/salesService";
import { Line } from "react-chartjs-2";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import "./VentasGlobales.css";

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const VentasGlobales = () => {
    const [salesData, setSalesData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedYear, setSelectedYear] = useState("2026");
    const [comparisonYears, setComparisonYears] = useState(["2026"]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

    const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

    useEffect(() => {
        const loadData = async () => {
            const data = await getFullSalesData();
            setSalesData(data);
            setLoading(false);
        };
        loadData();
    }, []);

    const getChartData = () => {
        if (!salesData) return { labels: meses, datasets: [] };
        return {
            labels: meses,
            datasets: Object.entries(salesData).map(([year, yearData]) => {
                const isSelected = year === selectedYear;
                // Es comparativo si está en el array pero no es el principal (Cian)
                const isComparing = comparisonYears.includes(year) && !isSelected;
                const isActive = comparisonYears.includes(year);

                let color = "rgba(148, 163, 184, 0.35)"; // Fondo
                let borderWidth = 2;
                let pointRadius = 2;
                let zOrder = 1;

                if (isSelected) {
                    color = "#00d2ff"; // Cian (Principal)
                    borderWidth = 4;
                    pointRadius = 5;
                    zOrder = 0;
                } else if (isComparing) {
                    color = "#f1c40f"; // Oro (Comparativo)
                    borderWidth = 3;
                    pointRadius = 4;
                    zOrder = 0;
                }

                return {
                    label: `Ventas ${year}`,
                    data: yearData,
                    borderColor: color,
                    backgroundColor: color.includes("#") ? `${color}22` : color.replace("0.35", "0.1"),
                    tension: 0.4,
                    fill: isComparing && !isSelected && year === "2026", // Solo rellenar si es 2026 y está activo
                    borderWidth: borderWidth,
                    pointRadius: pointRadius,
                    pointHoverRadius: 6,
                    order: zOrder,
                };
            })
        };
    };

    // Normalización para Heatmap de la Tabla
    const maxSalesVal = salesData ? Math.max(...Object.values(salesData).flat()) : 1;

    // Lógica Unificada de Selección (compartida entre Leyenda y Tabla)
    const handleYearSelection = (year) => {
        setComparisonYears(prev => {
            let newList = Array.isArray(prev) ? [...prev] : Array.from(prev);
            if (newList.includes(year)) {
                if (newList.length > 1) {
                    newList = newList.filter(y => y !== year);
                    setSelectedYear(newList[newList.length - 1]);
                }
            } else {
                newList.push(year);
                if (newList.length > 2) newList.shift();
                setSelectedYear(year);
            }
            return newList;
        });
    };

    const options = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    color: '#fff',
                    usePointStyle: true,
                    padding: 20,
                    cursor: 'pointer'
                },
                onClick: (e, legendItem, legend) => {
                    const year = legendItem.text.split(" ")[1];
                    if (year) handleYearSelection(year);
                }
            },
            title: {
                display: true,
                text: "Evolución de Ventas Mensuales (2021-2026)",
                color: '#fff',
                font: { size: 18 }
            },
            tooltip: {
                callbacks: {
                    label: (context) => `${context.dataset.label}: ${context.raw}`
                }
            }
        },
        scales: {
            y: { grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: '#fff' } },
            x: { grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: '#fff' } }
        }
    };

    // Cálculos de Impacto
    const yearData = salesData?.[selectedYear] || new Array(12).fill(0);
    const currentValue = yearData[selectedMonth] || 0;
    const janValue = yearData[0] || 0;
    const diffToJan = janValue > 0 ? ((currentValue - janValue) / janValue) * 100 : 0;

    // Análisis Trimestral (Impacto)
    const getQuarterData = () => {
        if (!yearData) return [0, 0, 0, 0];
        return [
            yearData.slice(0, 3).reduce((a, b) => a + b, 0),
            yearData.slice(3, 6).reduce((a, b) => a + b, 0),
            yearData.slice(6, 9).reduce((a, b) => a + b, 0),
            yearData.slice(9, 12).reduce((a, b) => a + b, 0),
        ];
    };
    const [q1, q2, q3, q4] = getQuarterData();

    // Proyección 2026
    const getProjection = () => {
        if (!salesData?.["2026"]) return 0;
        const currentYearData = salesData["2026"];
        const validMonths = currentYearData.filter(v => v > 0);
        if (validMonths.length === 0) return 0;
        const avg = validMonths.reduce((a, b) => a + b, 0) / validMonths.length;
        return Math.round(avg * 12);
    };
    const projection2026 = getProjection();

    return (
        <div className="ventas-globales-page">
            <LogoTitulo />
            <DropdownMenu />
            <PageNav />

            <div className="ventas-globales-container animate-fade-in">
                <header className="ventas-header">
                    <div>
                        <h1>Histórico de Ventas Globales</h1>
                        <p>Análisis de impacto trimestral y tendencias reales</p>
                    </div>
                </header>

                {loading ? (
                    <div className="loader-container">
                        <div className="loader-spinner"></div>
                        <p>Sincronizando con Google Drive...</p>
                    </div>
                ) : (
                    <>
                        <div className="analysis-grid">
                            <div className="stat-card glass interactive-selector">
                                <h3>Consulta Detallada</h3>
                                <div className="selectors">
                                    <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
                                        {Object.keys(salesData).reverse().map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                    <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))}>
                                        {meses.map((m, i) => <option key={m} value={i}>{m}</option>)}
                                    </select>
                                </div>
                                <div className="result-val">{currentValue}</div>
                                <span className="unit">Ventas en {meses[selectedMonth]} {selectedYear}</span>
                            </div>

                            <div className={`stat-card glass variation-card ${diffToJan < 0 ? 'negative' : 'positive'}`}>
                                <h3>Variación vs Enero {selectedYear}</h3>
                                <div className="variation-val">
                                    {diffToJan > 0 ? '+' : ''}{diffToJan.toFixed(1)}%
                                </div>
                                <p className="calc-explanation">Comparativa porcentual del mes seleccionado contra Enero de este año.</p>
                                <div className="mini-trend">
                                    {diffToJan < 0 ? '📉 Descenso' : '📈 Incremento'}
                                </div>
                            </div>
                            <div className="stat-card glass projection-card">
                                <h3>Proyección Ventas 2026</h3>
                                <div className="projection-val">{projection2026}</div>
                                <span className="unit">Total Estimado Anual</span>
                                <div className="calc-explanation-box">
                                    <p><strong>Metodología de Proyección:</strong></p>
                                    <p>1. Sumamos las ventas de los meses reales (Ene-Mar: 30).</p>
                                    <p>2. Dividimos entre los meses transcurridos (3) = Promedio de 10 mensual.</p>
                                    <p>3. Multiplicamos 10 x 12 meses = 120 proyectadas.</p>
                                </div>
                            </div>
                        </div>

                        <div className="quarterly-analysis glass">
                            <h3>Impacto Trimestral de Ventas {selectedYear}</h3>
                            <div className="quarters-grid">
                                <div className="q-item">
                                    <span className="q-label">T1 (Ene-Mar)</span>
                                    <div className="q-val">{q1}</div>
                                </div>
                                <div className="q-item">
                                    <span className="q-label">T2 (Abr-Jun)</span>
                                    <div className="q-val">{q2}</div>
                                </div>
                                <div className="q-item">
                                    <span className="q-label">T3 (Jul-Sep)</span>
                                    <div className="q-val">{q3}</div>
                                </div>
                                <div className="q-item">
                                    <span className="q-label">T4 (Oct-Dic)</span>
                                    <div className="q-val">{q4}</div>
                                </div>
                            </div>
                        </div>

                        <div className="chart-wrapper glass">
                            <Line data={getChartData()} options={options} />
                        </div>

                        {/* Tarjeta de Guía Interactiva */}
                        <div className="info-guide-card glass animate-fade-in">
                            <div className="guide-icon">💡</div>
                            <div className="guide-text">
                                <h4>Guía de Uso del Dashboard</h4>
                                <p><strong>Matriz dinámica:</strong> Clica cualquier año en la tabla de abajo para enfocarlo automáticamente en el gráfico. El <strong>Resaltado de Picos</strong> (fondos azules) muestra visualmente dónde hubo mayor éxito de ventas.</p>
                            </div>
                        </div>

                        <div className="data-table-container glass">
                            <h3 className="premium-table-title">Matriz Comparativa de Ventas</h3>
                            <div className="table-responsive">
                                <table className="sales-table">
                                    <thead>
                                        <tr>
                                            <th>Año</th>
                                            {meses.map(m => <th key={m}>{m}</th>)}
                                            <th>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(salesData).reverse().map(([year, yearData]) => {
                                            const isMain = year === selectedYear;
                                            const isComp = comparisonYears.includes(year) && !isMain;

                                            return (
                                                <tr
                                                    key={year}
                                                    className={`
                                                        table-row-premium
                                                        ${isMain ? 'main-selected' : ''} 
                                                        ${isComp ? 'comp-selected' : ''}
                                                    `}
                                                    onClick={() => handleYearSelection(year)}
                                                >
                                                    <td className="year-cell">{year}</td>
                                                    {yearData.map((v, i) => (
                                                        <td
                                                            key={i}
                                                            style={{ "--intensity": v / maxSalesVal }}
                                                            className={`
                                                                heatmap-cell
                                                                ${v > 0 ? 'has-value' : 'is-zero'} 
                                                                ${(isMain && i === selectedMonth) ? 'highlight-cell' : ''}
                                                            `}
                                                        >
                                                            <span className="cell-val">{v}</span>
                                                        </td>
                                                    ))}
                                                    <td className="total-cell">
                                                        {yearData.reduce((a, b) => a + b, 0)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div >
    );
};

export default VentasGlobales;
