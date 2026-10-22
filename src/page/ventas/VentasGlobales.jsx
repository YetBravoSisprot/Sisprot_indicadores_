import React, { useState, useEffect } from "react";
import PageNav from "../../Componentes/PageNav";
import LogoTitulo from "../../Componentes/LogoTitulo";
import DropdownMenu from "../../Componentes/DropdownMenu";
import { getFullSalesMetrics, getDetailedSalesForMonth } from "../../services/salesService";
import * as XLSX from "xlsx";
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

const YEAR_COLORS = {
    "2026": "#00d2ff", // Cyan
    "2025": "#1d8cf8", // Blue
    "2024": "#a855f7", // Purple
    "2023": "#f59e0b", // Amber / Gold
    "2022": "#38bdf8", // Sky Blue
    "2021": "#94a3b8", // Slate Gray
};

const VentasGlobales = () => {
    const [salesData, setSalesData] = useState(null);
    const [revenueData, setRevenueData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedYear, setSelectedYear] = useState("2026");
    const [comparisonYears, setComparisonYears] = useState(["2026"]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [metricView, setMetricView] = useState("units"); // "units" | "revenue"
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 900);
    const [downloading, setDownloading] = useState(false);

    const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

    const canDownload = parseInt(selectedYear) > 2025 || (parseInt(selectedYear) === 2025 && selectedMonth >= 6);

    const handleDownloadExcel = async () => {
        if (!canDownload) return;
        setDownloading(true);
        try {
            const data = await getDetailedSalesForMonth(selectedYear, selectedMonth);
            if (data.length === 0) {
                alert("No se encontraron registros de ventas para el mes seleccionado.");
                setDownloading(false);
                return;
            }

            const totalUSD = data.reduce((acc, item) => {
                const costNum = typeof item.costoNum === "number" ? item.costoNum : parseFloat(String(item.costoPlan || "").replace(/[$,]/g, "").trim());
                return acc + (isNaN(costNum) ? 0 : costNum);
            }, 0);

            const formattedData = data.map(item => ({
                "Contrato / ID": item.ordenInstalacion,
                "Fecha Activación": item.fechaActivacion || "-",
                "Cliente": item.nombre ? (item.apellido ? `${item.nombre} ${item.apellido}` : item.nombre) : "-",
                "Cédula / RIF": item.cedula || "-",
                "Teléfono": item.telefono || "-",
                "Correo": item.correo || "-",
                "Sector": item.sector || "-",
                "Parroquia": item.parroquia || "-",
                "Municipio": item.municipio || "-",
                "Tipo de Cliente": item.tipoCliente || "-",
                "Plan": item.plan || "-",
                "Costo de Plan ($)": item.costoPlan || "$0.00",
                "Estado Anterior": item.estadoAnterior || "Por instalar",
                "Nuevo Estado": item.estadoNuevo || "Activo"
            }));

            formattedData.push({
                "Contrato / ID": "",
                "Fecha Activación": "",
                "Cliente": "",
                "Cédula / RIF": "",
                "Teléfono": "",
                "Correo": "",
                "Sector": "",
                "Parroquia": "",
                "Municipio": "",
                "Tipo de Cliente": "",
                "Plan": "TOTAL FACTURADO ($)",
                "Costo de Plan ($)": `$${totalUSD.toFixed(2)}`,
                "Estado Anterior": "",
                "Nuevo Estado": ""
            });

            const worksheet = XLSX.utils.json_to_sheet(formattedData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Ventas");

            const maxLens = {};
            formattedData.forEach(row => {
                Object.keys(row).forEach(key => {
                    const val = String(row[key] || "");
                    maxLens[key] = Math.max(maxLens[key] || key.length, val.length);
                });
            });
            worksheet["!cols"] = Object.keys(maxLens).map(key => ({
                wch: maxLens[key] + 3
            }));

            XLSX.writeFile(workbook, `Ventas_${meses[selectedMonth]}_${selectedYear}.xlsx`);
        } catch (error) {
            console.error("Error al descargar Excel:", error);
            alert("Ocurrió un error al descargar el reporte.");
        } finally {
            setDownloading(false);
        }
    };

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 900);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const loadData = async () => {
            try {
                const { salesData: sData, revenueData: rData } = await getFullSalesMetrics();
                setSalesData(sData);
                setRevenueData(rData);
            } catch (err) {
                console.error("Error al cargar ventas e ingresos:", err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const isRevenueMode = metricView === "revenue";
    const activeDataset = isRevenueMode ? revenueData : salesData;

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

    const getChartData = () => {
        if (!activeDataset) return { labels: meses, datasets: [] };

        const yearsList = ["2026", "2025", "2024", "2023", "2022", "2021"];

        return {
            labels: meses,
            datasets: yearsList.filter(y => activeDataset[y]).map((year) => {
                const isSelected = year === selectedYear;
                const isComparing = comparisonYears.includes(year);
                const baseColor = YEAR_COLORS[year] || "#94a3b8";

                let borderColor = baseColor;
                let borderWidth = 2.5;
                let pointRadius = 3.5;
                let pointHoverRadius = 7;
                let zOrder = 1;

                if (isSelected) {
                    borderWidth = 4;
                    pointRadius = 5.5;
                    zOrder = 0;
                } else if (!isComparing) {
                    borderColor = `${baseColor}99`; // Muted when not comparing
                    borderWidth = 1.8;
                }

                return {
                    label: isRevenueMode ? `Ingresos ${year}` : `Ventas ${year}`,
                    data: activeDataset[year],
                    borderColor: borderColor,
                    backgroundColor: `${borderColor}18`,
                    tension: 0.4,
                    fill: isSelected && year === "2026",
                    borderWidth: borderWidth,
                    pointRadius: pointRadius,
                    pointBackgroundColor: "#fff",
                    pointBorderColor: borderColor,
                    pointBorderWidth: 2,
                    pointHoverRadius: pointHoverRadius,
                    order: zOrder,
                };
            })
        };
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false // Usamos nuestra leyenda visual personalizada idéntica a la referencia
            },
            tooltip: {
                backgroundColor: 'rgba(5, 18, 30, 0.95)',
                titleColor: '#00d2ff',
                bodyColor: '#fff',
                borderColor: 'rgba(0, 210, 255, 0.3)',
                borderWidth: 1,
                padding: 12,
                boxPadding: 6,
                callbacks: {
                    label: (context) => isRevenueMode
                        ? `${context.dataset.label}: $${Number(context.raw).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`
                        : `${context.dataset.label}: ${context.raw} ventas`
                }
            }
        },
        scales: {
            y: {
                grid: { color: 'rgba(255, 255, 255, 0.06)' },
                ticks: {
                    color: '#94a3b8',
                    font: { size: isMobile ? 10 : 12 },
                    callback: (val) => isRevenueMode ? `$${val}` : val
                }
            },
            x: {
                grid: { color: 'rgba(255, 255, 255, 0.04)' },
                ticks: { color: '#94a3b8', font: { size: isMobile ? 10 : 12 } }
            }
        }
    };

    // Cálculos de Selección
    const yearSales = salesData?.[selectedYear] || new Array(12).fill(0);
    const currentValue = yearSales[selectedMonth] || 0;
    const janValue = yearSales[0] || 0;
    const diffToJan = janValue > 0 ? ((currentValue - janValue) / janValue) * 100 : 0;

    const yearRevenue = revenueData?.[selectedYear] || new Array(12).fill(0);
    const currentRevenue = yearRevenue[selectedMonth] || 0;

    // Proyección Dinámica (2026)
    const getProjectionData = () => {
        const defaultData = { total: 0, months: 0, avg: 0, result: 0 };
        if (!salesData?.["2026"]) return defaultData;

        const currentYearData = salesData["2026"];
        const validMonths = currentYearData.filter(v => v > 0);
        if (validMonths.length === 0) return defaultData;

        const total = validMonths.reduce((a, b) => a + b, 0);
        const months = validMonths.length;
        const avg = total / months;
        const result = Math.round(avg * 12);

        return { total, months, avg: avg.toFixed(1).replace(".", ","), result };
    };

    const proj = getProjectionData();
    const currentMatrix = isRevenueMode ? revenueData : salesData;

    return (
        <div className="ventas-globales-page">
            <LogoTitulo />
            <DropdownMenu />
            <PageNav />

            <div className="ventas-globales-container animate-fade-in">
                {/* ── ENCABEZADO SUPERIOR ── */}
                <div className="ventas-header-box">
                    <div className="ventas-header-icon-box">
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#00d2ff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="20" x2="18" y2="10"></line>
                            <line x1="12" y1="20" x2="12" y2="4"></line>
                            <line x1="6" y1="20" x2="6" y2="14"></line>
                        </svg>
                    </div>
                    <div className="ventas-header-texts">
                        <h1 className="ventas-main-title">
                            Histórico de <span className="title-cyan">Ventas Globales</span>
                        </h1>
                        <p className="ventas-sub-title">Análisis de impacto trimestral y tendencias reales</p>
                    </div>
                </div>

                {loading ? (
                    <div className="loader-container">
                        <div className="loader-spinner"></div>
                        <p>Sincronizando auditorías de red de Sisprot...</p>
                    </div>
                ) : (
                    <>
                        {/* ── GRID DE 3 TARJETAS PRINCIPALES (REFERENCIA VISUAL) ── */}
                        <div className="ventas-cards-grid">
                            {/* TARJETA 1: Consulta de ventas */}
                            <div className="ref-card card-consulta">
                                <div className="card-top-header">
                                    <div className="card-mini-icon cyan-icon">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00d2ff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="11" cy="11" r="8"></circle>
                                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="card-heading">Consulta de ventas</h3>
                                        <p className="card-subheading">Seleccione el año y el mes para ver el detalle.</p>
                                    </div>
                                </div>

                                <div className="card-consulta-body">
                                    <div className="consulta-left-col">
                                        <div className="selector-pills-row">
                                            <div className="custom-select-pill">
                                                <span className="pill-calendar-icon">📅</span>
                                                <select 
                                                    value={selectedYear} 
                                                    onChange={(e) => setSelectedYear(e.target.value)}
                                                    aria-label="Seleccionar Año"
                                                >
                                                    {Object.keys(salesData).reverse().map(y => <option key={y} value={y}>{y}</option>)}
                                                </select>
                                                <span className="pill-arrow">⌄</span>
                                            </div>

                                            <div className="custom-select-pill">
                                                <span className="pill-calendar-icon">📅</span>
                                                <select 
                                                    value={selectedMonth} 
                                                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                                    aria-label="Seleccionar Mes"
                                                >
                                                    {meses.map((m, i) => <option key={m} value={i}>{m}</option>)}
                                                </select>
                                                <span className="pill-arrow">⌄</span>
                                            </div>
                                        </div>

                                        <button 
                                            className="excel-green-btn" 
                                            onClick={handleDownloadExcel} 
                                            disabled={downloading || !canDownload}
                                            title={!canDownload ? "Disponible desde Julio 2025" : ""}
                                        >
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14h-2v-4h2v4zm0-6h-2V7h2v4zm4 6h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z"/>
                                            </svg>
                                            <span>{downloading ? "Descargando..." : "Descargar Excel"}</span>
                                        </button>
                                        {!canDownload && (
                                            <span className="excel-disabled-hint">Disponible desde Julio 2025</span>
                                        )}
                                    </div>

                                    <div className="consulta-right-col">
                                        <div className="big-stat-val">{currentValue}</div>
                                        <div className="stat-unit-text">Ventas en {meses[selectedMonth]} {selectedYear}</div>
                                        {currentRevenue > 0 && (
                                            <div className="revenue-pill-tag">
                                                💵 ${currentRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* TARJETA 2: Variación vs. enero {selectedYear} */}
                            <div className={`ref-card card-variacion ${diffToJan < 0 ? 'border-red-glow' : 'border-green-glow'}`}>
                                <div className="card-top-header">
                                    <div className={`card-mini-icon ${diffToJan < 0 ? 'red-icon' : 'green-icon'}`}>
                                        {diffToJan < 0 ? (
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff5c77" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline>
                                                <polyline points="17 18 23 18 23 12"></polyline>
                                            </svg>
                                        ) : (
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                                                <polyline points="17 6 23 6 23 12"></polyline>
                                            </svg>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="card-heading">Variación vs. enero {selectedYear}</h3>
                                        <p className="card-subheading">Comparativa porcentual del mes seleccionado contra Enero de este año.</p>
                                    </div>
                                </div>

                                <div className="card-variacion-body">
                                    <div className={`big-stat-val ${diffToJan < 0 ? 'text-coral' : 'text-emerald'}`}>
                                        {diffToJan > 0 ? '+' : ''}{diffToJan.toFixed(1)}%
                                    </div>
                                    <div className={`trend-chip ${diffToJan < 0 ? 'chip-red' : 'chip-green'}`}>
                                        {diffToJan < 0 ? '↓ Descenso' : '↑ Incremento'}
                                    </div>
                                </div>
                            </div>

                            {/* TARJETA 3: Proyección de ventas 2026 */}
                            <div className="ref-card card-proyeccion">
                                <div className="card-top-header">
                                    <div className="card-mini-icon gold-icon">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="18" y1="20" x2="18" y2="10"></line>
                                            <line x1="12" y1="20" x2="12" y2="4"></line>
                                            <line x1="6" y1="20" x2="6" y2="14"></line>
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="card-heading">Proyección de ventas 2026</h3>
                                        <p className="card-subheading">Total estimado anual basado en ventas reales.</p>
                                    </div>
                                </div>

                                <div className="card-proyeccion-body">
                                    <div className="proyeccion-left-col">
                                        <div className="big-stat-val text-gold">{proj.result}</div>
                                        <div className="stat-unit-text">Total Estimado Anual</div>
                                    </div>

                                    <div className="proyeccion-right-col">
                                        <div className="method-box">
                                            <div className="method-title">Metodología de Proyección:</div>
                                            <div className="method-item">1. Sumamos las ventas reales: <strong>{proj.total} uds.</strong></div>
                                            <div className="method-item">2. Dividimos entre meses operativos: <strong>{proj.months} meses.</strong></div>
                                            <div className="method-item">3. Promedio mensual actual: <strong>{proj.avg} uds.</strong></div>
                                            <div className="method-item">4. Proyección (Promedio x 12): <strong>{proj.result} uds.</strong></div>
                                            <div className="method-alert">
                                                <span className="alert-icon">⚠️</span>
                                                <span><strong>Nota:</strong> Este cálculo es dinámico. A medida que transcurra el año, el estimado ganará mayor precisión.</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── GRÁFICO PRINCIPAL DE EVOLUCIÓN MENSUAL (2021 — 2026) ── */}
                        <div className="ref-card chart-card-container">
                            <div className="chart-header-row">
                                <div className="chart-title-left">
                                    <div className="card-mini-icon cyan-icon">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00d2ff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                                        </svg>
                                    </div>
                                    <h3 className="chart-main-title">
                                        {isRevenueMode ? "Evolución de ingresos mensuales ($ USD) · 2021 — 2026" : "Evolución de ventas mensuales · 2021 — 2026"}
                                    </h3>
                                </div>

                                {/* Leyenda interactiva con puntos de color exactamente como la imagen */}
                                <div className="custom-chart-legend">
                                    {["2026", "2025", "2024", "2023", "2022", "2021"].map((yr) => {
                                        const isSelected = selectedYear === yr;
                                        return (
                                            <button
                                                type="button"
                                                key={yr}
                                                className={`legend-pill ${isSelected ? 'legend-selected' : ''}`}
                                                onClick={() => handleYearSelection(yr)}
                                            >
                                                <span className="legend-circle" style={{ backgroundColor: YEAR_COLORS[yr] }}></span>
                                                <span className="legend-label">Ventas {yr}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="chart-canvas-wrapper">
                                <Line data={getChartData()} options={options} height={320} />
                            </div>
                        </div>

                        {/* ── BANNER: GUÍA DE USO DEL DASHBOARD ── */}
                        <div className="ref-guide-card">
                            <div className="guide-bulb">💡</div>
                            <div className="guide-text-content">
                                <h4>Guía de Uso del Dashboard</h4>
                                <p>
                                    Matriz dinámica: Clic en cualquier año en la tabla de abajo para enfocarlo automáticamente en el gráfico. El <strong>Resultado de Picos</strong> (fondos azules) muestra visualmente dónde hubo mayor éxito de ventas.
                                </p>
                            </div>
                        </div>

                        {/* ── MATRIZ COMPARATIVA DE VENTAS ── */}
                        <div className="ref-card table-card-container">
                            <div className="table-header-flex">
                                <div className="table-title-left">
                                    <div className="card-mini-icon cyan-icon">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00d2ff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                            <line x1="3" y1="9" x2="21" y2="9"></line>
                                            <line x1="3" y1="15" x2="21" y2="15"></line>
                                            <line x1="9" y1="3" x2="9" y2="21"></line>
                                            <line x1="15" y1="3" x2="15" y2="21"></line>
                                        </svg>
                                    </div>
                                    <h3 className="table-card-heading">Matriz Comparativa de Ventas</h3>
                                </div>

                                <div className="metric-switch-pills">
                                    <button 
                                        type="button"
                                        className={`switch-pill ${!isRevenueMode ? 'active' : ''}`}
                                        onClick={() => setMetricView('units')}
                                    >
                                        📦 Unidades
                                    </button>
                                    <button 
                                        type="button"
                                        className={`switch-pill revenue ${isRevenueMode ? 'active' : ''}`}
                                        onClick={() => setMetricView('revenue')}
                                    >
                                        💵 Facturación ($)
                                    </button>
                                </div>
                            </div>

                            <div className="custom-table-responsive">
                                <table className="ref-sales-table">
                                    <thead>
                                        <tr>
                                            <th>AÑO</th>
                                            {meses.map(m => <th key={m}>{m.toUpperCase()}</th>)}
                                            <th className="th-total">TOTAL</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(currentMatrix).reverse().map(([year, yearData]) => {
                                            const isMain = year === selectedYear;
                                            const yearTotal = yearData.reduce((a, b) => a + b, 0);

                                            return (
                                                <tr
                                                    key={year}
                                                    className={`ref-table-row ${isMain ? 'row-selected' : ''}`}
                                                    onClick={() => handleYearSelection(year)}
                                                >
                                                    <td className="year-cell-title">
                                                        {isMain && <span className="year-indicator"></span>}
                                                        {year}
                                                    </td>

                                                    {year === '2021' && !isRevenueMode ? (
                                                        <>
                                                            <td colSpan={5} className="cell-peak consolidated-peak">
                                                                148
                                                            </td>
                                                            {yearData.slice(5).map((v, i) => (
                                                                <td key={i + 5} className="cell-normal">
                                                                    {v}
                                                                </td>
                                                            ))}
                                                        </>
                                                    ) : (
                                                        yearData.map((v, i) => {
                                                            const isSelectedCell = isMain && i === selectedMonth;
                                                            // En la referencia visual, los picos altos (>=150) tienen fondo azul vibrante
                                                            const isPeak = !isRevenueMode && v >= 150;
                                                            const displayVal = isRevenueMode 
                                                                ? (v > 0 ? `$${v.toFixed(0)}` : '0') 
                                                                : (v || 0);

                                                            return (
                                                                <td
                                                                    key={i}
                                                                    className={`
                                                                        cell-data
                                                                        ${isPeak ? 'cell-peak' : ''}
                                                                        ${isSelectedCell ? 'cell-selected-outline' : ''}
                                                                    `}
                                                                    title={isRevenueMode ? `$${v.toFixed(2)} USD` : `${v} ventas`}
                                                                >
                                                                    {displayVal}
                                                                </td>
                                                            );
                                                        })
                                                    )}

                                                    <td className="total-column-cell">
                                                        {isRevenueMode 
                                                            ? (yearTotal > 0 ? `$${yearTotal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '—')
                                                            : yearTotal}
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
        </div>
    );
};

export default VentasGlobales;


