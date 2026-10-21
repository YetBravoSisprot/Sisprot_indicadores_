import React, { useContext, useMemo, useState } from "react";
import PageNav from "../../Componentes/PageNav";
import LogoTitulo from "../../Componentes/LogoTitulo";
import DropdownMenu from "../../Componentes/DropdownMenu";
import { PasswordContext } from "../../PasswordContext/PasswordContext";
import LogingForm from "../../Componentes/LogingForm";
import { exportPlanesToExcel } from "../../utils/ExcelExportPlan";
import { exportToExcel } from "../../utils/ExcelExport";
import "./ventas.css";

function Ventas() {
  const { showPasswordState, data } = useContext(PasswordContext);

  const [lastUpdatedTime] = useState(() => {
    const now = new Date();
    const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
    const day = now.getDate();
    const month = months[now.getMonth()];
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, "0");
    const mins = String(now.getMinutes()).padStart(2, "0");
    return `${day} ${month} ${year}, ${hours}:${mins}`;
  });

  const stats = useMemo(() => {
    if (!data || !data.results) return null;
    const clientes = data.results;

    // Filter active PYME and RESIDENCIAL clients
    const activeClients = clientes.filter(curr => {
      let isActive = false;
      if (curr.client_subdivision && curr.client_subdivision !== "") {
        isActive = String(curr.client_subdivision).includes("ACTIVO");
      } else if (curr.status_name) {
        isActive = curr.status_name === "Activo" || curr.status_name === "Activos";
      }
      if (!isActive) return false;

      let tipoServicio = null;
      if (curr.client_subdivision && curr.client_subdivision !== "") {
        const partes = String(curr.client_subdivision).split("_");
        if (partes.length >= 2 && partes[1]) {
          tipoServicio = partes[1].toUpperCase();
        }
      }
      if (!tipoServicio && curr.client_type_name) {
        tipoServicio = String(curr.client_type_name).trim().toUpperCase();
      }

      return tipoServicio === "PYME" || tipoServicio === "RESIDENCIAL";
    });

    // Agrupación por plan con detalles de ingresos
    const planesData = activeClients.reduce((acc, curr) => {
      let planName = curr.plan?.name || "Sin Plan";
      planName = planName.replace(/RECURRENTE\s+/gi, "").replace(/PLAN\s+/gi, "").trim();
      const planCost = parseFloat(curr.plan?.cost) || 0;

      let category = null;
      let tipoServicio = null;
      if (curr.client_subdivision && curr.client_subdivision !== "") {
        const partes = String(curr.client_subdivision).split("_");
        if (partes.length >= 2 && partes[1]) {
          tipoServicio = partes[1].toUpperCase();
        }
      }
      if (!tipoServicio && curr.client_type_name) {
        tipoServicio = String(curr.client_type_name).trim().toUpperCase();
      }

      if (tipoServicio === "PYME") {
        category = "PYME";
      } else if (tipoServicio === "RESIDENCIAL") {
        category = "RESIDENCIAL";
      }

      if (!category) return acc;

      if (!acc[planName]) {
        acc[planName] = {
          name: planName,
          count: 0,
          activeCount: 0,
          cost: planCost,
          revenue: 0,
          category: category
        };
      }
      
      acc[planName].count += 1;
      acc[planName].activeCount += 1;
      acc[planName].revenue += planCost;
      return acc;
    }, {});

    const allPlanes = Object.values(planesData).sort((a, b) => b.count - a.count);
    const topPlanes = allPlanes.slice(0, 5);

    const total = activeClients.length;
    const nuevos = clientes.filter(c => c.status_name === "Activo").length;
    
    const categoryStats = Object.values(planesData).reduce((acc, curr) => {
      if (curr.category === "PYME") {
        acc.pymeRevenue += curr.revenue;
        acc.pymeCount += curr.count;
      } else {
        acc.residencialRevenue += curr.revenue;
        acc.residencialCount += curr.count;
      }
      acc.totalRevenue += curr.revenue;
      return acc;
    }, { pymeRevenue: 0, pymeCount: 0, residencialRevenue: 0, residencialCount: 0, totalRevenue: 0 });

    return { topPlanes, allPlanes, nuevos, total, ...categoryStats };
  }, [data]);

  const formatCurrency = (val) => new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true }).format(val) + " US$";

  const handleExportActiveClientsExcel = () => {
    if (!data || !data.results) return;
    const activeClients = data.results.filter(curr => {
      let isActive = false;
      if (curr.client_subdivision && curr.client_subdivision !== "") {
        isActive = String(curr.client_subdivision).includes("ACTIVO");
      } else if (curr.status_name) {
        isActive = curr.status_name === "Activo" || curr.status_name === "Activos";
      }
      if (!isActive) return false;

      let tipoServicio = null;
      if (curr.client_subdivision && curr.client_subdivision !== "") {
        const partes = String(curr.client_subdivision).split("_");
        if (partes.length >= 2 && partes[1]) {
          tipoServicio = partes[1].toUpperCase();
        }
      }
      if (!tipoServicio && curr.client_type_name) {
        tipoServicio = String(curr.client_type_name).trim().toUpperCase();
      }

      return tipoServicio === "PYME" || tipoServicio === "RESIDENCIAL";
    });

    const columns = [
      "Contrato", "Cedula", "IP", "MAC", "Estatus", "Cliente",
      "Teléfono", "Correo", "Sector", "Plan", "Costo", "Migrado",
      "Ciclo", "Tipo_Cliente", "Dirección"
    ];
    exportToExcel(activeClients, ["Clientes Activos PYME y Residencial"], columns, "general", "Reporte_Clientes_Activos.xlsx");
  };

  if (showPasswordState) {
    return <LogingForm />;
  }

  return (
    <div>
      <LogoTitulo />
      <DropdownMenu />
      <PageNav />

      {/* SVG Gradients definitions */}
      <svg width="0" height="0" style={{ position: "absolute", pointerEvents: "none" }} aria-hidden="true">
        <defs>
          <linearGradient id="goldCoinGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="40%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          <linearGradient id="goldBagGradHead" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="35%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
        </defs>
      </svg>

      <div className="ventas-dashboard animate-slide-up">
        {/* ENCABEZADO SUPERIOR */}
        <div className="ventas-header-container">
          <div className="ventas-header-left">
            <div className="ventas-header-icon-box">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#38bdf8" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2.5" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>
            <div className="ventas-header-texts">
              <h2 className="ventas-title-main">
                Monitor de <span className="title-highlight">Operaciones</span>
              </h2>
              <p className="ventas-subtitle">
                Seguimiento en tiempo real de los ingresos por plan.
              </p>
            </div>
          </div>

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

        {stats ? (
          <div className="ventas-content-layout">
            {/* TARJETA PRINCIPAL: INGRESOS POR PLAN */}
            <div className="ventas-main-card">
              <div className="card-top-header-row">
                <div className="card-title-col">
                  <div className="card-title-headline-wrap">
                    <div className="card-title-icon-wrap">
                      <svg viewBox="0 0 28 28" width="26" height="26" fill="none">
                        <path d="M10 5.2C10 3.8 12 3 14 3s4 .8 4 2.2c0 .6-.5 1-1.2 1h-5.6c-.7 0-1.2-.4-1.2-1z" fill="url(#goldBagGradHead)" />
                        <rect x="10.5" y="6.2" width="7" height="2" rx="1" fill="#fde047" />
                        <path d="M14 8.2c-5 0-9.2 4.2-9.2 9.8 0 4.2 4 7 9.2 7s9.2-2.8 9.2-7c0-5.6-4.2-9.8-9.2-9.8z" fill="url(#goldBagGradHead)" />
                        <text x="14" y="19.8" textAnchor="middle" fontSize="11" fontWeight="900" fontFamily="sans-serif" fill="#78350f">$</text>
                      </svg>
                    </div>
                    <h3 className="card-section-title">
                      Ingresos <span className="title-highlight">por Plan</span>
                    </h3>
                  </div>
                  <p className="card-section-subtitle">
                    Detalle de ingresos según tipo de plan residencial.
                  </p>
                </div>

                <div className="card-actions-row">
                  <button 
                    className="btn-action-tab active"
                    onClick={() => exportPlanesToExcel(stats.allPlanes)}
                    title="Descargar Resumen de Planes"
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="20" x2="18" y2="10" />
                      <line x1="12" y1="20" x2="12" y2="4" />
                      <line x1="6" y1="20" x2="6" y2="14" />
                    </svg>
                    <span>Resumen</span>
                  </button>
                  <button 
                    className="btn-action-tab"
                    onClick={handleExportActiveClientsExcel}
                    title="Descargar Detalle de Clientes Activos"
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    <span>Clientes</span>
                  </button>
                </div>
              </div>

              {/* LISTADO DE PLANES */}
              <div className="operaciones-plans-list">
                {stats.allPlanes.map((plan, index) => {
                  const percent = stats.total > 0 ? Math.round((plan.count / stats.total) * 100) : 0;
                  return (
                    <div key={plan.name} className="operaciones-plan-card">
                      <div className="plan-card-left">
                        <span className="plan-number-index">{String(index + 1).padStart(2, "0")}</span>
                        <div className="plan-details-col">
                          <div className="plan-info-top-row">
                            <span className="plan-title-text">{plan.name}</span>
                            <span className={`plan-category-badge-pill ${plan.category?.toLowerCase()}`}>
                              {plan.category}
                            </span>
                            <span className="plan-cost-pill">${plan.cost}</span>
                            <span className="plan-clients-pill">{plan.count} cl</span>
                          </div>
                          <div className="plan-progress-bar-row">
                            <span className="progress-label-text">INGRESOS:</span>
                            <div className="progress-track-bg">
                              <div 
                                className="progress-fill-bar" 
                                style={{ width: `${Math.min(100, Math.max(3, percent))}%` }} 
                              />
                            </div>
                            <span className="progress-percentage-text">{percent}%</span>
                          </div>
                        </div>
                      </div>

                      <div className="plan-card-right">
                        <div className="plan-revenue-badge-card">
                          <div className="revenue-icon-gold-circle">
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
                              <circle cx="12" cy="12" r="10" fill="url(#goldCoinGrad)" />
                              <text x="12" y="16.5" textAnchor="middle" fontSize="12" fontWeight="900" fontFamily="sans-serif" fill="#78350f">$</text>
                            </svg>
                          </div>
                          <div className="revenue-texts-wrap">
                            <span className="revenue-sub-label">Ingreso total</span>
                            <span className="revenue-total-amount">{formatCurrency(plan.revenue)}</span>
                          </div>
                          <div className="revenue-decorative-bars" aria-hidden="true">
                            <span className="rev-bar b1" />
                            <span className="rev-bar b2" />
                            <span className="rev-bar b3" />
                            <span className="rev-bar b4" />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* FILA DE 3 TARJETAS RESUMEN AL FONDO */}
            <div className="operaciones-bottom-summary-grid">
              {/* Card 1: Total Residencial */}
              <div className="summary-stat-card card-residencial">
                <div className="summary-icon-squircle icon-cyan-bg">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#38bdf8" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 10.5l9-7.5 9 7.5v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9z" />
                    <polyline points="9 21 9 12 15 12 15 21" />
                  </svg>
                </div>
                <div className="summary-info-col">
                  <span className="summary-stat-label">Total Residencial</span>
                  <span className="summary-stat-value">{formatCurrency(stats.residencialRevenue)}</span>
                </div>
                <div className="summary-ambient-bars bars-cyan" aria-hidden="true">
                  <span className="abar a1" />
                  <span className="abar a2" />
                  <span className="abar a3" />
                  <span className="abar a4" />
                </div>
              </div>

              {/* Card 2: Total PYME */}
              <div className="summary-stat-card card-pyme">
                <div className="summary-icon-squircle icon-purple-bg">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#c084fc" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="2" width="16" height="20" rx="2" />
                    <line x1="9" y1="6" x2="9" y2="6.01" />
                    <line x1="15" y1="6" x2="15" y2="6.01" />
                    <line x1="9" y1="10" x2="9" y2="10.01" />
                    <line x1="15" y1="10" x2="15" y2="10.01" />
                    <line x1="9" y1="14" x2="9" y2="14.01" />
                    <line x1="15" y1="14" x2="15" y2="14.01" />
                    <line x1="9" y1="18" x2="15" y2="18" />
                  </svg>
                </div>
                <div className="summary-info-col">
                  <span className="summary-stat-label">Total PYME</span>
                  <span className="summary-stat-value">{formatCurrency(stats.pymeRevenue)}</span>
                </div>
                <div className="summary-ambient-bars bars-purple" aria-hidden="true">
                  <span className="abar a1" />
                  <span className="abar a2" />
                  <span className="abar a3" />
                  <span className="abar a4" />
                </div>
              </div>

              {/* Card 3: INGRESO TOTAL */}
              <div className="summary-stat-card card-total">
                <div className="summary-icon-squircle icon-gold-bg">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
                    <circle cx="12" cy="12" r="10" fill="url(#goldCoinGrad)" />
                    <text x="12" y="16.5" textAnchor="middle" fontSize="12" fontWeight="900" fontFamily="sans-serif" fill="#78350f">$</text>
                  </svg>
                </div>
                <div className="summary-info-col">
                  <span className="summary-stat-label text-gold-label">INGRESO TOTAL</span>
                  <span className="summary-stat-value text-cyan-amount">{formatCurrency(stats.totalRevenue)}</span>
                </div>
                <div className="summary-ambient-bars bars-gold" aria-hidden="true">
                  <span className="abar a1" />
                  <span className="abar a2" />
                  <span className="abar a3" />
                  <span className="abar a4" />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="ventas-loading-box">
            <div className="status-spinner-circle" />
            <p>Cargando datos de operaciones...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Ventas;
