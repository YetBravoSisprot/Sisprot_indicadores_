import React, { useState, useEffect, useMemo } from "react";
import PageNav from "../../Componentes/PageNav";
import DropdownMenu from "../../Componentes/DropdownMenu";
import { fetchReactivados } from "../../services/reactivadosService";
import { exportReactivadosToExcel } from "../../utils/ExcelExportReactivados";
import "./Reactivados.css";

function Reactivados() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("all");

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

  // Filtrado reactivo en tiempo real
  const filteredItems = useMemo(() => {
    if (!data || !data.items) return [];

    return data.items.filter((item) => {
      // Filtro de búsqueda
      if (searchTerm.trim() !== "") {
        const term = searchTerm.toLowerCase();
        const clientName = (item.client?.full_name || "").toLowerCase();
        const contractId = String(item.contract_id || "");
        const identification = (item.client?.identification || "").toLowerCase();
        const sector = (item.sector?.name || "").toLowerCase();
        const plan = (item.plan?.name || "").toLowerCase();

        const matches =
          clientName.includes(term) ||
          contractId.includes(term) ||
          identification.includes(term) ||
          sector.includes(term) ||
          plan.includes(term);

        if (!matches) return false;
      }

      // Filtro por mes
      if (selectedMonth !== "all") {
        const dateObj = new Date(item.created_at);
        if (!isNaN(dateObj)) {
          if (dateObj.getMonth() !== parseInt(selectedMonth, 10)) {
            return false;
          }
        }
      }

      return true;
    });
  }, [data, searchTerm, selectedMonth]);

  const formatCurrency = (val) =>
    new Intl.NumberFormat("de-DE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val) + " US$";

  const formatDate = (isoString) => {
    if (!isoString) return "-";
    const d = new Date(isoString);
    if (isNaN(d)) return isoString;
    return d.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="reactivados-page">
      <DropdownMenu />
      <PageNav />

      <div className="reactivados-dashboard animate-slide-up">
        {/* ENCABEZADO */}
        <div className="reactivados-header-container">
          <div className="reactivados-header-left">
            <div className="reactivados-header-icon-box">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#38bdf8" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <circle cx="18" cy="15" r="2.5" />
                <path d="M18 11.5v1M18 17.5v1M15.5 15h-1M21.5 15h-1" />
              </svg>
            </div>
            <div className="reactivados-header-texts">
              <h2 className="reactivados-title-main">
                Control de <span className="title-highlight">Reactivados</span>
              </h2>
              <p className="reactivados-subtitle">
                Clientes que pasaron de Cancelado a Activo (Enero 2026 - Presente)
              </p>
            </div>
          </div>

          <div className="reactivados-header-actions">
            <button
              className="btn-refresh-reactivados"
              onClick={() => loadData(true)}
              disabled={loading}
              title="Actualizar datos desde la API"
            >
              <svg className={loading ? "spin" : ""} viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              <span>{loading ? "Consultando..." : "Actualizar"}</span>
            </button>

            {data && (
              <button
                className="btn-export-reactivados"
                onClick={() => exportReactivadosToExcel(filteredItems)}
                title="Descargar listado en Excel"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>Exportar Excel</span>
              </button>
            )}
          </div>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        {loading && !data ? (
          <div className="reactivados-loading-box">
            <div className="reactivados-spinner" />
            <p>Consultando auditorías de red y procesando reactivaciones...</p>
            <span className="loading-subtext">Filtrando cancelados a activos y excluyendo empleados</span>
          </div>
        ) : error ? (
          <div className="reactivados-error-box">
            <span className="error-icon">⚠️</span>
            <h3>Error al consultar la API</h3>
            <p>{error}</p>
            <button className="btn-retry" onClick={() => loadData(true)}>Reintentar</button>
          </div>
        ) : data ? (
          <>
            {/* KPI METRICS GRID */}
            <div className="reactivados-kpi-grid">
              {/* Card 1: Total Reactivados */}
              <div className="kpi-card card-total-reactivados">
                <div className="kpi-icon-box icon-cyan">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="8.5" cy="7" r="4" />
                    <polyline points="17 11 19 13 23 9" />
                  </svg>
                </div>
                <div className="kpi-info-col">
                  <span className="kpi-label">Total Reactivados</span>
                  <span className="kpi-value text-cyan">{data.total}</span>
                  <span className="kpi-subtext">Filtrados y validados</span>
                </div>
              </div>

              {/* Card 2: Ingreso Recuperado */}
              <div className="kpi-card card-revenue-recuperado">
                <div className="kpi-icon-box icon-gold">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </div>
                <div className="kpi-info-col">
                  <span className="kpi-label">Ingreso Mensual Recuperado</span>
                  <span className="kpi-value text-gold">{formatCurrency(data.totalRevenue)}</span>
                  <span className="kpi-subtext">Facturación recurrente mensual</span>
                </div>
              </div>

              {/* Card 3: Residencial vs PYME */}
              <div className="kpi-card card-breakdown-types">
                <div className="kpi-icon-box icon-purple">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                  </svg>
                </div>
                <div className="kpi-info-col">
                  <span className="kpi-label">Segmentación</span>
                  <div className="kpi-split-row">
                    <span className="split-item">
                      <strong>{data.totalResidencial}</strong> Residencial
                    </span>
                    <span className="split-divider">•</span>
                    <span className="split-item">
                      <strong>{data.totalPyme}</strong> PYME
                    </span>
                  </div>
                  <span className="kpi-subtext">Excluidos: {data.excludedCount} (Empleados/Personal)</span>
                </div>
              </div>
            </div>

            {/* SECCIÓN PRINCIPAL: FILTROS Y TABLA DETALLADA */}
            <div className="reactivados-main-card">
              <div className="reactivados-controls-row">
                {/* Buscador */}
                <div className="search-input-wrapper">
                  <svg className="search-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Buscar por cliente, cédula, contrato o sector..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="reactivados-search-field"
                  />
                  {searchTerm && (
                    <button className="clear-search-btn" onClick={() => setSearchTerm("")}>✕</button>
                  )}
                </div>

                {/* Filtro por Mes */}
                <div className="month-filter-wrapper">
                  <span className="filter-label">Mes:</span>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="reactivados-select"
                  >
                    <option value="all">Todos los meses (2026)</option>
                    {data.mensual?.map((m) => (
                      <option key={m.monthIndex} value={m.monthIndex}>
                        {m.label} ({m.count})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Conteo de resultados */}
              <div className="results-count-row">
                <span>
                  Mostrando <strong>{filteredItems.length}</strong> de <strong>{data.total}</strong> contratos reactivados
                </span>
              </div>

              {/* TABLA DE CONTRATOS REACTIVADOS */}
              <div className="table-responsive-container">
                <table className="reactivados-table">
                  <thead>
                    <tr>
                      <th>Contrato</th>
                      <th>Fecha Reactivación</th>
                      <th>Cliente</th>
                      <th>Cédula / RIF</th>
                      <th>Teléfono</th>
                      <th>Plan Contratado</th>
                      <th>Tarifa</th>
                      <th>Sector / Parroquia</th>
                      <th>Transición</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.length > 0 ? (
                      filteredItems.map((item, idx) => {
                        const clientName = item.client?.full_name || "Sin nombre";
                        const idStr = item.client?.identification || "-";
                        const phone = item.client?.mobile || "-";
                        const planName = item.plan?.name || "Sin Plan";
                        const cost = parseFloat(item.plan?.cost) || 0;
                        const sectorName = item.sector?.name || "-";
                        const parishName = item.sector?.parish?.name || "";
                        const clientType = item.plan?.client_type?.name || "RESIDENCIAL";

                        return (
                          <tr key={item.contract_id ? `${item.contract_id}-${idx}` : idx}>
                            <td className="cell-contract">#{item.contract_id}</td>
                            <td className="cell-date">{formatDate(item.created_at)}</td>
                            <td className="cell-client">
                              <span className="client-full-name">{clientName}</span>
                              <span className={`client-type-badge ${clientType.toLowerCase()}`}>
                                {clientType}
                              </span>
                            </td>
                            <td className="cell-id">{idStr}</td>
                            <td className="cell-phone">{phone}</td>
                            <td className="cell-plan">{planName}</td>
                            <td className="cell-cost">${cost.toFixed(2)}</td>
                            <td className="cell-sector">
                              <span className="sector-title">{sectorName}</span>
                              {parishName && <span className="parish-sub">{parishName}</span>}
                            </td>
                            <td className="cell-transition">
                              <span className="transition-badge">
                                <span className="status-old">Cancelado</span>
                                <span className="transition-arrow">→</span>
                                <span className="status-new">Activo</span>
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="9" className="no-data-cell">
                          No se encontraron contratos reactivados con los filtros aplicados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default Reactivados;
