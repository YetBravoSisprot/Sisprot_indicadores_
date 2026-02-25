import React, { useState, useEffect, useContext } from "react";
import PageNav from "../../Componentes/PageNav";
import LogoTitulo from "../../Componentes/LogoTitulo";
import { PasswordContext } from "../../PasswordContext/PasswordContext";
import Loging from "../Loging/Loging";
import DropdownMenu from "../../Componentes/DropdownMenu";
import "./Indicadores.css";

function Indicadores() {
  const { showPasswordState, data } = useContext(PasswordContext);

  const [clientesFiltrados, setClientesFiltrados] = useState([]);
  const [tipoFiltro, setTipoFiltro] = useState("Todos");
  const [mostrarLista, setMostrarLista] = useState(true);

  // OPTIMIZACIÓN DE RENDERIZADO
  const [limiteVisible, setLimiteVisible] = useState(100);

  // Cargar todos los clientes al inicio
  useEffect(() => {
    if (data && data.results) {
      setClientesFiltrados(data.results);
      setLimiteVisible(100); // Resetear limite al cambiar la data base
    }
  }, [data]);

  const filtrarClientes = (tipo) => {
    if (tipo === "Todos") {
      setClientesFiltrados(data.results || []);
    } else {
      const filtrados = (data.results || []).filter(
        (cliente) => cliente.status_name === tipo
      );
      setClientesFiltrados(filtrados);
    }
    setTipoFiltro(tipo);
    setLimiteVisible(100); // Resetear límite al cambiar filtro
  };

  const cargarMas = () => {
    setLimiteVisible(prev => prev + 100); // Cargar de 100 en 100
  };

  const contarEstados = () => {
    const conteo = { Todos: data?.results?.length || 0 };
    if (data && data.results) {
      data.results.forEach((cliente) => {
        conteo[cliente.status_name] = (conteo[cliente.status_name] || 0) + 1;
      });
    }
    return conteo;
  };

  const conteos = contarEstados();

  return (
    <div>
      {showPasswordState ? (
        <>
          <h1>Inicia Sesión</h1>
          <Loging />
        </>
      ) : (
        <>
          <LogoTitulo />
          <DropdownMenu />
          <PageNav />

          <div className="indicadores-dashboard animate-slide-up">
            <h2 className="dashboard-title">Lista de Clientes</h2>

            {/* KPI Grid para los conteos */}
            <div className="kpi-grid">
              <div
                className={`kpi-card glass ${tipoFiltro === 'Todos' ? 'active-filter' : ''}`}
                onClick={() => filtrarClientes('Todos')}
                role="button"
              >
                <div className="kpi-icon">📋</div>
                <div className="kpi-info">
                  <h3>Total Registrados</h3>
                  <p className="kpi-value">{conteos.Todos}</p>
                </div>
              </div>

              {Object.keys(conteos).map((estado) => (
                estado !== "Todos" && (
                  <div
                    key={estado}
                    className={`kpi-card glass ${tipoFiltro === estado ? 'active-filter' : ''} ${estado === 'Suspendido' || estado === 'Cortado' ? 'warning' : ''}`}
                    onClick={() => filtrarClientes(estado)}
                    role="button"
                  >
                    <div className="kpi-icon">
                      {estado === 'Activo' ? '✅' : estado === 'Suspendido' ? '⚠️' : 'ℹ️'}
                    </div>
                    <div className="kpi-info">
                      <h3>{estado === 'Por instalar' ? estado : `${estado}s`}</h3>
                      <p className="kpi-value">{conteos[estado]}</p>
                    </div>
                  </div>
                )
              ))}
            </div>

            {/* Controles de Lista */}
            <div className="controls-bar glass">
              <span className="filter-status">
                Viendo: <strong>{tipoFiltro}</strong> ({clientesFiltrados.length})
              </span>
              <button
                onClick={() => setMostrarLista((prev) => !prev)}
                className="button"
              >
                {mostrarLista ? "Ocultar Lista" : "Mostrar Lista"}
              </button>
            </div>

            {/* Lista de Clientes OPTIMIZADA */}
            {mostrarLista && (
              <div className="lista-container">
                <ul className="lista-clientes">
                  {clientesFiltrados.slice(0, limiteVisible).map((cliente) => (
                    <li key={cliente.id} className="client-card glass">
                      <div className="client-header">
                        <strong>{cliente.client_name}</strong>
                        <span className={`status-badge ${cliente.status_name.toLowerCase()}`}>
                          {cliente.status_name}
                        </span>
                      </div>

                      <div className="client-details">
                        <p><span>Sector:</span> {cliente.sector_name}</p>
                        <p><span>Plan: </span>{cliente.plan.name}</p>
                        <p><span>Costo:</span> ${cliente.plan.cost}</p>
                        <p><span>Móvil:</span> {cliente.client_mobile}</p>
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Botón Cargar Más */}
                {clientesFiltrados.length > limiteVisible && (
                  <div style={{ textAlign: "center", marginTop: "20px", paddingBottom: "30px" }}>
                    <button className="button" onClick={cargarMas} style={{ width: "100%", maxWidth: "300px", background: "linear-gradient(135deg, #0052D4, #4364F7)", color: "white", padding: "12px", borderRadius: "8px", fontWeight: "bold", border: "none" }}>
                      Cargar Más ({clientesFiltrados.length - limiteVisible} restantes)
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default Indicadores;
