import React, { useContext, useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // Import useNavigate
import PageNav from "../../Componentes/PageNav";
import LogoTitulo from "../../Componentes/LogoTitulo";
import DropdownMenu from "../../Componentes/DropdownMenu";
import { PasswordContext } from "../../PasswordContext/PasswordContext";
import LogingForm from "../../Componentes/LogingForm";
import { fetchMigrationData } from "../../services/migrationService";
import "./ventas.css";

const PLAN_MAPPING = {
  100: "PLAN 300M",
  21: "PLAN 450M",
  3: "PLAN 600M",
  43: "PLAN 650M",
  8: "PLAN 750M",
  16: "PLAN 800M",
  19: "PLAN 1 GIGA",
  101: "PLAN 200M"
};

const STATUS_TRANSLATION = {
  "SCHEDULED": "Programado",
  "APPLIED": "Ejecutado",
  "Sincronizados": "Total Sincronizado",
  "Activo": "Activo",
  "Suspendido": "Suspendido",
  "Desconocido": "Pendiente"
};

function Ventas() {
  const { showPasswordState, data } = useContext(PasswordContext);
  const navigate = useNavigate(); // Hook for navigation
  const [migrationData, setMigrationData] = useState(null);
  const [loadingMigration, setLoadingMigration] = useState(true);

  useEffect(() => {
    if (!showPasswordState) {
      const getMigration = async () => {
        const result = await fetchMigrationData();
        setMigrationData(result);
        setLoadingMigration(false);
      };
      getMigration();
    }
  }, [showPasswordState]);

  const stats = useMemo(() => {
    if (!data || !data.results) return null;
    const clientes = data.results;

    // Conteo por tipo de plan (Top 5)
    const planes = clientes.reduce((acc, curr) => {
      const planName = curr.plan?.name || "Sin Plan";
      acc[planName] = (acc[planName] || 0) + 1;
      return acc;
    }, {});

    const topPlanes = Object.entries(planes)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    // Nuevos ingresos (Simulado con status 'Activo' vs Total)
    const nuevos = clientes.filter(c => c.status_name === "Activo").length;
    const total = clientes.length;

    return { topPlanes, nuevos, total };
  }, [data]);

  const masterPlanData = useMemo(() => {
    if (!data || !data.results) return [];

    const TARGET_PLAN = "RECURRENTE RESIDENCIAL PLAN 200M";
    const TARGET_COST = "19.00";

    // 1. Filtrar clientes de la base general que tienen el plan
    const baseClients = data.results.filter(c =>
      c.plan?.name === TARGET_PLAN ||
      (c.plan?.cost && String(c.plan.cost) === TARGET_COST)
    );

    // 2. Mapear con la data de migración para obtener fechas exactas
    return baseClients.map(client => {
      const migrationRecord = migrationData?.dailyLog?.find(m => String(m.contractId) === String(client.id));

      return {
        id: client.id,
        name: client.client_name,
        identification: client.client_identification,
        mobile: client.client_mobile,
        address: client.address,
        status: client.status_name,
        integrationDate: migrationRecord ? migrationRecord.date : "Alta Inicial",
        isMigration: !!migrationRecord,
        previousPlanName: migrationRecord ? (PLAN_MAPPING[migrationRecord.previousPlanId] || "Plan Anterior") : null,
        newPlanName: migrationRecord ? (PLAN_MAPPING[migrationRecord.newPlanId] || "Plan 200M") : "Plan 200M",
        notes: migrationRecord ? migrationRecord.notes : ""
      };
    }).sort((a, b) => {
      if (a.integrationDate === "Alta Inicial") return 1;
      if (b.integrationDate === "Alta Inicial") return -1;
      return new Date(b.integrationDate) - new Date(a.integrationDate);
    });
  }, [data, migrationData]);

  const formatCurrency = (val) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD' }).format(val);

  return (
    <div>
      {showPasswordState ? (
        <>
          <h1>Inicia Sesión</h1>
          <LogingForm />
        </>
      ) : (
        <>
          <LogoTitulo />
          <DropdownMenu />
          <PageNav />

          <div className="ventas-dashboard animate-slide-up">
            <h2 className="dashboard-title">Monitor de Operaciones</h2>

            {stats ? (
              <div className="ventas-content-layout">
                {/* Contenedor para las tarjetas de KPI superiores para centrado exacto */}
                <div className="kpi-shared-row">
                  {/* Widget: Distribución de Planes */}
                  <div className="ventas-card glass kpi-card">
                    <h3>🏆 Planes Más Vendidos</h3>
                    <div className="plans-list">
                      {stats.topPlanes.map(([plan, count], index) => (
                        <div key={plan} className="plan-item">
                          <div className="plan-info">
                            <span className="plan-name">{index + 1}. {plan}</span>
                            <span className="plan-count">{count} clientes</span>
                          </div>
                          <div className="progress-bar-bg">
                            <div
                              className="progress-bar-fill"
                              style={{ width: `${(count / stats.total) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Widget: Resumen de Actividad */}
                  <div className="ventas-card glass kpi-card">
                    <h3>📊 Resumen de Actividad</h3>
                    <div className="activity-stat">
                      <span className="stat-label">Total Clientes</span>
                      <span className="stat-number">{stats.total}</span>
                    </div>
                    <div className="activity-stat">
                      <span className="stat-label">Nuevas Activaciones</span>
                      <span className="stat-number highlight">{stats.nuevos}</span>
                    </div>
                    <button
                      className="button full-width"
                      onClick={() => navigate('/topurbanismo')}
                    >
                      Ver Reporte Detallado
                    </button>
                  </div>
                </div>

                {/* Widget: Migraciones Plan 200M (ENRIQUECIDO) */}
                <div className="ventas-card glass master-directory-widget">
                  <div className="card-header-main">
                    <h3>🚀 Directorio Maestro: Plan 200M ($19.00)</h3>
                    <div className="header-badges">
                      <span className="badge-total">{masterPlanData.length} Clientes Totales</span>
                      <span className="badge-revenue">{formatCurrency(masterPlanData.length * 19)}/mes</span>
                    </div>
                  </div>

                  {loadingMigration ? (
                    <div className="loading-container">
                      <span className="spinner-icon">⏳</span>
                      <p className="loading-text">Sincronizando fuentes de datos...</p>
                    </div>
                  ) : (
                    <div className="master-directory-container">
                      <div className="directory-table-wrapper">
                        <table className="directory-table">
                          <thead>
                            <tr>
                              <th>Cliente</th>
                              <th>Cédula/RIF</th>
                              <th>ID Contrato</th>
                              <th>Estatus</th>
                              <th>Motivo</th>
                              <th>Integración</th>
                            </tr>
                          </thead>
                          <tbody>
                            {masterPlanData.length > 0 ? (
                              masterPlanData.map(client => (
                                <tr key={client.id} className="directory-row">
                                  <td data-label="Cliente">
                                    <div className="client-info-cell">
                                      <span className="client-name-cell">{client.name}</span>
                                      <span className="client-tel-cell">{client.mobile || "Sin Telf."}</span>
                                    </div>
                                  </td>
                                  <td data-label="Cédula/RIF">{client.identification}</td>
                                  <td data-label="ID Contrato">{client.id}</td>
                                  <td data-label="Estatus">
                                    <span className={`status-pill ${client.status?.toLowerCase()}`}>
                                      {STATUS_TRANSLATION[client.status] || client.status}
                                    </span>
                                  </td>
                                  <td data-label="Motivo" className="notes-cell">{client.notes || "-"}</td>
                                  <td data-label="Integración">
                                    {client.isMigration ? (
                                      <div className="integration-cell">
                                        <span className="transition-text">
                                          {client.previousPlanName} <span className="arrow">→</span> {client.newPlanName}
                                        </span>
                                        <span className="date-text">{client.integrationDate}</span>
                                      </div>
                                    ) : (
                                      <span className="date-cell initial">Contrato Original</span>
                                    )}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan="5" className="no-data">No se encontraron clientes para este plan.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p>Cargando datos...</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default Ventas;
