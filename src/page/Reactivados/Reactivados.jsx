import React, { useState, useEffect, useMemo, useContext } from "react";
import PageNav from "../../Componentes/PageNav";
import DropdownMenu from "../../Componentes/DropdownMenu";
import { PasswordContext } from "../../PasswordContext/PasswordContext";
import LogingForm from "../../Componentes/LogingForm";
import { fetchReactivados } from "../../services/reactivadosService";
import { exportReactivadosToExcel } from "../../utils/ExcelExportReactivados";
import "./Reactivados.css";

function Reactivados() {
  const { showPasswordState } = useContext(PasswordContext);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  // Filtros interactivos
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedSector, setSelectedSector] = useState("all");
  const [rangeMode, setRangeMode] = useState("12m"); // "12m", "24m", "all"

  // Modales
  const [showAllSectorsModal, setShowAllSectorsModal] = useState(false);
  const [showAllReactivatedModal, setShowAllReactivatedModal] = useState(false);
  const [modalSearchTerm, setModalSearchTerm] = useState("");

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

  const loadData = async (force = false) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchReactivados(force);
      setData(res);
    } catch (err) {
      console.error("Error al cargar contratos reactivados:", err);
      setError("No se pudo conectar con el servicio de auditoría de red.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Formato de moneda
  const formatCurrency = (val) =>
    "$ " +
    new Intl.NumberFormat("de-DE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);

  // Formato de fecha para tabla
  const formatDateSimple = (isoString) => {
    if (!isoString) return "-";
    const d = new Date(isoString);
    if (isNaN(d)) return isoString;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Filtrado de items según los selectores superiores
  const filteredData = useMemo(() => {
    if (!data || !data.items) return null;

    let items = data.items;

    if (selectedMonth !== "all") {
      items = items.filter((item) => {
        const d = new Date(item.created_at);
        return !isNaN(d) && d.getMonth() === parseInt(selectedMonth, 10);
      });
    }

    if (selectedSector !== "all") {
      items = items.filter((item) => item.sector?.name === selectedSector);
    }

    // Recalcular métricas para el conjunto filtrado
    let totalRevenue = 0;
    let totalResidencial = 0;
    let totalPyme = 0;
    const sectoresMap = {};

    items.forEach((item) => {
      const cost = parseFloat(item.plan?.cost) || 0;
      totalRevenue += cost;
      const type = (item.plan?.client_type?.name || "").toUpperCase();
      if (type === "PYME") {
        totalPyme++;
      } else {
        totalResidencial++;
      }

      const sName = item.sector?.name || "Sin sector";
      sectoresMap[sName] = (sectoresMap[sName] || 0) + 1;
    });

    const total = items.length;
    const percentRes = total > 0 ? ((totalResidencial / total) * 100).toFixed(1) : 0;
    const percentPyme = total > 0 ? ((totalPyme / total) * 100).toFixed(1) : 0;

    // Sectores
    const allSecList = Object.entries(sectoresMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const top5 = allSecList.slice(0, 5);
    const othersList = allSecList.slice(5);
    const othersCount = othersList.reduce((acc, c) => acc + c.count, 0);

    const displaySectores = top5.map((s) => ({
      name: s.name,
      count: s.count,
      percent: total > 0 ? ((s.count / total) * 100).toFixed(1) : 0,
    }));

    if (othersCount > 0) {
      displaySectores.push({
        name: "Otros",
        count: othersCount,
        percent: total > 0 ? ((othersCount / total) * 100).toFixed(1) : 0,
        isOthers: true,
      });
    }

    return {
      items,
      total,
      totalRevenue,
      totalResidencial,
      totalPyme,
      percentResidencial: percentRes,
      percentPyme,
      displaySectores,
      allSectores: allSecList,
    };
  }, [data, selectedMonth, selectedSector]);

  // Lista para el modal "Ver todos"
  const modalFilteredItems = useMemo(() => {
    if (!data || !data.items) return [];
    if (!modalSearchTerm.trim()) return data.items;

    const term = modalSearchTerm.toLowerCase();
    return data.items.filter((item) => {
      const name = (item.client?.full_name || "").toLowerCase();
      const contract = String(item.contract_id || "");
      const id = (item.client?.identification || "").toLowerCase();
      const sector = (item.sector?.name || "").toLowerCase();
      const plan = (item.plan?.name || "").toLowerCase();
      return (
        name.includes(term) ||
        contract.includes(term) ||
        id.includes(term) ||
        sector.includes(term) ||
        plan.includes(term)
      );
    });
  }, [data, modalSearchTerm]);

  // Cálculo del Donut Chart SVG
  const donutMetrics = useMemo(() => {
    if (!filteredData) return { resDash: 0, pymeDash: 0, resOffset: 0, pymeOffset: 0 };
    const radius = 68;
    const circumference = 2 * Math.PI * radius; // ~427.25
    const resFrac = filteredData.total > 0 ? filteredData.totalResidencial / filteredData.total : 1;
    const pymeFrac = filteredData.total > 0 ? filteredData.totalPyme / filteredData.total : 0;

    const resDash = resFrac * circumference;
    const pymeDash = pymeFrac * circumference;

    return {
      radius,
      circumference,
      resDash,
      pymeDash,
      pymeOffset: -resDash,
    };
  }, [filteredData]);

  // Cálculo para el Bar Chart
  const maxBarValue = useMemo(() => {
    if (!data || !data.mensual || data.mensual.length === 0) return 100;
    const maxVal = Math.max(...data.mensual.map((m) => m.count), 50);
    // Redondear hacia arriba al múltiplo de 50 más cercano
    return Math.ceil(maxVal / 50) * 50;
  }, [data]);

  const yAxisTicks = useMemo(() => {
    const step = maxBarValue / 5;
    return [maxBarValue, step * 4, step * 3, step * 2, step, 0];
  }, [maxBarValue]);

  // Iconos temáticos de colores para los sectores
  const getSectorIcon = (idx, isOthers) => {
    if (isOthers) {
      return (
        <div className="sector-icon-circle icon-bg-gray">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <circle cx="5" cy="5" r="2" />
            <circle cx="12" cy="5" r="2" />
            <circle cx="19" cy="5" r="2" />
            <circle cx="5" cy="12" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="19" cy="12" r="2" />
          </svg>
        </div>
      );
    }

    const palettes = [
      { bg: "icon-bg-orange", fill: "#f97316" },
      { bg: "icon-bg-blue", fill: "#00d2ff" },
      { bg: "icon-bg-wine", fill: "#f43f5e" },
      { bg: "icon-bg-teal", fill: "#14b8a6" },
      { bg: "icon-bg-green", fill: "#10b981" },
    ];
    const p = palettes[idx % palettes.length];

    return (
      <div className={`sector-icon-circle ${p.bg}`}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke={p.fill} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 10.5l9-7.5 9 7.5v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9z" />
          <polyline points="9 21 9 12 15 12 15 21" />
        </svg>
      </div>
    );
  };

  if (showPasswordState) {
    return <LogingForm />;
  }

  return (
    <div className="reactivados-page">
      <DropdownMenu />
      <PageNav />

      {/* SVG Gradients definitions */}
      <svg width="0" height="0" style={{ position: "absolute", pointerEvents: "none" }} aria-hidden="true">
        <defs>
          <linearGradient id="barGradTurquoise" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00d2ff" />
            <stop offset="100%" stopColor="#00ffc4" />
          </linearGradient>
          <linearGradient id="donutResGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#00d2ff" />
            <stop offset="100%" stopColor="#00ffc4" />
          </linearGradient>
          <linearGradient id="donutPymeGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
          <linearGradient id="goldBagGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="40%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
        </defs>
      </svg>

      <div className="reactivados-dashboard animate-slide-up">
        {/* ENCABEZADO SUPERIOR */}
        <div className="reactivados-header-container">
          <div className="reactivados-header-left">
            <div className="reactivados-header-icon-box">
              <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#00ffc4" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <line x1="20" y1="8" x2="20" y2="14" />
                <line x1="23" y1="11" x2="17" y2="11" />
              </svg>
            </div>
            <div className="reactivados-header-texts">
              <h2 className="reactivados-title-main">
                Reactiv<span className="title-highlight">ados</span>
              </h2>
              <p className="reactivados-subtitle">
                Control y seguimiento de clientes reactivados.
              </p>
            </div>
          </div>

          <div className="reactivados-header-right-col">
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

            {/* Fila de Controles / Filtros */}
            <div className="header-filters-row">
              {/* Filtro Mes */}
              <div className="header-select-pill">
                <svg className="pill-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="pill-select"
                >
                  <option value="all">Todos los meses</option>
                  {data?.mensual?.map((m) => (
                    <option key={m.monthIndex} value={m.monthIndex}>
                      {m.label} ({m.count})
                    </option>
                  ))}
                </select>
                <span className="pill-arrow">▾</span>
              </div>

              {/* Filtro Sector */}
              <div className="header-select-pill">
                <svg className="pill-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="4" y="2" width="16" height="20" rx="2" />
                  <line x1="9" y1="6" x2="9" y2="6.01" />
                  <line x1="15" y1="6" x2="15" y2="6.01" />
                  <line x1="9" y1="10" x2="9" y2="10.01" />
                  <line x1="15" y1="10" x2="15" y2="10.01" />
                </svg>
                <select
                  value={selectedSector}
                  onChange={(e) => setSelectedSector(e.target.value)}
                  className="pill-select"
                >
                  <option value="all">Todos los sectores</option>
                  {data?.allSectores?.map((s) => (
                    <option key={s.name} value={s.name}>
                      {s.name} ({s.count})
                    </option>
                  ))}
                </select>
                <span className="pill-arrow">▾</span>
              </div>

              {/* Botón Embudo / Exportar Excel */}
              <button
                className="btn-funnel-action"
                onClick={() => exportReactivadosToExcel(filteredData?.items || data?.items)}
                title="Descargar datos en Excel"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* ESTADOS DE CARGA Y ERROR */}
        {loading && !data ? (
          <div className="reactivados-loading-box">
            <div className="reactivados-spinner" />
            <p>Conectando con la auditoría de red y calculando reactivaciones...</p>
            <span className="loading-subtext">Aplicando filtros de estatus y exclusión de empleados</span>
          </div>
        ) : error ? (
          <div className="reactivados-error-box">
            <span className="error-icon">⚠️</span>
            <h3>Error al consultar los datos</h3>
            <p>{error}</p>
            <button className="btn-retry" onClick={() => loadData(true)}>Reintentar</button>
          </div>
        ) : data && filteredData ? (
          <div className="reactivados-content-grid">
            {/* ==============================================================
                FILA 1: 4 KPI CARDS
               ============================================================== */}
            <div className="kpi-four-cards-row">
              {/* Card 1: Total Reactivados */}
              <div className="kpi-stat-card card-kpi-green">
                <div className="kpi-icon-squircle icon-green-squircle">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#10b981" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <div className="kpi-details-col">
                  <span className="kpi-title-label">Total Reactivados</span>
                  <span className="kpi-main-number">{filteredData.total.toLocaleString("de-DE")}</span>
                  <div className="kpi-trend-pill">
                    <span className="trend-arrow">▲</span>
                    <span className="trend-text">{data.trends.total}</span>
                  </div>
                </div>
                <div className="kpi-mini-bars bars-green" aria-hidden="true">
                  <span className="kbar kb1" />
                  <span className="kbar kb2" />
                  <span className="kbar kb3" />
                  <span className="kbar kb4" />
                </div>
              </div>

              {/* Card 2: Reactivados Residenciales */}
              <div className="kpi-stat-card card-kpi-blue">
                <div className="kpi-icon-squircle icon-blue-squircle">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#00d2ff" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10" />
                    <polyline points="1 20 1 14 7 14" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                </div>
                <div className="kpi-details-col">
                  <span className="kpi-title-label">Reactivados Residenciales</span>
                  <span className="kpi-main-number">{filteredData.totalResidencial.toLocaleString("de-DE")}</span>
                  <div className="kpi-trend-pill">
                    <span className="trend-arrow">▲</span>
                    <span className="trend-text">{data.trends.residencial}</span>
                  </div>
                </div>
                <div className="kpi-mini-bars bars-blue" aria-hidden="true">
                  <span className="kbar kb1" />
                  <span className="kbar kb2" />
                  <span className="kbar kb3" />
                  <span className="kbar kb4" />
                </div>
              </div>

              {/* Card 3: Reactivados PYME */}
              <div className="kpi-stat-card card-kpi-purple">
                <div className="kpi-icon-squircle icon-purple-squircle">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#c084fc" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="2" width="16" height="20" rx="2" />
                    <line x1="9" y1="6" x2="9" y2="6.01" />
                    <line x1="15" y1="6" x2="15" y2="6.01" />
                    <line x1="9" y1="10" x2="9" y2="10.01" />
                    <line x1="15" y1="10" x2="15" y2="10.01" />
                    <line x1="9" y1="14" x2="9" y2="14.01" />
                    <line x1="15" y1="14" x2="15" y2="14.01" />
                  </svg>
                </div>
                <div className="kpi-details-col">
                  <span className="kpi-title-label">Reactivados PYME</span>
                  <span className="kpi-main-number">{filteredData.totalPyme.toLocaleString("de-DE")}</span>
                  <div className="kpi-trend-pill">
                    <span className="trend-arrow">▲</span>
                    <span className="trend-text">{data.trends.pyme}</span>
                  </div>
                </div>
                <div className="kpi-mini-bars bars-purple" aria-hidden="true">
                  <span className="kbar kb1" />
                  <span className="kbar kb2" />
                  <span className="kbar kb3" />
                  <span className="kbar kb4" />
                </div>
              </div>

              {/* Card 4: Ingresos Recuperados */}
              <div className="kpi-stat-card card-kpi-gold">
                <div className="kpi-icon-squircle icon-gold-squircle">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none">
                    <path d="M8 5C8 3.8 10 3 12 3s4 .8 4 2c0 .6-.5 1-1.2 1h-5.6c-.7 0-1.2-.4-1.2-1z" fill="url(#goldBagGrad)" />
                    <rect x="8.5" y="6" width="7" height="1.8" rx="0.9" fill="#fde047" />
                    <path d="M12 7.8c-4.5 0-8 3.8-8 8.8 0 3.8 3.5 6.4 8 6.4s8-2.6 8-6.4c0-5-3.5-8.8-8-8.8z" fill="url(#goldBagGrad)" />
                    <text x="12" y="18" textAnchor="middle" fontSize="10" fontWeight="900" fontFamily="sans-serif" fill="#78350f">$</text>
                  </svg>
                </div>
                <div className="kpi-details-col">
                  <span className="kpi-title-label">Ingresos Recuperados</span>
                  <span className="kpi-main-number text-gold-amount">{formatCurrency(filteredData.totalRevenue)}</span>
                  <div className="kpi-trend-pill">
                    <span className="trend-arrow">▲</span>
                    <span className="trend-text">{data.trends.revenue}</span>
                  </div>
                </div>
                <div className="kpi-mini-bars bars-gold" aria-hidden="true">
                  <span className="kbar kb1" />
                  <span className="kbar kb2" />
                  <span className="kbar kb3" />
                  <span className="kbar kb4" />
                </div>
              </div>
            </div>

            {/* ==============================================================
                FILA 2: GRÁFICO BARRAS (MESES) + DONUT CHART (PLANES)
               ============================================================== */}
            <div className="charts-double-row">
              {/* Card Izquierda: Reactivados por Mes */}
              <div className="reactivados-card card-chart-meses">
                <div className="card-header-flex">
                  <div className="card-headline-wrap">
                    <div className="card-header-icon-squircle">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#38bdf8" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="20" x2="18" y2="10" />
                        <line x1="12" y1="20" x2="12" y2="4" />
                        <line x1="6" y1="20" x2="6" y2="14" />
                      </svg>
                    </div>
                    <h3 className="card-header-title">Reactivados por Mes</h3>
                  </div>

                  <div className="card-tabs-segmented">
                    <button
                      className={`tab-segment-btn ${rangeMode === "12m" ? "active" : ""}`}
                      onClick={() => setRangeMode("12m")}
                    >
                      12 meses
                    </button>
                    <button
                      className={`tab-segment-btn ${rangeMode === "24m" ? "active" : ""}`}
                      onClick={() => setRangeMode("24m")}
                    >
                      24 meses
                    </button>
                    <button
                      className={`tab-segment-btn ${rangeMode === "all" ? "active" : ""}`}
                      onClick={() => setRangeMode("all")}
                    >
                      Todo
                    </button>
                  </div>
                </div>

                {/* Área del Gráfico de Barras Verticales */}
                <div className="barchart-container-wrap">
                  {/* Eje Y con líneas guía horizontales */}
                  <div className="barchart-grid-lines">
                    {yAxisTicks.map((tickVal) => (
                      <div key={tickVal} className="barchart-grid-row">
                        <span className="grid-tick-label">{tickVal}</span>
                        <div className="grid-horizontal-line" />
                      </div>
                    ))}
                  </div>

                  {/* Columnas de Barras */}
                  <div className="barchart-bars-flow">
                    {data.mensual.map((m) => {
                      const heightPercent = maxBarValue > 0 ? (m.count / maxBarValue) * 100 : 0;
                      return (
                        <div key={m.monthIndex} className="barchart-single-col">
                          <div className="bar-track-area">
                            <span className="bar-number-badge">{m.count}</span>
                            <div
                              className="bar-fill-gradient"
                              style={{ height: `${Math.max(5, heightPercent)}%` }}
                              title={`${m.label} ${m.year}: ${m.count} reactivados`}
                            />
                          </div>
                          <div className="bar-x-labels-box">
                            <span className="bar-month-text">{m.label}</span>
                            <span className="bar-year-text">{m.year}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Card Derecha: Reactivados por Tipo de Plan (Donut Chart) */}
              <div className="reactivados-card card-chart-donut">
                <div className="card-header-flex">
                  <div className="card-headline-wrap">
                    <div className="card-header-icon-squircle">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#38bdf8" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 2a10 10 0 0 1 10 10h-10z" />
                      </svg>
                    </div>
                    <h3 className="card-header-title">Reactivados por Tipo de Plan</h3>
                  </div>
                </div>

                <div className="donut-content-layout">
                  {/* Gráfico Donut SVG */}
                  <div className="donut-chart-wrapper">
                    <svg viewBox="0 0 160 160" width="150" height="150" className="donut-svg">
                      <circle
                        cx="80"
                        cy="80"
                        r={donutMetrics.radius}
                        fill="transparent"
                        stroke="rgba(255, 255, 255, 0.05)"
                        strokeWidth="16"
                      />
                      {/* Segmento Residencial (Turquesa) */}
                      <circle
                        cx="80"
                        cy="80"
                        r={donutMetrics.radius}
                        fill="transparent"
                        stroke="url(#donutResGrad)"
                        strokeWidth="16"
                        strokeDasharray={`${donutMetrics.resDash} ${donutMetrics.circumference}`}
                        strokeDashoffset="0"
                        strokeLinecap="round"
                        transform="rotate(-90 80 80)"
                        className="donut-segment-anim"
                      />
                      {/* Segmento PYME (Púrpura) */}
                      {filteredData.totalPyme > 0 && (
                        <circle
                          cx="80"
                          cy="80"
                          r={donutMetrics.radius}
                          fill="transparent"
                          stroke="url(#donutPymeGrad)"
                          strokeWidth="16"
                          strokeDasharray={`${donutMetrics.pymeDash} ${donutMetrics.circumference}`}
                          strokeDashoffset={donutMetrics.pymeOffset}
                          strokeLinecap="round"
                          transform="rotate(-90 80 80)"
                          className="donut-segment-anim"
                        />
                      )}
                    </svg>

                    {/* Centro del Donut */}
                    <div className="donut-center-texts">
                      <span className="donut-center-number">
                        {filteredData.total.toLocaleString("de-DE")}
                      </span>
                      <span className="donut-center-subtitle">Reactivados</span>
                    </div>
                  </div>

                  {/* Leyenda a la derecha */}
                  <div className="donut-legend-col">
                    <div className="donut-legend-item">
                      <div className="legend-label-wrap">
                        <span className="legend-dot dot-green" />
                        <span className="legend-text">Residencial</span>
                      </div>
                      <div className="legend-numbers-wrap">
                        <span className="legend-count">{filteredData.totalResidencial.toLocaleString("de-DE")}</span>
                        <span className="legend-percent">{filteredData.percentResidencial}%</span>
                      </div>
                    </div>

                    <div className="donut-legend-item">
                      <div className="legend-label-wrap">
                        <span className="legend-dot dot-purple" />
                        <span className="legend-text">PYME</span>
                      </div>
                      <div className="legend-numbers-wrap">
                        <span className="legend-count">{filteredData.totalPyme.toLocaleString("de-DE")}</span>
                        <span className="legend-percent">{filteredData.percentPyme}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ==============================================================
                FILA 3: REACTIVADOS POR SECTOR + ÚLTIMOS REACTIVADOS
               ============================================================== */}
            <div className="bottom-tables-double-row">
              {/* Card Izquierda: Reactivados por Sector */}
              <div className="reactivados-card card-sectores">
                <div className="card-header-flex">
                  <div className="card-headline-wrap">
                    <div className="card-header-icon-squircle">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#38bdf8" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 10.5l9-7.5 9 7.5v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9z" />
                        <polyline points="9 21 9 12 15 12 15 21" />
                      </svg>
                    </div>
                    <h3 className="card-header-title">Reactivados por Sector</h3>
                  </div>

                  <button
                    className="btn-view-all-pill"
                    onClick={() => setShowAllSectorsModal(true)}
                  >
                    Ver todos
                  </button>
                </div>

                <div className="sectores-rows-list">
                  {filteredData.displaySectores.map((sec, idx) => (
                    <div key={sec.name} className="sector-rank-item">
                      <div className="sector-icon-col">
                        {getSectorIcon(idx, sec.isOthers)}
                      </div>
                      <div className="sector-name-col">
                        <span className="sector-title-name">{sec.name}</span>
                      </div>
                      <div className="sector-track-col">
                        <div className="sector-track-bg">
                          <div
                            className="sector-fill-bar"
                            style={{ width: `${Math.min(100, Math.max(4, sec.percent))}%` }}
                          />
                        </div>
                      </div>
                      <div className="sector-metrics-col">
                        <span className="sector-count-num">{sec.count}</span>
                        <span className="sector-percent-num">{sec.percent}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card Derecha: Últimos Reactivados (Tabla) */}
              <div className="reactivados-card card-ultimos">
                <div className="card-header-flex">
                  <div className="card-headline-wrap">
                    <div className="card-header-icon-squircle">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#38bdf8" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                    </div>
                    <h3 className="card-header-title">Últimos Reactivados</h3>
                  </div>

                  <button
                    className="btn-view-all-pill"
                    onClick={() => setShowAllReactivatedModal(true)}
                  >
                    Ver todos
                  </button>
                </div>

                <div className="table-wrapper-compact">
                  <table className="ultimos-compact-table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Cliente</th>
                        <th>ID / Código</th>
                        <th>Sector</th>
                        <th>Tipo</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.items.slice(0, 5).map((item) => {
                        const clientName = item.client?.full_name || "Sin nombre";
                        const clientType = item.plan?.client_type?.name || "Residencial";
                        const isPyme = clientType.toUpperCase() === "PYME";

                        return (
                          <tr key={item.contract_id}>
                            <td className="col-fecha">{formatDateSimple(item.created_at)}</td>
                            <td className="col-cliente" title={clientName}>
                              {clientName}
                            </td>
                            <td className="col-codigo">CL-{item.contract_id}</td>
                            <td className="col-sector">{item.sector?.name || "-"}</td>
                            <td className="col-tipo">{isPyme ? "PYME" : "Residencial"}</td>
                            <td className="col-estado">
                              <span className="pill-badge-reactivado">Reactivado</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* ==============================================================
          MODAL: VER TODOS LOS SECTORES
         ============================================================== */}
      {showAllSectorsModal && data && (
        <div className="reactivados-modal-overlay" onClick={() => setShowAllSectorsModal(false)}>
          <div className="reactivados-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3>Todos los Sectores Reactivados ({data.allSectores.length})</h3>
              <button className="modal-close-btn" onClick={() => setShowAllSectorsModal(false)}>✕</button>
            </div>
            <div className="modal-sectors-scroll-list">
              {data.allSectores.map((s, idx) => {
                const pct = data.total > 0 ? ((s.count / data.total) * 100).toFixed(1) : 0;
                return (
                  <div key={s.name} className="modal-sector-item">
                    <span className="modal-sector-rank">#{idx + 1}</span>
                    <span className="modal-sector-name">{s.name}</span>
                    <div className="modal-sector-bar-track">
                      <div className="modal-sector-bar-fill" style={{ width: `${Math.min(100, Math.max(3, pct))}%` }} />
                    </div>
                    <span className="modal-sector-count">{s.count} cl</span>
                    <span className="modal-sector-pct">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
          MODAL: VER TODOS LOS REACTIVADOS (TABLA COMPLETA CON BÚSQUEDA)
         ============================================================== */}
      {showAllReactivatedModal && data && (
        <div className="reactivados-modal-overlay" onClick={() => setShowAllReactivatedModal(false)}>
          <div className="reactivados-modal-card modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <div className="modal-title-with-count">
                <h3>Todos los Contratos Reactivados</h3>
                <span className="modal-count-badge">{modalFilteredItems.length} de {data.total}</span>
              </div>
              <div className="modal-actions-wrap">
                <button
                  className="btn-modal-excel"
                  onClick={() => exportReactivadosToExcel(modalFilteredItems)}
                  title="Exportar a Excel"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.3">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>Exportar Excel</span>
                </button>
                <button className="modal-close-btn" onClick={() => setShowAllReactivatedModal(false)}>✕</button>
              </div>
            </div>

            <div className="modal-search-bar">
              <input
                type="text"
                placeholder="Buscar por cliente, contrato, cédula o sector..."
                value={modalSearchTerm}
                onChange={(e) => setModalSearchTerm(e.target.value)}
                className="modal-search-input"
              />
              {modalSearchTerm && (
                <button className="clear-search-btn" onClick={() => setModalSearchTerm("")}>✕</button>
              )}
            </div>

            <div className="modal-table-scroll">
              <table className="ultimos-compact-table full-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Contrato</th>
                    <th>Cliente</th>
                    <th>Cédula</th>
                    <th>Teléfono</th>
                    <th>Plan</th>
                    <th>Tarifa</th>
                    <th>Sector</th>
                    <th>Tipo</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {modalFilteredItems.map((item) => (
                    <tr key={item.contract_id}>
                      <td className="col-fecha">{formatDateSimple(item.created_at)}</td>
                      <td className="col-codigo">CL-{item.contract_id}</td>
                      <td className="col-cliente">{item.client?.full_name || "-"}</td>
                      <td>{item.client?.identification || "-"}</td>
                      <td>{item.client?.mobile || "-"}</td>
                      <td>{item.plan?.name || "-"}</td>
                      <td className="cell-cost">${parseFloat(item.plan?.cost || 0).toFixed(2)}</td>
                      <td>{item.sector?.name || "-"}</td>
                      <td>{item.plan?.client_type?.name || "Residencial"}</td>
                      <td>
                        <span className="pill-badge-reactivado">Reactivado</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Reactivados;
