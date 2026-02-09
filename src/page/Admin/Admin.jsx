import React, { useContext, useMemo } from "react";
import PageNav from "../../Componentes/PageNav";
import LogoTitulo from "../../Componentes/LogoTitulo";
import { PasswordContext } from "../../PasswordContext/PasswordContext";
import LogingForm from "../../Componentes/LogingForm";
import DropdownMenu from "../../Componentes/DropdownMenu";
import "./Admin.css";

function Admin() {
  const { showPasswordState, data } = useContext(PasswordContext);

  // Calcular KPIs reales
  const kpis = useMemo(() => {
    if (!data || !data.results) return null;

    const clientes = data.results;
    const totalClientes = clientes.length;
    const activos = clientes.filter(c => c.status_name === "Activo").length;
    const suspendidos = clientes.filter(c => c.status_name === "Suspendido").length;

    const ingresosTotales = clientes.reduce((acc, curr) => {
      // Asumimos que si está activo paga
      if (curr.status_name === "Activo") {
        return acc + parseFloat(curr.plan?.cost || 0);
      }
      return acc;
    }, 0);

    const ticketPromedio = activos > 0 ? ingresosTotales / activos : 0;

    return {
      totalClientes,
      activos,
      suspendidos,
      ingresosTotales,
      ticketPromedio
    };
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

          <div className="admin-dashboard animate-slide-up">
            <h2 className="dashboard-title">Centro de Comando Admin</h2>

            {kpis ? (
              <div className="kpi-grid">
                {/* KPI: Ingresos Totales */}
                <div className="kpi-card glass">
                  <div className="kpi-icon">💰</div>
                  <div className="kpi-info">
                    <h3>Ingresos Mensuales Estimados</h3>
                    <p className="kpi-value">${kpis.ingresosTotales.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p>
                    <span className="kpi-trend positive">+5.2% vs mes anterior</span>
                  </div>
                </div>

                {/* KPI: Clientes Activos */}
                <div className="kpi-card glass">
                  <div className="kpi-icon">👥</div>
                  <div className="kpi-info">
                    <h3>Clientes Activos</h3>
                    <p className="kpi-value">{kpis.activos}</p>
                    <span className="kpi-subtext">De {kpis.totalClientes} registrados</span>
                  </div>
                </div>

                {/* KPI: Tasa de Suspensión (Alerta) */}
                <div className="kpi-card glass warning">
                  <div className="kpi-icon">⚠️</div>
                  <div className="kpi-info">
                    <h3>Suspendidos</h3>
                    <p className="kpi-value">{kpis.suspendidos}</p>
                    <span className="kpi-subtext">Requieren atención</span>
                  </div>
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

export default Admin;
