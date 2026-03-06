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
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
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
  const { showPasswordState, data, isLoading } = useContext(PasswordContext);
  const [searchTerm, setSearchTerm] = useState("");
  const [showNeedsAttention, setShowNeedsAttention] = useState(false);
  const [revenueStats, setRevenueStats] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [isRevenueLoading, setIsRevenueLoading] = useState(true);

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

    // Top Sectores
    const sectorStats = clientes.reduce((acc, curr) => {
      if (curr.status_name === "Activo") {
        const sector = curr.sector_name || "Sin Sector";
        acc[sector] = (acc[sector] || 0) + 1;
      }
      return acc;
    }, {});

    const topSectores = Object.entries(sectorStats)
      .sort(([, a], [, b]) => b - a)
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
    return processedData.clientes.filter(c =>
      c.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.client_identification.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 10); // Limitar a 10 resultados para no sobrecargar
  }, [processedData?.clientes, searchTerm]);

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

  const chartOptions = {
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
        display: true,
        color: '#fff',
        align: 'top',
        anchor: 'end',
        offset: 8,
        font: {
          weight: 'bold',
          size: 11,
          family: "'Outfit', sans-serif"
        },
        formatter: (value) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        padding: 4
      }
    },
    layout: {
      padding: {
        top: 30,
        right: 15,
        left: 5,
        bottom: 5
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: "rgba(255, 255, 255, 0.1)" },
        ticks: { color: "#94a3b8", callback: (val) => `$${val.toLocaleString()}` }
      },
      x: {
        grid: { display: false },
        ticks: { color: "#94a3b8" }
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
                    <div className="accumulated-kpi glass animate-fade-in">
                      <span className="accumulated-label">Recaudación Total (2025 - 2026) ----&gt;</span>
                      <span className="accumulated-value">
                        ${revenueStats.totalAccumulated.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                      </span>
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
                    {searchTerm && (
                      <div className="search-results glass-dark animate-fade-in">
                        {filteredClientes.length > 0 ? (
                          filteredClientes.map(c => (
                            <div
                              key={c.id}
                              className="search-item"
                              onClick={() => handleClientClick(c)}
                              style={{ cursor: 'pointer' }}
                            >
                              <span className="search-name">{c.client_name}</span>
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
                        <h3>Ingreso Promedio</h3>
                        <p className="kpi-value">${kpis.ticketPromedio.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        <span className="kpi-subtext">Ingreso medio por cliente</span>
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
                        <span className="unit">Clientes suspendidos o cancelados</span>
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
                    </div>

                    <div className="chart-card glass">
                      <h3>Top 5 Sectores (Activos)</h3>
                      <div className="ranking-list">
                        {processedData.topSectores.map(([sector, count], index) => (
                          <div key={sector} className="ranking-item">
                            <span className="ranking-pos">{index + 1}</span>
                            <span className="ranking-name">{sector}</span>
                            <span className="ranking-count">{count} cl.</span>
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
        </>
      )}
    </div>
  );
}

export default Admin;
