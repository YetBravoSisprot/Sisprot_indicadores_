import React, { useState, useEffect, useContext, useMemo } from "react";
import PageNav from "../../Componentes/PageNav";
import LogoTitulo from "../../Componentes/LogoTitulo";
import { PasswordContext } from "../../PasswordContext/PasswordContext";
import Loging from "../Loging/Loging";
import DropdownMenu from "../../Componentes/DropdownMenu";
import "./Indicadores.css";

// Mapeo oficial de sectores a agencias
const sectorAgenciaMap = {
  "Villas El Carmen": "MACARO",
  "El Macaro": "MACARO",
  "Saman de Guere": "MACARO",
  "Casco de Turmero": "TURMERO",
  "Villa Los Tamarindos": "MACARO",
  "Mata Caballo": "PAYA",
  "Pantin": "PAYA",
  "Saman Tarazonero II": "MACARO",
  "Rio Seco": "PAYA",
  "Ezequiel Zamora": "TURMERO",
  "La Casona II": "MACARO",
  "Durpa": "PAYA",
  "Paya Abajo": "PAYA",
  "Saman Tarazonero I": "MACARO",
  "Prados III": "PAYA",
  "Bicentenario": "PAYA",
  "Prados II": "PAYA",
  "La Casona I": "MACARO",
  "Palmeras II": "MACARO",
  "Guanarito": "TURMERO",
  "La Macarena": "MACARO",
  "Brisas de Paya": "PAYA",
  "Isaac Oliveira": "MACARO",
  "La Magdalena": "MACARO",
  "El Paraiso": "MACARO",
  "Antigua Hacienda De Paya": "PAYA",
  "San Sebastian": "MACARO",
  "Ppal Paya": "PAYA",
  "Lascenio Guerrero": "MACARO",
  "Los Hornos": "PAYA",
  "Callejon Lim": "PAYA",
  "Tibisay Guevara": "TURMERO",
  "Plaza Jardin": "MACARO",
  "Antigua Hacienda De Paya II": "PAYA",
  "Villas Del Sur": "TURMERO",
  "San Pablo": "TURMERO",
  "Vallecito": "PAYA",
  "Jabillar": "MACARO",
  "Prados I": "PAYA",
  "La Concepcion": "MACARO",
  "Las Rurales": "PAYA",
  "Valle Paraiso": "TURMERO",
  "Simon Bolivar": "MACARO",
  "Canaima": "PAYA",
  "Vista Hermosa": "PAYA",
  "Valle Verde": "PAYA",
  "Palma Real": "PAYA",
  "Palmeras I": "MACARO",
  "Prados de Cafetal": "TURMERO",
  "Santa Eduviges": "MACARO",
  "El Naranjal": "PAYA",
  "Villa De San Jose": "MACARO",
  "La Floresta": "TURMERO",
  "Terrazas de Paya": "PAYA",
  "Salto Angel": "MACARO",
  "Villeguita": "TURMERO",
  "La Esperanza": "MACARO",
  "La Arboleda": "PAYA",
  "La Concepcion III": "MACARO",
  "La Julia": "MACARO",
  "Terrazas de Turmero": "TURMERO",
  "Haras de San Pablo": "TURMERO",
  "Taguapire": "MACARO",
  "La Casona II Edificios": "MACARO",
  "Antonio Jose de Sucre": "MACARO",
  "Valle del Rosario": "MACARO",
  "Arturo Luis Berti": "MACARO",
  "Callejon Cañaveral": "PAYA",
  "Laguna Plaza": "TURMERO",
  "La Casona I Edificios": "MACARO",
  "Villa Caribe": "TURMERO",
  "Narayola II": "MACARO",
  "Luz y Vida": "PAYA",
  "Terrazas de Juan Pablo": "MACARO",
  "Residencias Candys": "TURMERO",
  "El Nispero": "TURMERO",
  "Ciudad Bendita": "TURMERO",
  "Residencias Mariño": "TURMERO",
  "San Carlos": "TURMERO",
  "Los Mangos": "PAYA",
  "Callejon Los Jabillos": "PAYA",
  "Guerito": "MACARO",
  "Laguna II": "TURMERO",
  "Marina Caribe": "TURMERO",
  "Dios Es Mi Refugio": "PAYA",
  "Huerta Los Pajaros": "PAYA",
  "La Montañita": "TURMERO",
  "Betania": "PAYA",
  "1ro de Mayo Norte": "PAYA",
  "Payita": "PAYA",
  "Las Palmas": "PAYA",
  "1ro de Mayo Sur": "PAYA",
  "El Cambur": "PAYA",
  "La Orquidea": "PAYA",
  "Sector los Mangos": "PAYA",
  "La Aduana": "TURMERO",
  "Valle Fresco": "TURMERO",
  "El Bosque": "PAYA",
  "Leocolbo": "MACARO",
  "Callejon Rosales": "PAYA",
  "Prados": "PAYA",
  "Calle Peñalver": "TURMERO",
  "Los Caobos": "MACARO",
  "Callejon 17": "PAYA",
  "Los Nisperos": "TURMERO",
  "La Montaña": "TURMERO",
  "Santa Barbara": "MACARO",
  "Valle lindo": "TURMERO",
  "Polvorin": "PAYA",
  "Guayabita": "PAYA",
  "La Marcelota": "PAYA",
  "Manirito": "PAYA",
  "Paraguatan": "PAYA",
  "La Guzman": "PAYA",
  "18 de Septiembre": "MACARO",
  "Edif. El Torreon": "TURMERO",
  "Edif. El Portal": "TURMERO",
  "Urb. Vista Hermosa La Julia": "MACARO",
  "Guerrero de Chavez": "PAYA",
  "19 de Abril": "MACARO",
  "Turmerito": "TURMERO",
};

const getClientType = (cliente) => {
  if (!cliente) return "";
  let tipo = "";
  if (cliente.client_subdivision && cliente.client_subdivision !== "") {
    const partes = String(cliente.client_subdivision).split("_");
    if (partes.length >= 2 && partes[1]) {
      tipo = partes[1].toUpperCase();
    }
  }
  if (!tipo && cliente.client_type_name) {
    tipo = String(cliente.client_type_name).trim().toUpperCase();
  }
  return tipo;
};

const matchesTipoCliente = (cliente, filterVal) => {
  if (filterVal === "Todos") return true;
  const clientType = getClientType(cliente);
  if (filterVal === "Residencial y PYME") {
    return clientType === "RESIDENCIAL" || clientType === "PYME";
  }
  return clientType === filterVal;
};

function Indicadores() {
  const { showPasswordState, data } = useContext(PasswordContext);

  const [tipoFiltro, setTipoFiltro] = useState("Todos");
  const [agenciaFiltro, setAgenciaFiltro] = useState("Todos");
  const [sectorFiltro, setSectorFiltro] = useState("Todos");
  const [tipoClienteFiltro, setTipoClienteFiltro] = useState("Todos");
  const [mostrarLista, setMostrarLista] = useState(true);

  // Al cambiar agencia, reseteamos sector
  useEffect(() => {
    setSectorFiltro("Todos");
  }, [agenciaFiltro]);

  // Cálculos de analytics por sector
  const analyticsSectores = useMemo(() => {
    const sectores = {};
    if (!data?.results) return [];

    // Filtramos solo clientes activos para el ranking de ingresos (igual que Top Urbanismo)
    const clientesBase = data.results.filter(c => c.status_name === "Activo");

    clientesBase.forEach(cliente => {
      const sector = cliente.sector_name;
      const costo = parseFloat(cliente.plan.cost) || 0;
      if (!sectores[sector]) {
        sectores[sector] = { total: 0, count: 0 };
      }
      sectores[sector].total += costo;
      sectores[sector].count += 1;
    });

    return Object.entries(sectores).map(([name, stats]) => ({
      name,
      average: stats.total / stats.count,
      total: stats.total,
      count: stats.count,
      agencia: sectorAgenciaMap[name] || "OTROS"
    })).sort((a, b) => b.total - a.total); // Ordenamos por Ingreso Total
  }, [data]);

  const topSector = analyticsSectores[0];
  const listaAgencias = ["Todos", "MACARO", "PAYA", "TURMERO"];
  const listaTiposCliente = ["Todos", "RESIDENCIAL", "PYME", "Residencial y PYME", "EMPLEADO", "GRATIS", "INTERCAMBIO"];

  const listaSectores = useMemo(() => {
    if (!data?.results) return ["Todos"];
    const base = agenciaFiltro === "Todos"
      ? data.results
      : data.results.filter(c => sectorAgenciaMap[c.sector_name] === agenciaFiltro);
    return ["Todos", ...new Set(base.map(c => c.sector_name))].sort();
  }, [data, agenciaFiltro]);

  const clientesFiltrados = useMemo(() => {
    if (!data?.results) return [];
    return data.results.filter(cliente => {
      const matchEstado = tipoFiltro === "Todos" || cliente.status_name === tipoFiltro;
      const matchAgencia = agenciaFiltro === "Todos" || sectorAgenciaMap[cliente.sector_name] === agenciaFiltro;
      const matchSector = sectorFiltro === "Todos" || cliente.sector_name === sectorFiltro;
      const matchTipoCliente = matchesTipoCliente(cliente, tipoClienteFiltro);
      return matchEstado && matchAgencia && matchSector && matchTipoCliente;
    });
  }, [data, tipoFiltro, agenciaFiltro, sectorFiltro, tipoClienteFiltro]);

  useEffect(() => {
    // Ya no usamos limiteVisible pero podrías resetear otros estados si fuera necesario
  }, [tipoFiltro, agenciaFiltro, sectorFiltro, tipoClienteFiltro]);

  const filtrarClientes = (tipo) => {
    setTipoFiltro(tipo);
  };

  const contarEstados = () => {
    let baseParaConteo = data?.results || [];

    if (agenciaFiltro !== "Todos") {
      baseParaConteo = baseParaConteo.filter(c => sectorAgenciaMap[c.sector_name] === agenciaFiltro);
    }
    if (sectorFiltro !== "Todos") {
      baseParaConteo = baseParaConteo.filter(c => c.sector_name === sectorFiltro);
    }
    baseParaConteo = baseParaConteo.filter(c => matchesTipoCliente(c, tipoClienteFiltro));

    const conteo = { Todos: baseParaConteo.length };
    const montos = { Todos: 0 };

    baseParaConteo.forEach((cliente) => {
      const est = cliente.status_name;
      const costo = parseFloat(cliente.plan?.cost || 0);
      conteo[est] = (conteo[est] || 0) + 1;
      montos[est] = (montos[est] || 0) + costo;
      montos.Todos += costo;
    });

    return { conteo, montos };
  };

  const { conteo: conteos, montos: montosPorEstado } = contarEstados();

  const fmtMonto = (val) =>
    `$${(val || 0).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const biMetrics = useMemo(() => {
    if (!clientesFiltrados.length) return { salud: 0, fuga: 0, recuperable: 0, totalActivos: 0 };

    const total = clientesFiltrados.length;
    const activos = clientesFiltrados.filter(c => c.status_name === "Activo").length;
    const salud = (activos / total) * 100;

    const fuga = clientesFiltrados
      .filter(c => c.status_name === "Cancelado")
      .reduce((acc, c) => acc + (parseFloat(c.plan?.cost) || 0), 0);

    const recuperable = clientesFiltrados
      .filter(c => c.status_name === "Suspendido")
      .reduce((acc, c) => acc + (parseFloat(c.plan?.cost) || 0), 0);

    return { salud, fuga, recuperable, totalActivos: activos };
  }, [clientesFiltrados]);



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
            <h2 className="dashboard-title">Resumen Estratégico</h2>

            {/* SECCIÓN 1: MÉTRICAS DE INTELIGENCIA (BI) */}
            <div className="kpi-grid section-intelligence">
              <div className="kpi-card card-salud">
                <div className="kpi-icon">📊</div>
                <div className="kpi-content">
                  <span className="kpi-label">¿Qué porcentaje de mis clientes totales están pagando y tienen el servicio activo?</span>
                  <p className="kpi-value">
                    {biMetrics.salud.toFixed(1)}%
                    <span className="kpi-count">({biMetrics.totalActivos.toLocaleString("es-ES")} Activos)</span>
                  </p>
                  <div className="health-meter" title="Barra de efectividad">
                    <div className="health-fill" style={{ width: `${biMetrics.salud}%` }}></div>
                  </div>
                </div>
              </div>

              <div className="kpi-card card-oportunidad">
                <div className="kpi-icon">📈</div>
                <div className="kpi-content">
                  <span className="kpi-label">Oportunidad (USD)</span>
                  <p className="kpi-value">${biMetrics.recuperable.toLocaleString("es-ES", { minimumFractionDigits: 2 })}</p>
                  <span className="bi-hint">Ingreso potencial mensual</span>
                  <span className="bi-explanation">
                    💡 Es la suma de los planes de todos los clientes <strong>Suspendidos</strong>.
                    Representa lo que la empresa podría recuperar mensualmente
                    si se reactivan esos servicios.
                  </span>
                </div>
              </div>

              {topSector && (
                <div className="kpi-card card-top">
                  <div className="kpi-icon">⭐️</div>
                  <div className="kpi-content">
                    <span className="kpi-label">Sector Líder</span>
                    <p className="kpi-value-small">{topSector.name}</p>
                    <div className="top-meta">
                      <span className="tag-agencia">{topSector.agencia}</span>
                      <span className="tag-ingreso">${topSector.total.toLocaleString("es-ES", { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <h3 className="section-divider-title">Resumen de Clientes</h3>

            {/* SECCIÓN 2: CONTEOS BÁSICOS */}
            <div className="kpi-grid section-counts">
              <div className="kpi-card card-total">
                <div className="kpi-icon">👥</div>
                <div className="kpi-content">
                  <span className="kpi-label">Total Clientes</span>
                  <p className="kpi-value">{conteos.Todos.toLocaleString("es-ES")}</p>
                  <span className="bi-hint">{fmtMonto(montosPorEstado.Todos)} facturación total</span>
                </div>
              </div>

              <div className="kpi-card card-activo">
                <div className="kpi-icon">✅</div>
                <div className="kpi-content">
                  <span className="kpi-label">Activos</span>
                  <p className="kpi-value">{(conteos.Activo || 0).toLocaleString("es-ES")}</p>
                  <span className="bi-hint">{fmtMonto(montosPorEstado.Activo)} ingreso mensual</span>
                </div>
              </div>

              <div className="kpi-card card-suspendido">
                <div className="kpi-icon">⚠️</div>
                <div className="kpi-content">
                  <span className="kpi-label">Suspendidos</span>
                  <p className="kpi-value">{(conteos.Suspendido || 0).toLocaleString("es-ES")}</p>
                  <span className="bi-hint">{fmtMonto(montosPorEstado.Suspendido)} recuperable</span>
                </div>
              </div>

              <div className="kpi-card card-cancelado">
                <div className="kpi-icon">🛑</div>
                <div className="kpi-content">
                  <span className="kpi-label">Cancelados Tasa General</span>
                  <p className="kpi-value">{(conteos.Cancelado || 0).toLocaleString("es-ES")}</p>
                  <span className="bi-hint">{fmtMonto(montosPorEstado.Cancelado)} pérdida mensual</span>
                </div>
              </div>
            </div>

            {/* FILTROS */}
            <div className="controls-bar">
              <div className="filter-group">
                <label>Seleccionar Agencia</label>
                <select
                  value={agenciaFiltro}
                  onChange={(e) => setAgenciaFiltro(e.target.value)}
                  className="select-premium"
                >
                  {listaAgencias.map(agencia => (
                    <option key={agencia} value={agencia}>{agencia}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Seleccionar Sector</label>
                <select
                  value={sectorFiltro}
                  onChange={(e) => setSectorFiltro(e.target.value)}
                  className="select-premium"
                >
                  {listaSectores.map(sector => (
                    <option key={sector} value={sector}>{sector}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Tipo de Cliente</label>
                <select
                  value={tipoClienteFiltro}
                  onChange={(e) => setTipoClienteFiltro(e.target.value)}
                  className="select-premium"
                >
                  {listaTiposCliente.map(tipo => (
                    <option key={tipo} value={tipo}>{tipo === "RESIDENCIAL" ? "RESIDENCIAL (Ciclo 1)" : tipo === "PYME" ? "PYME (Ciclo 15/30)" : tipo}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Indicadores;
