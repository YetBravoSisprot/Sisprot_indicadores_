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

    const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

    useEffect(() => {
        const loadData = async () => {
            const data = await getFullSalesData();
            setSalesData(data);
            setLoading(false);
        };
        loadData();
    }, []);

    const chartData = {
        labels: meses,
        datasets: Object.entries(salesData || {}).map(([year, values], index) => {
            const colors = [
                'rgba(255, 99, 132, 1)',
                'rgba(54, 162, 235, 1)',
                'rgba(255, 206, 86, 1)',
                'rgba(75, 192, 192, 1)',
                'rgba(153, 102, 255, 1)',
                'rgba(255, 159, 64, 1)'
            ];
            return {
                label: `Ventas ${year}`,
                data: values,
                borderColor: colors[index % colors.length],
                backgroundColor: colors[index % colors.length].replace('1)', '0.1)'),
                tension: 0.4,
                fill: year === "2026", // Solo rellenar el año actual para destacar? o ninguno
            };
        })
    };

    const options = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
                labels: { color: '#fff' }
            },
            title: {
                display: true,
                text: 'Evolución de Ventas Mensuales (2021-2026)',
                color: '#fff',
                font: { size: 18 }
            },
        },
        scales: {
            y: {
                grid: { color: 'rgba(255, 255, 255, 0.1)' },
                ticks: { color: '#fff' }
            },
            x: {
                grid: { color: 'rgba(255, 255, 255, 0.1)' },
                ticks: { color: '#fff' }
            }
        }
    };

    return (
        <div className="ventas-globales-page">
            <LogoTitulo />
            <DropdownMenu />
            <PageNav />

            <div className="ventas-globales-container animate-fade-in">
                <header className="ventas-header">
                    <h1>Histórico de Ventas Globales</h1>
                    <p>Comparativa anual de rendimiento (2021 - 2026)</p>
                </header>

                {loading ? (
                    <div className="loader">Cargando datos históricos...</div>
                ) : (
                    <>
                        <div className="stats-grid">
                            {Object.entries(salesData).map(([year, values]) => (
                                <div key={year} className={`stat-card glass year-${year}`}>
                                    <h3>Año {year}</h3>
                                    <div className="total-val">
                                        {values.reduce((a, b) => a + b, 0)}
                                    </div>
                                    <span className="unit">Ventas totales</span>
                                </div>
                            ))}
                        </div>

                        <div className="chart-wrapper glass">
                            <Line data={chartData} options={options} />
                        </div>

                        <div className="data-table-container glass">
                            <h3>Desglose Mensual</h3>
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
                                        {Object.entries(salesData).reverse().map(([year, values]) => (
                                            <tr key={year}>
                                                <td className="year-cell">{year}</td>
                                                {values.map((v, i) => (
                                                    <td key={i} className={v > 0 ? 'has-value' : 'is-zero'}>{v}</td>
                                                ))}
                                                <td className="total-cell">{values.reduce((a, b) => a + b, 0)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default VentasGlobales;
