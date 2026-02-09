import React, { useContext, useMemo } from "react";
import { useNavigate } from "react-router-dom"; // Import useNavigate
import PageNav from "../../Componentes/PageNav";
import LogoTitulo from "../../Componentes/LogoTitulo";
import DropdownMenu from "../../Componentes/DropdownMenu";
import { PasswordContext } from "../../PasswordContext/PasswordContext";
import LogingForm from "../../Componentes/LogingForm";
import "./ventas.css";

function Ventas() {
  const { showPasswordState, data } = useContext(PasswordContext);
  const navigate = useNavigate(); // Hook for navigation

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
              <div className="ventas-grid">
                {/* Widget: Distribución de Planes */}
                <div className="ventas-card glass">
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
                <div className="ventas-card glass">
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
