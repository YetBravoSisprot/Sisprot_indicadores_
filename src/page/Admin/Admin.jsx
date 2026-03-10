import React, { useContext, useMemo, useState, useEffect } from "react";
import PageNav from "../../Componentes/PageNav";
import LogoTitulo from "../../Componentes/LogoTitulo";
import { PasswordContext } from "../../PasswordContext/PasswordContext";
import LogingForm from "../../Componentes/LogingForm";
import DropdownMenu from "../../Componentes/DropdownMenu";
import { getHistoricalRevenueData } from "../../services/revenueService";
import { getCycleLabel } from "../../utils/cycleHelper";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { useNavigate } from "react-router-dom";
import { Doughnut } from "react-chartjs-2";
import "./Admin.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
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
  const [showNeedsAttention, setShowNeedsAttention] = useState(false);
  const [revenueStats, setRevenueStats] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [isRevenueLoading, setIsRevenueLoading] = useState(true);
  const [showTrainingLog, setShowTrainingLog] = useState(false);
  const [trainingData, setTrainingData] = useState([]);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile = windowWidth < 768;
  const isPageLoading = isLoading || isRevenueLoading;

  // Fetch historical revenue data
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
      // Cargar log de entrenamiento
      const log = JSON.parse(localStorage.getItem('ai_training_log') || '[]');
      setTrainingData(log.reverse());
    }
  }, [showPasswordState]);

  // Calcular KPIs y datos procesados
  const { kpis, processedData } = useMemo(() => {
    if (!data || !data.results) return { kpis: null, processedData: null };

    const clientes = data.results;
    const totalClientes = clientes.length;
    const activos = clientes.filter(c => c.status_name === "Activo").length;
    const suspendidos = clientes.filter(c => c.status_name === "Suspendido").length;
    const pausados = clientes.filter(c => c.status_name === "Pausado").length;
    const cancelados = clientes.filter(c => c.status_name === "Cancelado").length;

    const needsAttention = clientes.filter(c =>
      c.status_name === "Suspendido"
    );

    const ingresosTotales = clientes.reduce((acc, curr) => {
      if (curr.status_name === "Activo") {
        return acc + parseFloat(curr.plan?.cost || 0);
      }
      return acc;
    }, 0);

    const ticketPromedio = activos > 0 ? ingresosTotales / activos : 0;
    const churnRate = totalClientes > 0 ? ((suspendidos + cancelados) / totalClientes) * 100 : 0;

    // Desglose por tipo de cliente (Solo tipos válidos/definidos)
    const revenueByType = clientes.reduce((acc, curr) => {
      if (curr.status_name === "Activo" && curr.client_type_name) {
        const type = curr.client_type_name;
        acc[type] = (acc[type] || 0) + parseFloat(curr.plan?.cost || 0);
      }
      return acc;
    }, {});

    const sectorStats = clientes.reduce((acc, curr) => {
      if (curr.status_name === "Activo") {
        const sector = curr.sector_name || "Sin Sector";
        if (!acc[sector]) acc[sector] = { count: 0, revenue: 0 };
        acc[sector].count += 1;
        acc[sector].revenue += parseFloat(curr.plan?.cost || 0);
      }
      return acc;
    }, {});

    const topSectores = Object.entries(sectorStats)
      .sort(([, a], [, b]) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      kpis: {
        totalClientes,
        activos,
        suspendidos,
        pausados,
        cancelados,
        ingresosTotales,
        ticketPromedio,
        churnRate
      },
      processedData: {
        revenueByType,
        topSectores,
        needsAttention,
        clientes
      }
    };
  }, [data]);

  const filteredClientes = useMemo(() => {
    if (!processedData?.clientes) return [];
    if (!searchTerm) return [];
    return processedData.clientes.filter(c =>
      c.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(c.client_identification || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(c.id).includes(searchTerm)
    ).slice(0, 15);
  }, [processedData?.clientes, searchTerm]);

  const otherContracts = useMemo(() => {
    if (!selectedClient || !data?.results) return [];
    const ci = selectedClient.client_identification;
    if (!ci) return [];
    return data.results.filter(c =>
      c.client_identification === ci &&
      c.id !== selectedClient.id
    );
  }, [selectedClient, data?.results]);

  const chartData = useMemo(() => {
    if (!revenueStats) return null;
    return {
      labels: revenueStats.chartLabels,
      datasets: [
        {
          label: "Ingreso Mensual",
          data: revenueStats.chartValues,
          fill: true,
          borderColor: "#00d2ff",
          backgroundColor: "rgba(0, 210, 255, 0.2)",
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: "#00d2ff",
          borderWidth: 3,
        }
      ]
    };
  }, [revenueStats]);

  const yearlyTotals = useMemo(() => {
    if (!revenueStats || !revenueStats.rawData) return [];
    
    const byYear = {};
    const monthNamesShort = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const currentYear = new Date().getFullYear().toString();
    
    revenueStats.rawData.forEach(item => {
      const dateParts = item.date.split('-');
      const year = dateParts[0];
      const monthIdx = parseInt(dateParts[1]) - 1;
      
      if (!byYear[year]) {
        byYear[year] = { year, amount: 0, months: [] };
      }
      byYear[year].amount += parseFloat(item.amount);
      if (!byYear[year].months.includes(monthIdx)) byYear[year].months.push(monthIdx);
    });

    return Object.keys(byYear).sort().map(year => {
      const info = byYear[year];
      info.months.sort((a, b) => a - b);
      const start = monthNamesShort[info.months[0]];
      const isCurrentYear = year === currentYear;
      const end = isCurrentYear ? "Hoy" : monthNamesShort[info.months[info.months.length - 1]];
      
      const prefix = isCurrentYear ? "Gestión" : "Cierre";
      
      return {
        label: `${prefix} ${year}`,
        subLabel: `(${start} — ${end})`,
        amount: info.amount
      };
    });
  }, [revenueStats]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => `$${context.raw.toLocaleString()}`
        }
      },
      datalabels: {
        display: (context) => {
          const data = context.dataset.data;
          const currentVal = data[context.dataIndex];
          const isLatest = context.dataIndex === data.length - 1;
          
          if (isMobile) {
            // Show if it's the latest point OR a significant peak
            const isPeak = currentVal >= Math.max(...data) * 0.95; 
            return isLatest || isPeak;
          }
          return true;
        },
        color: '#fff',
        align: 'top',
        anchor: 'end',
        offset: 8,
        font: {
          weight: 'bold',
          size: isMobile ? 10 : 11,
          family: "'Outfit', sans-serif"
        },
        formatter: (value) => {
          if (isMobile && value >= 1000) {
            return `$${(value / 1000).toFixed(1)}k`; // Compact format for mobile if values are large
          }
          return `$${value.toLocaleString('en-US', { 
            minimumFractionDigits: isMobile ? 0 : 2, 
            maximumFractionDigits: isMobile ? 0 : 2 
          })}`;
        },
        padding: 4
      }
    },
    layout: {
      padding: {
        top: 35,
        right: isMobile ? 25 : 15,
        left: 5,
        bottom: 5
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: "rgba(255, 255, 255, 0.1)" },
        ticks: { 
          color: "#94a3b8", 
          callback: (val) => `$${val.toLocaleString()}`,
          display: !isMobile // Hide y labels on very small screens to save space
        }
      },
      x: {
        grid: { display: false },
        ticks: { 
          color: "#94a3b8",
          font: { size: isMobile ? 9 : 12 },
          maxRotation: isMobile ? 45 : 0,
          autoSkip: true,
          maxTicksLimit: isMobile ? 6 : 12 
        }
      }
    }
  }), [isMobile, chartData]);

  const doughnutData = useMemo(() => {
    if (!processedData?.revenueByType) return null;
    const entries = Object.entries(processedData.revenueByType);
    return {
      labels: entries.map(([type]) => type),
      datasets: [{
        data: entries.map(([, amount]) => amount),
        backgroundColor: [
          'rgba(56, 189, 248, 0.8)',
          'rgba(168, 85, 247, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(16, 185, 129, 0.8)'
        ],
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)'
      }]
    };
  }, [processedData?.revenueByType]);

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#e2e8f0',
          padding: 20,
          font: { size: 10 }
        }
      },
      datalabels: {
        display: true,
        color: '#fff',
        formatter: (value, ctx) => {
          const total = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
          return `${((value / total) * 100).toFixed(0)}%`;
        },
        font: { weight: 'bold', size: 10 }
      }
    }
  };

  const handleClientClick = (client) => {
    setSelectedClient(client);
  };

  return (
    <div className="admin-page">
      {showPasswordState ? (
        <div className="login-container animate-fade-in">
          <h1>Inicia Sesión</h1>
          <LogingForm />
        </div>
      ) : (
        <>
          <LogoTitulo />
          <DropdownMenu />
          <PageNav />

          {isPageLoading ? (
            <div className="dashboard-loading animate-fade-in">
              <div className="loading-content glass">
                <div className="spinner"></div>
                <h3>Cargando Panel Administrativo...</h3>
                <p>Estamos preparando las métricas y gráficos para ti.</p>
              </div>
            </div>
          ) : (
            <div className="admin-dashboard animate-slide-up">
              <header className="dashboard-header">
                <h2 className="dashboard-title">Panel Administrativo</h2>

                <div className="header-actions">
                  {revenueStats && (
                    <div className="accumulated-kpi-v2 glass animate-fade-in">
                      <div className="kpi-label-group">
                        <span className="kpi-main-title">Recaudación Total</span>
                      </div>
                      
                      <div className="yearly-breakdown">
                         {yearlyTotals.map((yt, idx) => (
                           <div key={idx} className="yearly-line">
                              <div className="yt-label-group">
                                <span className="yt-label">{yt.label}</span>
                                <span className="yt-sublabel">{yt.subLabel}</span>
                              </div>
                              <span className="yt-amount">${yt.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
                           </div>
                         ))}
                      </div>

                      <div className="kpi-value-box-total">
                        <span className="kpi-total-label">Total Acumulado</span>
                        <div className="kpi-amount-wrapper">
                          <span className="kpi-currency">$</span>
                          <span className="kpi-amount">
                            {revenueStats.totalAccumulated.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="search-container glass">
                    <input
                      type="text"
                      placeholder="Buscar cliente (nombre o ID)..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="search-input"
                    />
                    {/* Solo Yetzabrm puede ver el botón de inteligencia de entrenamiento */}
                    {email?.toLowerCase().includes("yetzabrm") && (
                      <button
                        className="training-log-btn glass"
                        onClick={() => setShowTrainingLog(true)}
                        title="Ver Log de Entrenamiento IA"
                      >
                        🤖
                      </button>
                    )}
                    {searchTerm && (
                      <div className="search-results glass-dark animate-fade-in">
                        {filteredClientes.length > 0 ? (
                          filteredClientes.map(c => (
                            <div
                              key={c.id}
                              className="search-item"
                              onClick={() => {
                                handleClientClick(c);
                                setSearchTerm("");
                              }}
                              style={{ cursor: 'pointer' }}
                            >
                              <div className="search-item-info">
                                <span className="search-name">{c.client_name}</span>
                                <span className="search-id">#{c.id}</span>
                              </div>
                              <span className={`search-status ${c.status_name.toLowerCase()}`}>{c.status_name}</span>
                            </div>
                          ))
                        ) : (
                          <div className="search-no-results">No se encontraron clientes</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </header>

              {kpis ? (
                <div className="dashboard-content">
                  <div className="kpi-grid">
                    <div className="kpi-card glass primary">
                      <div className="kpi-icon">💰</div>
                      <div className="kpi-info">
                        <h3>Ingresos Mensuales</h3>
                        <p className="kpi-value">${kpis.ingresosTotales.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p>
                        <span className="kpi-trend positive">+5.2% vs mes anterior</span>
                      </div>
                    </div>

                    <div className="kpi-card glass secondary">
                      <div className="kpi-icon">📊</div>
                      <div className="kpi-info">
                        <h3>ARPU</h3>
                        <p className="kpi-value">${kpis.ticketPromedio.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        <span className="kpi-subtext">Ingreso promedio por usuario activo</span>
                      </div>
                    </div>

                    <div className="kpi-card glass info">
                      <div className="kpi-icon">👥</div>
                      <div className="kpi-info">
                        <h3>Clientes Activos</h3>
                        <p className="kpi-value">{kpis.activos}</p>
                        <span className="kpi-subtext">De {kpis.totalClientes} registrados</span>
                      </div>
                    </div>

                    <div className="kpi-card glass danger">
                      <div className="kpi-icon">📉</div>
                      <div className="kpi-info">
                        <h3>Tasa de Baja</h3>
                        <p className="kpi-value">{kpis.churnRate.toFixed(1)}%</p>
                        <span className="kpi-subtext">((Susp. + Canc.) / Total Clientes)</span>
                      </div>
                    </div>
                  </div>

                  {chartData && (
                    <div className="historical-chart-section glass animate-slide-up">
                      <div className="chart-header">
                        <h3>Ingreso Mensual (Tendencia Histórica)</h3>
                      </div>
                      <div className="line-chart-container">
                        <Line data={chartData} options={chartOptions} />
                      </div>
                    </div>
                  )}

                  <div className="insights-grid">
                    <div className="chart-card glass">
                      <h3>Ingresos por Tipo</h3>
                      {isMobile && doughnutData ? (
                        <div className="doughnut-container" style={{ height: '300px' }}>
                           <Doughnut data={doughnutData} options={doughnutOptions} />
                        </div>
                      ) : (
                        <div className="bar-chart">
                          {Object.entries(processedData.revenueByType).map(([type, amount]) => (
                            <div key={type} className="bar-row">
                              <span className="bar-label">{type}</span>
                              <div className="bar-container">
                                <div
                                  className="bar-fill"
                                  style={{ width: `${(amount / kpis.ingresosTotales) * 100}%` }}
                                ></div>
                              </div>
                              <span className="bar-value">${amount.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="chart-card glass">
                      <h3>Top 5 Sectores (Activos)</h3>
                      <div className="ranking-list">
                        {processedData.topSectores.map(([sector, stats], index) => (
                          <div key={sector} className="ranking-item">
                            <span className="ranking-pos">{index + 1}</span>
                            <div className="ranking-info">
                              <span className="ranking-name">{sector}</span>
                              <span className="ranking-amount">${stats.revenue.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <span className="ranking-count">{stats.count} cl.</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="action-section">
                    <button
                      className={`action-btn glass ${showNeedsAttention ? 'active' : ''}`}
                      onClick={() => setShowNeedsAttention(!showNeedsAttention)}
                    >
                      {showNeedsAttention ? "Ocultar Suspendidos" : "Ver Clientes Suspendidos"}
                      <span className="alert-badge">{processedData.needsAttention.length}</span>
                    </button>

                    {showNeedsAttention && (
                      <div className="attention-list glass animate-slide-up">
                        {processedData.needsAttention.slice(0, 10).map(c => (
                          <div
                            key={c.id}
                            className="attention-item"
                            onClick={() => handleClientClick(c)}
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="attention-info">
                              <strong>{c.client_name}</strong>
                              <span>{c.sector_name}</span>
                            </div>
                            <span className={`status-pill ${c.status_name.toLowerCase()}`}>{c.status_name}</span>
                          </div>
                        ))}
                        {processedData.needsAttention.length > 10 && (
                          <p
                            className="more-entries clickable"
                            onClick={() => navigate('/TopUrbanismo', { state: { initialFilter: ['Suspendido'] } })}
                            title="Ver todos los suspendidos en Top Urbanismo"
                          >
                            ...y {processedData.needsAttention.length - 10} más (Ver lista completa)
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="loading-container glass">
                  <div className="loader"></div>
                  <p>Procesando inteligencia de datos...</p>
                </div>
              )}
            </div>
          )}

          {/* Client Detail Modal */}
          {selectedClient && (
            <div className="modal-overlay animate-fade-in" onClick={() => setSelectedClient(null)}>
              <div className="client-modal glass animate-slide-up" onClick={e => e.stopPropagation()}>
                <header className="modal-header">
                  <div className="modal-title-group">
                    <span className={`status-indicator ${selectedClient.status_name.toLowerCase()}`}></span>
                    <h2>{selectedClient.client_name}</h2>
                  </div>
                  <button className="close-btn" onClick={() => setSelectedClient(null)}>×</button>
                </header>

                <div className="modal-body">
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
                        <span className={`status-pill ${selectedClient.status_name.toLowerCase()}`}>{selectedClient.status_name}</span>
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
                      <div className="detail-item" style={{ gridColumn: 'span 2' }}>
                        <label>Dirección Completa</label>
                        <span>{selectedClient.address || selectedClient.address_detail || "N/A"}</span>
                      </div>
                    </div>
                  </div>

                  {otherContracts.length > 0 && (
                    <div className="detail-section related-contracts">
                      <h3>Otros Contratos de este Cliente ({otherContracts.length})</h3>
                      <div className="contracts-list">
                        {otherContracts.map(oc => (
                          <div
                            key={oc.id}
                            className="related-contract-item glass"
                            onClick={() => setSelectedClient(oc)}
                          >
                            <div className="oc-main-info">
                              <span className="oc-id">#{oc.id}</span>
                              <span className="oc-plan">{oc.plan?.name || "Sin Plan"}</span>
                            </div>
                            <span className={`status-pill mini ${oc.status_name.toLowerCase()}`}>{oc.status_name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="detail-section">
                    <h3>Detalles Técnicos (Red)</h3>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <label>IP de Servicio</label>
                        <span className="mono-text">{selectedClient.service_detail?.ip || selectedClient.ip || "N/A"}</span>
                      </div>
                      <div className="detail-item">
                        <label>MAC / Serial</label>
                        <span className="mono-text">{selectedClient.service_detail?.mac || selectedClient.service_detail?.serial || selectedClient.onu_serial || "N/A"}</span>
                      </div>
                      <div className="detail-item">
                        <label>Fecha Creación</label>
                        <span>{selectedClient.created_at ? new Date(selectedClient.created_at).toLocaleDateString() : "N/A"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <footer className="modal-footer">
                  <button className="action-primary" onClick={() => setSelectedClient(null)}>Cerrar Detalle</button>
                </footer>
              </div>
            </div>
          )}

          {/* AI Training Log Modal */}
          {showTrainingLog && (
            <div className="modal-overlay animate-fade-in" onClick={() => setShowTrainingLog(false)}>
              <div className="training-modal glass animate-slide-up" onClick={e => e.stopPropagation()}>
                <header className="modal-header">
                  <div className="modal-title-group">
                    <span className="brain-icon">🧠</span>
                    <h2>Centro de Entrenamiento IA</h2>
                  </div>
                  <button className="close-btn" onClick={() => setShowTrainingLog(false)}>×</button>
                </header>

                <div className="modal-body">
                  <p className="training-desc">Lista de consultas que la Inteligencia Artificial no pudo responder por falta de contexto o datos.</p>

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
                            <td colSpan="3" className="no-logs">No hay consultas registradas aún (¡La IA está bien entrenada!)</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <footer className="modal-footer">
                  <button className="action-danger" onClick={() => {
                    localStorage.removeItem('ai_training_log');
                    setTrainingData([]);
                  }}>Limpiar Log</button>
                  <button className="action-primary" onClick={() => setShowTrainingLog(false)}>Cerrar</button>
                </footer>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Admin;
