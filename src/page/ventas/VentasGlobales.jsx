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

            // Calculate total USD sum
            const totalUSD = data.reduce((acc, item) => {
                const costNum = typeof item.costoNum === "number" ? item.costoNum : parseFloat(String(item.costoPlan || "").replace(/[$,]/g, "").trim());
                return acc + (isNaN(costNum) ? 0 : costNum);
            }, 0);

            // Convert to XLSX format with column mapping
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

            // Append empty row and total row
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
                "Plan": "",
                "Costo de Plan ($)": "",
                "Estado Anterior": "",
                "Nuevo Estado": ""
            });

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

            // Auto-fit columns
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

    const getChartData = () => {
        if (!activeDataset) return { labels: meses, datasets: [] };
        return {
            labels: meses,
            datasets: Object.entries(activeDataset).map(([year, yearData]) => {
                const isSelected = year === selectedYear;
                const isComparing = comparisonYears.includes(year) && !isSelected;

                let color = "rgba(148, 163, 184, 0.35)"; // Fondo
                let borderWidth = 2;
                let pointRadius = 2;
                let zOrder = 1;

                if (isSelected) {
                    color = isRevenueMode ? "#10b981" : "#00d2ff"; // Verde en revenue / Cian en units
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
                    label: isRevenueMode ? `Ingresos ${year}` : `Ventas ${year}`,
                    data: yearData,
                    borderColor: color,
                    backgroundColor: color.includes("#") ? `${color}22` : color.replace("0.35", "0.1"),
                    tension: 0.4,
                    fill: isComparing && !isSelected && year === "2026",
                    borderWidth: borderWidth,
                    pointRadius: pointRadius,
                    pointHoverRadius: 6,
                    order: zOrder,
                };
            })
        };
    };

    // Normalización para Heatmap de la Tabla
    const currentMatrix = isRevenueMode ? revenueData : salesData;
    const maxSalesVal = currentMatrix ? Math.max(...Object.values(currentMatrix).flat(), 1) : 1;

    // Lógica Unificada de Selección
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
        maintainAspectRatio: !isMobile,
        plugins: {
            legend: {
                position: isMobile ? 'bottom' : 'top',
                labels: {
                    color: '#fff',
                    usePointStyle: true,
                    padding: isMobile ? 10 : 20,
                    font: { size: isMobile ? 11 : 13 },
                    cursor: 'pointer'
                },
                onClick: (e, legendItem) => {
                    const parts = legendItem.text.split(" ");
                    const year = parts[parts.length - 1];
                    if (year) handleYearSelection(year);
                }
            },
            title: {
                display: true,
                text: isRevenueMode
                    ? "Evolución de Ingresos por Ventas ($ USD) (2025-2026)"
                    : "Evolución de Ventas Mensuales (2021-2026)",
                color: '#fff',
                font: { size: isMobile ? 13 : 18 },
                padding: { bottom: isMobile ? 8 : 16 }
            },
            tooltip: {
                callbacks: {
                    label: (context) => isRevenueMode
                        ? `${context.dataset.label}: $${Number(context.raw).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`
                        : `${context.dataset.label}: ${context.raw} ventas`
                }
            }
        },
        scales: {
            y: {
                grid: { color: 'rgba(255, 255, 255, 0.1)' },
                ticks: {
                    color: '#fff',
                    font: { size: isMobile ? 10 : 12 },
                    callback: (val) => isRevenueMode ? `$${val}` : val
                }
            },
            x: {
                grid: { color: 'rgba(255, 255, 255, 0.1)' },
                ticks: { color: '#fff', font: { size: isMobile ? 10 : 12 } }
            }
        }
    };

    // Cálculos de Unidades e Ingresos
    const yearSales = salesData?.[selectedYear] || new Array(12).fill(0);
    const currentValue = yearSales[selectedMonth] || 0;
    const janValue = yearSales[0] || 0;
    const diffToJan = janValue > 0 ? ((currentValue - janValue) / janValue) * 100 : 0;

    const yearRevenue = revenueData?.[selectedYear] || new Array(12).fill(0);
    const currentRevenue = yearRevenue[selectedMonth] || 0;
    const annualRevenue = yearRevenue.reduce((a, b) => a + b, 0);
    const avgTicket = currentValue > 0 && currentRevenue > 0 ? (currentRevenue / currentValue) : 0;

    // Análisis Trimestral (Impacto en Unidades e Ingresos)
    const getQuarterData = () => {
        if (!yearSales) return [0, 0, 0, 0];
        return [
            yearSales.slice(0, 3).reduce((a, b) => a + b, 0),
            yearSales.slice(3, 6).reduce((a, b) => a + b, 0),
            yearSales.slice(6, 9).reduce((a, b) => a + b, 0),
            yearSales.slice(9, 12).reduce((a, b) => a + b, 0),
        ];
    };
    const [q1, q2, q3, q4] = getQuarterData();

    const getQuarterRevenue = () => {
        if (!yearRevenue) return [0, 0, 0, 0];
        return [
            yearRevenue.slice(0, 3).reduce((a, b) => a + b, 0),
            yearRevenue.slice(3, 6).reduce((a, b) => a + b, 0),
            yearRevenue.slice(6, 9).reduce((a, b) => a + b, 0),
            yearRevenue.slice(9, 12).reduce((a, b) => a + b, 0),
        ];
    };
    const [qRev1, qRev2, qRev3, qRev4] = getQuarterRevenue();

    // Proyección de Ventas Dinámica (2026)
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

        return { total, months, avg: avg.toFixed(1), result };
    };

    const proj = getProjectionData();

    return (
        <div className="ventas-globales-page">
            <LogoTitulo />
            <DropdownMenu />
            <PageNav />

            <div className="ventas-globales-container animate-fade-in">
                <header className="ventas-header">
                    <div>
                        <h1>Histórico de Ventas Globales</h1>
                        <p>Análisis de impacto trimestral, ingresos y auditoría en tiempo real</p>
                    </div>
                </header>

                {loading ? (
                    <div className="loader-container">
                        <div className="loader-spinner"></div>
                        <p>Sincronizando con API de Auditorías Sisprot...</p>
                    </div>
                ) : (
                    <>
                        <div className="analysis-grid">
                            {/* Tarjeta 1: Consulta Detallada y Descarga */}
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
                                <button 
                                    className="download-excel-btn" 
                                    onClick={handleDownloadExcel} 
                                    disabled={downloading || !canDownload}
                                    title={!canDownload ? "Registros exactos disponibles solo a partir de Julio 2025" : ""}
                                >
                                    {downloading ? "Descargando..." : "📊 Descargar Excel"}
                                </button>
                                {!canDownload && (
                                    <span className="excel-disabled-warning">
                                        Disponible desde Julio 2025
                                    </span>
                                )}
                                <div className="result-val">{currentValue}</div>
                                <span className="unit">Ventas en {meses[selectedMonth]} {selectedYear}</span>
                            </div>

                            {/* Tarjeta 2: Ingresos por Ventas ($ USD) */}
                            <div className="stat-card glass revenue-card">
                                <h3>Ingresos por Ventas</h3>
                                <div className="revenue-val">
                                    {currentRevenue > 0
                                        ? `$${currentRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                        : (currentValue > 0 && parseInt(selectedYear) <= 2025 && selectedMonth < 10 ? 'N/D' : '$0.00')}
                                </div>
                                <span className="unit">
                                    {currentRevenue > 0 
                                        ? `Facturación en ${meses[selectedMonth]} ${selectedYear}`
                                        : (currentValue > 0 && parseInt(selectedYear) <= 2025 && selectedMonth < 10 
                                            ? `Desglose en $ desde Nov 2025` 
                                            : `Sin ingresos en ${meses[selectedMonth]} ${selectedYear}`)}
                                </span>
                                <div className="revenue-pills-row">
                                    <div className="revenue-pill">
                                        Año {selectedYear}: <strong>${annualRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                                    </div>
                                    {avgTicket > 0 && (
                                        <div className="revenue-pill">
                                            Ticket Prom.: <strong>${avgTicket.toFixed(2)}</strong>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Tarjeta 3: Variación vs Enero */}
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

                            {/* Tarjeta 4: Proyección Anual */}
                            <div className="stat-card glass projection-card">
                                <h3>Proyección Ventas 2026</h3>
                                <div className="projection-val">{proj.result}</div>
                                <span className="unit">Total Estimado Anual</span>
                                <div className="calc-explanation-box">
                                    <p><strong>Metodología de Proyección:</strong></p>
                                    <p>1. Ventas reales registradas: <strong>{proj.total}</strong> uds.</p>
                                    <p>2. Meses operados analizados: <strong>{proj.months}</strong> meses.</p>
                                    <p>3. Promedio mensual actual: <strong>{proj.avg}</strong> uds.</p>
                                    <p>4. Proyección (Promedio x 12): <strong>{proj.result}</strong> uds.</p>
                                    <div className="dynamic-note">
                                        ⚠️ <strong>Nota:</strong> Cálculo dinámico auditado en vivo con la API de Sisprot.
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Impacto Trimestral */}
                        <div className="quarterly-analysis glass">
                            <h3>Impacto Trimestral de Ventas {selectedYear}</h3>
                            <div className="quarters-grid">
                                <div className="q-item">
                                    <span className="q-label">T1 (Ene-Mar)</span>
                                    <div className="q-val">{q1}</div>
                                    {qRev1 > 0 && <span className="q-subval">${qRev1.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD</span>}
                                </div>
                                <div className="q-item">
                                    <span className="q-label">T2 (Abr-Jun)</span>
                                    <div className="q-val">{q2}</div>
                                    {qRev2 > 0 && <span className="q-subval">${qRev2.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD</span>}
                                </div>
                                <div className="q-item">
                                    <span className="q-label">T3 (Jul-Sep)</span>
                                    <div className="q-val">{q3}</div>
                                    {qRev3 > 0 && <span className="q-subval">${qRev3.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD</span>}
                                </div>
                                <div className="q-item">
                                    <span className="q-label">T4 (Oct-Dic)</span>
                                    <div className="q-val">{q4}</div>
                                    {qRev4 > 0 && <span className="q-subval">${qRev4.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD</span>}
                                </div>
                            </div>
                        </div>

                        {/* Gráfico Principal */}
                        <div className="chart-wrapper glass">
                            {isMobile ? (
                                <div className="mobile-chart-alt">
                                    <h4 className="mobile-chart-title">
                                        📊 {isRevenueMode ? "Comparativo de Ingresos por Año" : "Comparativo por Año"}
                                    </h4>
                                    <div className="year-bars">
                                        {Object.entries(activeDataset)
                                            .sort(([a], [b]) => b - a)
                                            .map(([year, data]) => {
                                                const total = data.reduce((a, b) => a + b, 0);
                                                const maxTotal = Math.max(
                                                    ...Object.values(activeDataset).map(d => d.reduce((a, b) => a + b, 0)),
                                                    1
                                                );
                                                const isSelected = year === selectedYear;
                                                const pct = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
                                                return (
                                                    <div
                                                        key={year}
                                                        className={`year-bar-row ${isSelected ? 'selected' : ''}`}
                                                        onClick={() => handleYearSelection(year)}
                                                    >
                                                        <span className="year-bar-label">{year}</span>
                                                        <div className="year-bar-track">
                                                            <div
                                                                className="year-bar-fill"
                                                                style={{ width: `${pct}%`, background: isRevenueMode ? '#10b981' : undefined }}
                                                            />
                                                        </div>
                                                        <span className="year-bar-total">
                                                            {isRevenueMode ? `$${total.toFixed(0)}` : total}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                    </div>

                                    <h4 className="mobile-chart-title" style={{ marginTop: '22px' }}>
                                        📅 {isRevenueMode ? `Ingresos Mensuales — ${selectedYear}` : `Mensual — ${selectedYear}`}
                                    </h4>
                                    <div className="month-bars">
                                        {meses.map((mes, i) => {
                                            const val = (activeDataset[selectedYear] || [])[i] || 0;
                                            const maxVal = Math.max(...(activeDataset[selectedYear] || []), 1);
                                            const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
                                            const isActive = i === selectedMonth;
                                            return (
                                                <div
                                                    key={mes}
                                                    className={`month-bar-col ${isActive ? 'active' : ''}`}
                                                    onClick={() => setSelectedMonth(i)}
                                                >
                                                    <div className="month-bar-wrap">
                                                        <div
                                                            className="month-bar-fill"
                                                            style={{ height: `${Math.max(pct, 3)}%`, background: isRevenueMode ? '#10b981' : undefined }}
                                                        />
                                                    </div>
                                                    <span className="month-bar-val">
                                                        {isRevenueMode ? (val > 0 ? `$${val.toFixed(0)}` : '-') : (val || '-')}
                                                    </span>
                                                    <span className="month-bar-label">{mes}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <p className="mobile-chart-hint">Toca un año para seleccionarlo · Toca un mes para el detalle</p>
                                </div>
                            ) : (
                                <Line data={getChartData()} options={options} />
                            )}
                        </div>

                        {/* Tarjeta de Guía Interactiva */}
                        <div className="info-guide-card glass animate-fade-in">
                            <div className="guide-icon">💡</div>
                            <div className="guide-text">
                                <h4>Auditoría en Tiempo Real & Matriz Dinámica</h4>
                                <p>Las ventas desde <strong>Noviembre 2025 y todo 2026</strong> se sincronizan directamente con las transiciones de estatus <code>Por instalar (18) ➔ Activo (16)</code> de Sisprot. Usa los botones superiores de la tabla para alternar entre <strong>Unidades Vendidas</strong> e <strong>Ingresos Facturados ($ USD)</strong>.</p>
                            </div>
                        </div>

                        {/* Matriz Comparativa con selector de Unidades / Ingresos */}
                        <div className="data-table-container glass">
                            <div className="table-header-row">
                                <div>
                                    <h3 className="premium-table-title">Matriz Comparativa</h3>
                                    <p className="table-subtitle">
                                        {isRevenueMode 
                                            ? "Ingresos mensuales recaudados por activaciones en dólares ($ USD)"
                                            : "Total de contratos nuevos activados mes a mes"}
                                    </p>
                                </div>
                                <div className="metric-toggle-pills">
                                    <button 
                                        type="button"
                                        className={`metric-toggle-btn ${!isRevenueMode ? 'active' : ''}`}
                                        onClick={() => setMetricView('units')}
                                    >
                                        📦 Unidades (Ventas)
                                    </button>
                                    <button 
                                        type="button"
                                        className={`metric-toggle-btn revenue-mode ${isRevenueMode ? 'active' : ''}`}
                                        onClick={() => setMetricView('revenue')}
                                    >
                                        💵 Facturación ($ USD)
                                    </button>
                                </div>
                            </div>

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
                                        {Object.entries(currentMatrix).reverse().map(([year, yearData]) => {
                                            const isMain = year === selectedYear;
                                            const isComp = comparisonYears.includes(year) && !isMain;
                                            const yearTotal = yearData.reduce((a, b) => a + b, 0);

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
                                                    {year === '2021' && !isRevenueMode ? (
                                                        <>
                                                            <td
                                                                colSpan={5}
                                                                className="heatmap-cell consolidated-cell has-value"
                                                                style={{ "--intensity": 148 / maxSalesVal, textAlign: 'center' }}
                                                            >
                                                                <span className="cell-val">148</span>
                                                            </td>
                                                            {yearData.slice(5).map((v, i) => (
                                                                <td
                                                                    key={i + 5}
                                                                    style={{ "--intensity": v / maxSalesVal }}
                                                                    className={`heatmap-cell ${v > 0 ? 'has-value' : 'is-zero'}`}
                                                                >
                                                                    <span className="cell-val">{v}</span>
                                                                </td>
                                                            ))}
                                                        </>
                                                    ) : (
                                                        yearData.map((v, i) => {
                                                            const displayVal = isRevenueMode 
                                                                ? (v > 0 ? `$${v.toFixed(0)}` : '—') 
                                                                : (v > 0 ? v : '0');
                                                            const isHighlight = isMain && i === selectedMonth;

                                                            return (
                                                                <td
                                                                    key={i}
                                                                    style={{ "--intensity": v / maxSalesVal }}
                                                                    title={isRevenueMode ? `$${v.toFixed(2)} USD` : `${v} ventas`}
                                                                    className={`
                                                                        heatmap-cell
                                                                        ${v > 0 ? 'has-value' : 'is-zero'} 
                                                                        ${isHighlight ? 'highlight-cell' : ''}
                                                                        ${isRevenueMode ? 'revenue-heatmap' : ''}
                                                                    `}
                                                                >
                                                                    <span className="cell-val">{displayVal}</span>
                                                                </td>
                                                            );
                                                        })
                                                    )}
                                                    <td className="total-cell">
                                                        {isRevenueMode 
                                                            ? (yearTotal > 0 ? `$${yearTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—')
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

