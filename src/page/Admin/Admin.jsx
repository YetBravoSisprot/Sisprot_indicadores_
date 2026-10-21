import React, { useContext, useMemo, useState, useEffect } from "react";
import PageNav from "../../Componentes/PageNav";
import DropdownMenu from "../../Componentes/DropdownMenu";
import { PasswordContext } from "../../PasswordContext/PasswordContext";
import LogingForm from "../../Componentes/LogingForm";
import { getHistoricalRevenueData } from "../../services/revenueService";
import { getCycleLabel } from "../../utils/cycleHelper";
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
  Filler,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { useNavigate } from "react-router-dom";
import "./Admin.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartDataLabels
);

function Admin() {
  const navigate = useNavigate();
  const { showPasswordState, data, isLoading, email } = useContext(PasswordContext);

  const [searchTerm, setSearchTerm] = useState("");
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showNeedsAttentionModal, setShowNeedsAttentionModal] = useState(false);
  const [showAllSectorsModal, setShowAllSectorsModal] = useState(false);
  const [revenueStats, setRevenueStats] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [isRevenueLoading, setIsRevenueLoading] = useState(true);
  const [showTrainingLog, setShowTrainingLog] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [trainingData, setTrainingData] = useState([]);
  const [timeRange, setTimeRange] = useState("12m"); // "12m", "24m", "all"

  const [lastUpdatedTime] = useState(() => {
    const now = new Date();
    const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
    const day = now.getDate();
    const month = months[now.getMonth()];
    const year = now.getFullYear();
    let hours = now.getHours();
    const mins = String(now.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "p. m." : "a. m.";
    hours = hours % 12 || 12;
    return `${day} ${month} ${year}, ${hours}:${mins} ${ampm}`;
  });

  const isPageLoading = isLoading || isRevenueLoading;

  // Cargar datos históricos de recaudación
  useEffect(() => {
    const loadRevenue = async () => {
      setIsRevenueLoading(true);
      try {
        const stats = await getHistoricalRevenueData();
        setRevenueStats(stats);
      } finally {
        setIsRevenueLoading(false);
      }
    };
    if (!showPasswordState) {
      loadRevenue();
      const log = JSON.parse(localStorage.getItem("ai_training_log") || "[]");
      setTrainingData(log.reverse());
    }
  }, [showPasswordState]);

  // Formato de moneda
  const formatCurrency = (val) =>
    "$" +
    new Intl.NumberFormat("de-DE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);

  // Formato de moneda con espacio
  const formatCurrencySpaced = (val) =>
    "$ " +
    new Intl.NumberFormat("de-DE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);

  // Procesamiento de métricas y KPIs
  const { kpis, processedData } = useMemo(() => {
    if (!data || !data.results) return { kpis: null, processedData: null };

    const clientes = data.results;
    const totalClientes = clientes.length;
    const activos = clientes.filter((c) => c.status_name === "Activo" || c.status_name === "Activos").length;
    const suspendidos = clientes.filter((c) => c.status_name === "Suspendido" || c.status_name === "Suspendidos").length;
    const pausados = clientes.filter((c) => c.status_name === "Pausado" || c.status_name === "Pausados").length;
    const cancelados = clientes.filter((c) => c.status_name === "Cancelado" || c.status_name === "Cancelados").length;

    const needsAttention = clientes.filter((c) => c.status_name === "Suspendido" || c.status_name === "Suspendidos");

    const ingresosTotales = clientes.reduce((acc, curr) => {
      if (curr.status_name === "Activo" || curr.status_name === "Activos") {
        return acc + parseFloat(curr.plan?.cost || 0);
      }
      return acc;
    }, 0);

    const ticketPromedio = activos > 0 ? ingresosTotales / activos : 0;
    const churnRate = totalClientes > 0 ? ((suspendidos + cancelados) / totalClientes) * 100 : 0;

    // Desglose por tipo de cliente
    const typeTotals = {
      PYME: 0,
      RESIDENCIAL: 0,
      EMPLEADO: 0,
      INTERCAMBIO: 0,
      GRATIS: 0,
    };

    clientes.forEach((curr) => {
      if (curr.status_name === "Activo" || curr.status_name === "Activos") {
        const cost = parseFloat(curr.plan?.cost || 0);
        let tName = (curr.client_type_name || "").toUpperCase();
        if (tName.includes("PYME")) {
          typeTotals.PYME += cost;
        } else if (tName.includes("RESIDENCIAL")) {
          typeTotals.RESIDENCIAL += cost;
        } else if (tName.includes("EMPLEADO")) {
          typeTotals.EMPLEADO += cost;
        } else if (tName.includes("INTERCAMBIO")) {
          typeTotals.INTERCAMBIO += cost;
        } else if (tName.includes("GRATIS")) {
          typeTotals.GRATIS += cost;
        } else {
          typeTotals.RESIDENCIAL += cost;
        }
      }
    });

    // Desglose por sector
    const sectorStats = clientes.reduce((acc, curr) => {
      if (curr.status_name === "Activo" || curr.status_name === "Activos") {
        const sector = curr.sector_name || "Sin Sector";
        if (!acc[sector]) acc[sector] = { count: 0, revenue: 0 };
        acc[sector].count += 1;
        acc[sector].revenue += parseFloat(curr.plan?.cost || 0);
      }
      return acc;
    }, {});

    const allSectores = Object.entries(sectorStats)
      .map(([name, val]) => ({ name, revenue: val.revenue, count: val.count }))
      .sort((a, b) => b.revenue - a.revenue);

    const top5Sectores = allSectores.slice(0, 5);

    return {
      kpis: {
        totalClientes,
        activos,
        suspendidos,
        pausados,
        cancelados,
        ingresosTotales,
        ticketPromedio,
        churnRate,
      },
      processedData: {
        typeTotals,
        top5Sectores,
        allSectores,
        needsAttention,
        clientes,
      },
    };
  }, [data]);

  // Totales anuales de recaudación
  const yearlyTotals = useMemo(() => {
    if (!revenueStats || !revenueStats.rawData) return [];

    const byYear = {};
    const monthNamesShort = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const currentYear = new Date().getFullYear().toString();

    revenueStats.rawData.forEach((item) => {
      const dateParts = item.date.split("-");
      const year = dateParts[0];
      const monthIdx = parseInt(dateParts[1], 10) - 1;

      if (!byYear[year]) {
        byYear[year] = { year, amount: 0, months: [] };
      }
      byYear[year].amount += parseFloat(item.amount);
      if (!byYear[year].months.includes(monthIdx)) byYear[year].months.push(monthIdx);
    });

    return Object.keys(byYear)
      .sort()
      .map((year) => {
        const info = byYear[year];
        info.months.sort((a, b) => a - b);
        const start = monthNamesShort[info.months[0]];
        const isCurrentYear = year === currentYear;
        const end = isCurrentYear ? "Hoy" : monthNamesShort[info.months[info.months.length - 1]];
        const prefix = isCurrentYear ? "Gestión" : "Cierre";

        return {
          label: `${prefix} ${year}`,
          subLabel: `(${start} — ${end})`,
          amount: info.amount,
        };
      });
  }, [revenueStats]);

  // Datos para el gráfico de línea de tendencia histórica
  const chartData = useMemo(() => {
    if (!revenueStats || !revenueStats.chartLabels) return null;

    let labels = revenueStats.chartLabels;
    let values = revenueStats.chartValues;

    if (timeRange === "12m") {
      labels = labels.slice(-12);
      values = values.slice(-12);
    } else if (timeRange === "24m") {
      labels = labels.slice(-24);
      values = values.slice(-24);
    }

    return {
      labels,
      datasets: [
        {
          label: "Ingreso Mensual",
          data: values,
          fill: true,
          borderColor: "#00d2ff",
          backgroundColor: (context) => {
            const chart = context.chart;
            const { ctx, chartArea } = chart;
            if (!chartArea) return "rgba(0, 210, 255, 0.2)";
            const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, "rgba(0, 210, 255, 0.38)");
            gradient.addColorStop(0.8, "rgba(0, 210, 255, 0.05)");
            gradient.addColorStop(1, "rgba(0, 210, 255, 0.0)");
            return gradient;
          },
          tension: 0.38,
          pointRadius: 4.5,
          pointHoverRadius: 7,
          pointBackgroundColor: "#00d2ff",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          borderWidth: 2.8,
        },
      ],
    };
  }, [revenueStats, timeRange]);

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#011624",
          borderColor: "rgba(0, 210, 255, 0.4)",
          borderWidth: 1,
          titleColor: "#94a3b8",
          bodyColor: "#00ffc4",
          bodyFont: { weight: "bold", size: 13 },
          callbacks: {
            label: (context) => `Ingreso: $${context.raw.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
          },
        },
        datalabels: {
          display: true,
          color: "#ffffff",
          align: "top",
          anchor: "end",
          offset: 7,
          font: {
            weight: "bold",
            size: 9.5,
            family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          },
          formatter: (value) => `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          padding: 2,
        },
      },
      layout: {
        padding: { top: 28, right: 16, left: 10, bottom: 6 },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: "rgba(255, 255, 255, 0.05)" },
          ticks: {
            color: "#64748b",
            font: { size: 10.5 },
            callback: (val) => `$${val.toLocaleString()}`,
          },
        },
        x: {
          grid: { display: false },
          ticks: {
            color: "#94a3b8",
            font: { size: 10.5, weight: "600" },
          },
        },
      },
    }),
    []
  );

  const filteredClientes = useMemo(() => {
    if (!processedData?.clientes) return [];
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    return processedData.clientes
      .filter(
        (c) =>
          c.client_name?.toLowerCase().includes(term) ||
          String(c.client_identification || "").toLowerCase().includes(term) ||
          String(c.id).includes(term)
      )
      .slice(0, 15);
  }, [processedData?.clientes, searchTerm]);

  const otherContracts = useMemo(() => {
    if (!selectedClient || !data?.results) return [];
    const ci = selectedClient.client_identification;
    if (!ci) return [];
    return data.results.filter((c) => c.client_identification === ci && c.id !== selectedClient.id);
  }, [selectedClient, data?.results]);

  const handleClientClick = (client) => {
    setSelectedClient(client);
  };

  if (showPasswordState) {
    return <LogingForm />;
  }

  return (
    <div className="admin-page">
      <DropdownMenu />
      <PageNav />

      {isPageLoading ? (
        <div className="admin-dashboard-loading">
          <div className="admin-spinner" />
          <h3>Cargando Panel Administrativo...</h3>
          <p>Preparando métricas en tiempo real y tendencias de ingresos.</p>
        </div>
      ) : (
        <div className="admin-dashboard animate-slide-up">
          {/* ==============================================================
              ENCABEZADO PRINCIPAL (Monitor + Título Bicolor + Subtítulo + Badge)
             ============================================================== */}
          <div className="admin-header-container">
            <div className="admin-header-left">
              <div className="admin-header-icon-box">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#38bdf8" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2.5" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </div>
              <div className="admin-header-texts">
                <h2 className="admin-title-main">
                  Panel <span className="title-highlight">Administrativo</span>
                </h2>
                <p className="admin-subtitle">
                  Vista general de ingresos, clientes y principales indicadores operativos.
                </p>
              </div>
            </div>

            <div className="admin-header-right">
              {/* Buscador Rápido de Clientes */}
              <div className="admin-search-pill-wrapper">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#38bdf8" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Buscar cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="admin-search-input-field"
                />
                {searchTerm && (
                  <button className="btn-clear-search-admin" onClick={() => setSearchTerm("")}>✕</button>
                )}
                {searchTerm && (
                  <div className="admin-search-results-floating animate-fade-in">
                    {filteredClientes.length > 0 ? (
                      filteredClientes.map((c) => (
                        <div
                          key={c.id}
                          className="admin-search-result-row"
                          onClick={() => {
                            handleClientClick(c);
                            setSearchTerm("");
                          }}
                        >
                          <div className="search-result-info">
                            <span className="search-client-name">{c.client_name}</span>
                            <span className="search-client-id">#{c.id}</span>
                          </div>
                          <span className={`search-status-pill ${(c.status_name || "").toLowerCase()}`}>{c.status_name}</span>
                        </div>
                      ))
                    ) : (
                      <div className="search-no-results-text">No se encontraron clientes</div>
                    )}
                  </div>
                )}
              </div>

              {/* Botón de Entrenamiento IA (solo Yetza) */}
              {email?.toLowerCase().includes("yetzabrm") && (
                <button
                  className="btn-ai-training-trigger"
                  onClick={() => setShowTrainingLog(true)}
                  title="Abrir Centro de Entrenamiento IA"
                >
                  <span className="ai-icon">🤖</span>
                  <span className="ai-label">IA Training</span>
                  <span className="ai-pulse-dot" />
                </button>
              )}

              {/* Badge de última actualización */}
              <div className="header-update-badge">
                <div className="update-badge-icon">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#38bdf8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <div className="update-badge-texts">
                  <span className="update-badge-label">Última actualización</span>
                  <span className="update-badge-date">{lastUpdatedTime}</span>
                </div>
              </div>
            </div>
          </div>

          {kpis && processedData && (
            <div className="admin-content-layout">
              {/* ==============================================================
                  FILA 1: 4 TARJETAS KPI SUPERIORES
                 ============================================================== */}
              <div className="admin-four-kpi-grid">
                {/* KPI 1: Ingresos Mensuales */}
                <div className="admin-kpi-card kpi-card-gold">
                  <div className="kpi-icon-squircle icon-gold-bg">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
                      <circle cx="12" cy="12" r="10" fill="#f59e0b" />
                      <text x="12" y="16.5" textAnchor="middle" fontSize="12" fontWeight="900" fontFamily="sans-serif" fill="#78350f">$</text>
                    </svg>
                  </div>
                  <div className="kpi-text-col">
                    <span className="kpi-label-text">Ingresos Mensuales</span>
                    <span className="kpi-big-value">{formatCurrency(kpis.ingresosTotales)}</span>
                    <div className="kpi-trend-row">
                      <span className="trend-arrow-up">▲</span>
                      <span className="trend-text-green">+5.2% vs mes anterior</span>
                    </div>
                  </div>
                  <div className="kpi-mini-bars bars-gold" aria-hidden="true">
                    <span className="akbar ak1" />
                    <span className="akbar ak2" />
                    <span className="akbar ak3" />
                    <span className="akbar ak4" />
                  </div>
                </div>

                {/* KPI 2: ARPU */}
                <div className="admin-kpi-card kpi-card-purple">
                  <div className="kpi-icon-squircle icon-purple-bg">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#c084fc" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="12" width="4" height="8" rx="1" />
                      <rect x="10" y="8" width="4" height="12" rx="1" />
                      <rect x="17" y="4" width="4" height="16" rx="1" />
                    </svg>
                  </div>
                  <div className="kpi-text-col">
                    <span className="kpi-label-text">ARPU</span>
                    <span className="kpi-big-value">${kpis.ticketPromedio.toFixed(2)}</span>
                    <span className="kpi-sub-desc">Ingreso promedio por usuario activo</span>
                  </div>
                  <div className="kpi-mini-bars bars-purple" aria-hidden="true">
                    <span className="akbar ak1" />
                    <span className="akbar ak2" />
                    <span className="akbar ak3" />
                    <span className="akbar ak4" />
                  </div>
                </div>

                {/* KPI 3: Clientes Activos */}
                <div className="admin-kpi-card kpi-card-cyan">
                  <div className="kpi-icon-squircle icon-cyan-bg">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#00d2ff" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </div>
                  <div className="kpi-text-col">
                    <span className="kpi-label-text">Clientes Activos</span>
                    <span className="kpi-big-value">{kpis.activos.toLocaleString("de-DE")}</span>
                    <span className="kpi-sub-desc">De {kpis.totalClientes.toLocaleString("de-DE")} registrados</span>
                  </div>
                  <div className="kpi-mini-bars bars-cyan" aria-hidden="true">
                    <span className="akbar ak1" />
                    <span className="akbar ak2" />
                    <span className="akbar ak3" />
                    <span className="akbar ak4" />
                  </div>
                </div>

                {/* KPI 4: Tasa de Baja */}
                <div className="admin-kpi-card kpi-card-red">
                  <div className="kpi-icon-squircle icon-red-bg">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#f43f5e" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
                      <polyline points="17 18 23 18 23 12" />
                    </svg>
                  </div>
                  <div className="kpi-text-col">
                    <span className="kpi-label-text">Tasa de Baja</span>
                    <span className="kpi-big-value">{kpis.churnRate.toFixed(1)}%</span>
                    <span className="kpi-sub-desc">(Susp. + Canc.) / Total Clientes</span>
                  </div>
                  <div className="kpi-mini-bars bars-red" aria-hidden="true">
                    <span className="akbar ak1" />
                    <span className="akbar ak2" />
                    <span className="akbar ak3" />
                    <span className="akbar ak4" />
                  </div>
                </div>
              </div>

              {/* ==============================================================
                  FILA 2: RECAUDACIÓN TOTAL + INGRESO MENSUAL HISTÓRICO
                 ============================================================== */}
              <div className="admin-middle-double-grid">
                {/* Card Izquierda: Recaudación Total */}
                <div className="admin-card card-recaudacion-total">
                  <div className="card-top-title-row">
                    <div className="card-title-icon-squircle icon-database-squircle">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#38bdf8" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                        <ellipse cx="12" cy="5" rx="9" ry="3" />
                        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                      </svg>
                    </div>
                    <h3 className="card-section-title">Recaudación Total</h3>
                  </div>

                  <div className="yearly-breakdown-lines-list">
                    {yearlyTotals.map((yt, idx) => (
                      <div key={idx} className="yearly-breakdown-single-row">
                        <span className="yearly-label-text">
                          <strong>{yt.label}</strong> <span className="sub-span">{yt.subLabel}</span>
                        </span>
                        <span className="yearly-amount-text">{formatCurrencySpaced(yt.amount)}</span>
                      </div>
                    ))}
                  </div>

                  {revenueStats && (
                    <div className="total-accumulated-highlight-box">
                      <div className="total-accumulated-icon-wrap">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#00ffc4" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="20" x2="18" y2="10" />
                          <line x1="12" y1="20" x2="12" y2="4" />
                          <line x1="6" y1="20" x2="6" y2="14" />
                        </svg>
                      </div>
                      <div className="total-accumulated-texts">
                        <span className="total-accumulated-sub">TOTAL ACUMULADO</span>
                        <span className="total-accumulated-big-amount">
                          {formatCurrencySpaced(revenueStats.totalAccumulated)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Derecha: Ingreso Mensual (Tendencia Histórica) */}
                <div className="admin-card card-tendencia-historica">
                  <div className="card-top-title-row justify-between">
                    <div className="title-left-group">
                      <div className="card-title-icon-squircle icon-chart-squircle">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#38bdf8" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                          <polyline points="17 6 23 6 23 12" />
                        </svg>
                      </div>
                      <h3 className="card-section-title">Ingreso Mensual (Tendencia Histórica)</h3>
                    </div>

                    <div className="segmented-range-pills">
                      <button
                        className={`btn-range-pill ${timeRange === "12m" ? "active" : ""}`}
                        onClick={() => setTimeRange("12m")}
                      >
                        12 meses
                      </button>
                      <button
                        className={`btn-range-pill ${timeRange === "24m" ? "active" : ""}`}
                        onClick={() => setTimeRange("24m")}
                      >
                        24 meses
                      </button>
                      <button
                        className={`btn-range-pill ${timeRange === "all" ? "active" : ""}`}
                        onClick={() => setTimeRange("all")}
                      >
                        Todo
                      </button>
                    </div>
                  </div>

                  <div className="chart-canvas-wrapper">
                    {chartData ? (
                      <Line data={chartData} options={chartOptions} />
                    ) : (
                      <div className="chart-empty-state">Cargando histórico de ingresos...</div>
                    )}
                  </div>
                </div>
              </div>

              {/* ==============================================================
                  FILA 3: INGRESOS POR TIPO + TOP 5 SECTORES (ACTIVOS)
                 ============================================================== */}
              <div className="admin-bottom-double-grid">
                {/* Card Izquierda: Ingresos por Tipo */}
                <div className="admin-card card-ingresos-tipo">
                  <div className="card-top-title-row">
                    <div className="card-title-icon-squircle icon-layers-squircle">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#38bdf8" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 2 7 12 12 22 7 12 2" />
                        <polyline points="2 17 12 22 22 17" />
                        <polyline points="2 12 12 17 22 12" />
                      </svg>
                    </div>
                    <h3 className="card-section-title">Ingresos por Tipo</h3>
                  </div>

                  <div className="type-progress-rows-list">
                    {/* Row 1: PYME */}
                    {(() => {
                      const amount = processedData.typeTotals.PYME;
                      const pct = kpis.ingresosTotales > 0 ? ((amount / kpis.ingresosTotales) * 100).toFixed(1) : 0;
                      return (
                        <div className="type-progress-row">
                          <div className="type-icon-box type-purple-bg">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#c084fc" strokeWidth="2.3">
                              <rect x="4" y="2" width="16" height="20" rx="2" />
                              <line x1="9" y1="6" x2="9" y2="6.01" />
                              <line x1="15" y1="6" x2="15" y2="6.01" />
                              <line x1="9" y1="10" x2="9" y2="10.01" />
                              <line x1="15" y1="10" x2="15" y2="10.01" />
                            </svg>
                          </div>
                          <span className="type-name-label">PYME</span>
                          <div className="type-progress-track">
                            <div className="type-fill-bar bar-mint" style={{ width: `${Math.min(100, Math.max(3, pct))}%` }} />
                          </div>
                          <div className="type-values-col">
                            <span className="type-amount-val">${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            <span className="type-percent-val">{pct}%</span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Row 2: RESIDENCIAL */}
                    {(() => {
                      const amount = processedData.typeTotals.RESIDENCIAL;
                      const pct = kpis.ingresosTotales > 0 ? ((amount / kpis.ingresosTotales) * 100).toFixed(1) : 0;
                      return (
                        <div className="type-progress-row">
                          <div className="type-icon-box type-blue-bg">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#38bdf8" strokeWidth="2.3">
                              <path d="M3 10.5l9-7.5 9 7.5v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9z" />
                              <polyline points="9 21 9 12 15 12 15 21" />
                            </svg>
                          </div>
                          <span className="type-name-label">RESIDENCIAL</span>
                          <div className="type-progress-track">
                            <div className="type-fill-bar bar-cyan" style={{ width: `${Math.min(100, Math.max(3, pct))}%` }} />
                          </div>
                          <div className="type-values-col">
                            <span className="type-amount-val">${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            <span className="type-percent-val">{pct}%</span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Row 3: EMPLEADO */}
                    {(() => {
                      const amount = processedData.typeTotals.EMPLEADO;
                      const pct = kpis.ingresosTotales > 0 ? ((amount / kpis.ingresosTotales) * 100).toFixed(1) : 0;
                      return (
                        <div className="type-progress-row">
                          <div className="type-icon-box type-green-bg">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#10b981" strokeWidth="2.3">
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                              <circle cx="12" cy="7" r="4" />
                            </svg>
                          </div>
                          <span className="type-name-label">EMPLEADO</span>
                          <div className="type-progress-track">
                            <div className="type-fill-bar bar-empty" style={{ width: `${pct}%` }} />
                          </div>
                          <div className="type-values-col">
                            <span className="type-amount-val">${amount.toFixed(2)}</span>
                            <span className="type-percent-val">{pct}%</span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Row 4: INTERCAMBIO */}
                    {(() => {
                      const amount = processedData.typeTotals.INTERCAMBIO;
                      const pct = kpis.ingresosTotales > 0 ? ((amount / kpis.ingresosTotales) * 100).toFixed(1) : 0;
                      return (
                        <div className="type-progress-row">
                          <div className="type-icon-box type-yellow-bg">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#f59e0b" strokeWidth="2.3">
                              <polyline points="17 1 21 5 17 9" />
                              <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                              <polyline points="7 23 3 19 7 15" />
                              <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                            </svg>
                          </div>
                          <span className="type-name-label">INTERCAMBIO</span>
                          <div className="type-progress-track">
                            <div className="type-fill-bar bar-empty" style={{ width: `${pct}%` }} />
                          </div>
                          <div className="type-values-col">
                            <span className="type-amount-val">${amount.toFixed(2)}</span>
                            <span className="type-percent-val">{pct}%</span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Row 5: GRATIS */}
                    {(() => {
                      const amount = processedData.typeTotals.GRATIS;
                      const pct = kpis.ingresosTotales > 0 ? ((amount / kpis.ingresosTotales) * 100).toFixed(1) : 0;
                      return (
                        <div className="type-progress-row">
                          <div className="type-icon-box type-pink-bg">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#f43f5e" strokeWidth="2.3">
                              <polyline points="20 12 20 22 4 22 4 12" />
                              <rect x="2" y="7" width="20" height="5" />
                              <line x1="12" y1="22" x2="12" y2="7" />
                            </svg>
                          </div>
                          <span className="type-name-label">GRATIS</span>
                          <div className="type-progress-track">
                            <div className="type-fill-bar bar-empty" style={{ width: `${pct}%` }} />
                          </div>
                          <div className="type-values-col">
                            <span className="type-amount-val">${amount.toFixed(2)}</span>
                            <span className="type-percent-val">{pct}%</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Botón Ver Clientes Suspendidos */}
                  <div className="card-bottom-action-row">
                    <button
                      className="btn-ver-suspendidos-pill"
                      onClick={() => setShowNeedsAttentionModal(true)}
                    >
                      <span className="btn-text">Ver Clientes Suspendidos</span>
                      <span className="badge-count-red">{processedData.needsAttention.length}</span>
                      <span className="btn-chevron">›</span>
                    </button>
                  </div>
                </div>

                {/* Card Derecha: Top 5 Sectores (Activos) */}
                <div className="admin-card card-top-sectores">
                  <div className="card-top-title-row justify-between">
                    <div className="title-left-group">
                      <div className="card-title-icon-squircle icon-trophy-squircle">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#38bdf8" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="8" r="6" />
                          <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
                        </svg>
                      </div>
                      <h3 className="card-section-title">Top 5 Sectores (Activos)</h3>
                    </div>

                    <button
                      className="btn-view-all-pill"
                      onClick={() => setShowAllSectorsModal(true)}
                    >
                      Ver todos
                    </button>
                  </div>

                  <div className="top-sectores-ranking-list">
                    {processedData.top5Sectores.map((sec, idx) => {
                      const medalStyles = ["rank-gold", "rank-silver", "rank-bronze", "rank-blue", "rank-blue"];
                      const medalClass = medalStyles[idx] || "rank-blue";

                      return (
                        <div key={sec.name} className="top-sector-row-item">
                          <div className={`sector-rank-badge ${medalClass}`}>
                            {idx + 1}
                          </div>
                          <span className="sector-rank-name">{sec.name}</span>
                          <span className="sector-rank-revenue">
                            ${sec.revenue.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <div className="sector-rank-clients-badge">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                              <circle cx="9" cy="7" r="4" />
                            </svg>
                            <span>{sec.count} cl.</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==============================================================
          MODAL: DETALLE DE CLIENTE SELECCIONADO
         ============================================================== */}
      {selectedClient && (
        <div className="admin-modal-overlay animate-fade-in" onClick={() => setSelectedClient(null)}>
          <div className="client-modal-card animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <div className="modal-title-group">
                <span className={`status-indicator-dot ${(selectedClient.status_name || "").toLowerCase()}`} />
                <h2>{selectedClient.client_name}</h2>
              </div>
              <button className="close-btn" onClick={() => setSelectedClient(null)}>✕</button>
            </header>

            <div className="modal-body-scroll">
              <div className="detail-section">
                <h3>Información General</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Contrato</label>
                    <span className="accent-text">#{selectedClient.id}</span>
                  </div>
                  <div className="detail-item">
                    <label>Cédula / ID</label>
                    <span>{selectedClient.client_identification}</span>
                  </div>
                  <div className="detail-item">
                    <label>Tipo de Cliente</label>
                    <span>{selectedClient.client_type_name}</span>
                  </div>
                  <div className="detail-item">
                    <label>Teléfono</label>
                    <span>{selectedClient.client_mobile || "N/A"}</span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h3>Suscripción y Estatus</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Plan Contratado</label>
                    <span>{selectedClient.plan?.name || "N/A"}</span>
                  </div>
                  <div className="detail-item">
                    <label>Costo Mensual</label>
                    <span className="price">${selectedClient.plan?.cost || 0}</span>
                  </div>
                  <div className="detail-item">
                    <label>Estado</label>
                    <span className={`status-pill ${(selectedClient.status_name || "").toLowerCase()}`}>{selectedClient.status_name}</span>
                  </div>
                  <div className="detail-item">
                    <label>Migrado</label>
                    <span>{selectedClient.migrate ? "Sí" : "No"}</span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h3>Ubicación</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Urbanismo / Sector</label>
                    <span>{selectedClient.sector_name}</span>
                  </div>
                  <div className="detail-item">
                    <label>Ciclo / Día Corte</label>
                    <span>{getCycleLabel(selectedClient.cycle) || selectedClient.cut_off_day || "N/A"}</span>
                  </div>
                  <div className="detail-item span-2">
                    <label>Dirección Completa</label>
                    <span>{selectedClient.address || selectedClient.address_detail || "N/A"}</span>
                  </div>
                </div>
              </div>

              {otherContracts.length > 0 && (
                <div className="detail-section related-contracts">
                  <h3>Otros Contratos de este Cliente ({otherContracts.length})</h3>
                  <div className="contracts-list">
                    {otherContracts.map((oc) => (
                      <div
                        key={oc.id}
                        className="related-contract-item"
                        onClick={() => setSelectedClient(oc)}
                      >
                        <div className="oc-main-info">
                          <span className="oc-id">#{oc.id}</span>
                          <span className="oc-plan">{oc.plan?.name || "Sin Plan"}</span>
                        </div>
                        <span className={`status-pill mini ${(oc.status_name || "").toLowerCase()}`}>{oc.status_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <footer className="modal-footer">
              <button className="action-primary" onClick={() => setSelectedClient(null)}>Cerrar Detalle</button>
            </footer>
          </div>
        </div>
      )}

      {/* ==============================================================
          MODAL: CLIENTES SUSPENDIDOS
         ============================================================== */}
      {showNeedsAttentionModal && processedData && (
        <div className="admin-modal-overlay animate-fade-in" onClick={() => setShowNeedsAttentionModal(false)}>
          <div className="client-modal-card modal-large" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <div className="modal-title-group">
                <span className="status-indicator-dot suspendido" />
                <h2>Clientes Suspendidos ({processedData.needsAttention.length})</h2>
              </div>
              <button className="close-btn" onClick={() => setShowNeedsAttentionModal(false)}>✕</button>
            </header>

            <div className="modal-body-scroll">
              <div className="suspended-table-wrapper">
                <table className="suspended-table">
                  <thead>
                    <tr>
                      <th>Contrato</th>
                      <th>Cliente</th>
                      <th>Cédula</th>
                      <th>Sector</th>
                      <th>Plan</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processedData.needsAttention.slice(0, 50).map((c) => (
                      <tr key={c.id}>
                        <td className="mono-text">#{c.id}</td>
                        <td className="bold-text">{c.client_name}</td>
                        <td>{c.client_identification || "-"}</td>
                        <td>{c.sector_name || "-"}</td>
                        <td>{c.plan?.name || "-"}</td>
                        <td>
                          <button
                            className="btn-table-detail"
                            onClick={() => {
                              setSelectedClient(c);
                              setShowNeedsAttentionModal(false);
                            }}
                          >
                            Ver Ficha
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {processedData.needsAttention.length > 50 && (
                <p
                  className="more-entries-clickable"
                  onClick={() => {
                    setShowNeedsAttentionModal(false);
                    navigate("/TopUrbanismo", { state: { initialFilter: ["Suspendido"] } });
                  }}
                >
                  ...y {processedData.needsAttention.length - 50} más. Haz clic para ver el listado completo en Top Urbanismo.
                </p>
              )}
            </div>

            <footer className="modal-footer">
              <button className="action-primary" onClick={() => setShowNeedsAttentionModal(false)}>Cerrar</button>
            </footer>
          </div>
        </div>
      )}

      {/* ==============================================================
          MODAL: TODOS LOS SECTORES ACTIVOS
         ============================================================== */}
      {showAllSectorsModal && processedData && (
        <div className="admin-modal-overlay animate-fade-in" onClick={() => setShowAllSectorsModal(false)}>
          <div className="client-modal-card" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <div className="modal-title-group">
                <h2>Todos los Sectores ({processedData.allSectores.length})</h2>
              </div>
              <button className="close-btn" onClick={() => setShowAllSectorsModal(false)}>✕</button>
            </header>

            <div className="modal-body-scroll">
              <div className="all-sectors-modal-list">
                {processedData.allSectores.map((sec, idx) => (
                  <div key={sec.name} className="all-sector-modal-row">
                    <span className="rank-num">#{idx + 1}</span>
                    <span className="rank-name">{sec.name}</span>
                    <span className="rank-rev">
                      ${sec.revenue.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="rank-cls">{sec.count} cl.</span>
                  </div>
                ))}
              </div>
            </div>

            <footer className="modal-footer">
              <button className="action-primary" onClick={() => setShowAllSectorsModal(false)}>Cerrar</button>
            </footer>
          </div>
        </div>
      )}

      {/* ==============================================================
          MODAL: CENTRO DE ENTRENAMIENTO IA
         ============================================================== */}
      {showTrainingLog && (
        <div className="admin-modal-overlay animate-fade-in" onClick={() => setShowTrainingLog(false)}>
          <div className="client-modal-card modal-large" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <div className="modal-title-group">
                <span className="brain-icon">🧠</span>
                <h2>Centro de Entrenamiento IA</h2>
              </div>
              <button className="close-btn" onClick={() => setShowTrainingLog(false)}>✕</button>
            </header>

            <div className="modal-body-scroll">
              <p className="training-desc">
                Lista de consultas que la Inteligencia Artificial no pudo responder por falta de contexto o datos.
              </p>

              <div className="training-table-container">
                <table className="training-table">
                  <thead>
                    <tr>
                      <th>Pregunta / Solicitud</th>
                      <th>Fecha</th>
                      <th>Usuario</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trainingData.length > 0 ? (
                      trainingData.map((log, i) => (
                        <tr key={i}>
                          <td className="log-query">"{log.pregunta}"</td>
                          <td className="log-date">{log.fecha}</td>
                          <td className="log-user">{log.usuario}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="3" className="no-logs">No hay consultas registradas aún</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <footer className="modal-footer training-footer">
              <button className="action-danger" onClick={() => setShowClearConfirm(true)}>Limpiar Log Local</button>
              <button className="action-primary" onClick={() => setShowTrainingLog(false)}>Cerrar</button>
            </footer>

            {showClearConfirm && (
              <div className="inner-confirm-overlay animate-fade-in">
                <div className="confirm-modal-box animate-slide-up">
                  <span className="warning-icon">⚠️</span>
                  <h3>¿Limpiar historial?</h3>
                  <p>Esta acción eliminará todas las consultas guardadas localmente. No se puede deshacer.</p>
                  <div className="confirm-actions">
                    <button className="confirm-cancel" onClick={() => setShowClearConfirm(false)}>Cancelar</button>
                    <button
                      className="confirm-danger"
                      onClick={() => {
                        localStorage.removeItem("ai_training_log");
                        setTrainingData([]);
                        setShowClearConfirm(false);
                      }}
                    >
                      Eliminar Todo
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Admin;
