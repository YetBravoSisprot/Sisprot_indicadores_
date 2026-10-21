// TopUrbanismo.jsx
import React, { useState, useEffect, useContext, useCallback, useMemo } from "react";
import { useLocation } from "react-router-dom";
import PageNav from "../../Componentes/PageNav";
import LogoTitulo from "../../Componentes/LogoTitulo";
import { PasswordContext } from "../../PasswordContext/PasswordContext";
import LogingForm from "../../Componentes/LogingForm";
import "./TopUrbanismo.css";
import ChartComponent from "../../Componentes/ChartComponent";
import DropdownMenu from "./../../Componentes/DropdownMenu";
import { exportToExcel } from "../../utils/ExcelExport";
import { exportExecutiveReport } from "../../utils/ExecutiveReport";
import { mapCycleValue, getCycleLabel } from "../../utils/cycleHelper";
import { fetchContractsByStatus } from "../../services/contractService";

// ===================== HELPERS =====================
const norm = (v) => (v == null ? "" : String(v).replace(/\u00a0/g, " ").trim());

const tiposClienteValidos = ["PYME", "RESIDENCIAL", "INTERCAMBIO", "EMPLEADO", "GRATIS"];

// Componente de Dropdown Personalizado para Filtros Multi-selección
function DropdownFilter({ label, placeholder, children }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = React.useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="custom-filter-dropdown" ref={containerRef}>
      <label className="filter-header">{label}</label>
      <div className={`dropdown-trigger-btn ${isOpen ? "active" : ""}`} onClick={() => setIsOpen(!isOpen)}>
        <span className="dropdown-trigger-text">{placeholder}</span>
        <span className={`dropdown-chevron-arrow ${isOpen ? "open" : ""}`}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </div>
      {isOpen && (
        <div className="dropdown-options-popover animate-fade-in">
          <div className="dropdown-options-content">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

// Banner de estado del sistema (Loading / Success / Error)
function SisprotStatusBanner({ status, lastUpdatedTime, onRetry, onRefresh, errorMessage }) {
  if (status === "loading") {
    return (
      <div className="sisprot-status-banner status-banner-loading animate-fade-in">
        <div className="status-banner-left">
          <div className="status-spinner-circle" />
          <div className="status-banner-texts">
            <h4 className="status-banner-title">Actualizando información de Sisprot BI</h4>
            <p className="status-banner-subtitle">
              Conectando con el sistema y consultando los datos de clientes e ingresos…
            </p>
          </div>
        </div>
        <div className="status-banner-right">
          <span className="status-banner-time-hint">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Este proceso puede tardar unos segundos…
          </span>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="sisprot-status-banner status-banner-success animate-fade-in">
        <div className="status-banner-left">
          <div className="status-badge-icon icon-success">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div className="status-banner-texts">
            <h4 className="status-banner-title text-success">Datos actualizados correctamente</h4>
            <p className="status-banner-subtitle text-success-sub">
              Información disponible · Sisprot BI sincronizado
            </p>
          </div>
        </div>
        <div className="status-banner-right">
          {lastUpdatedTime && (
            <span className="status-banner-timestamp">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              Última actualización: {lastUpdatedTime}
            </span>
          )}
          <button className="status-banner-action-btn btn-refresh" onClick={onRefresh} title="Actualizar datos nuevamente">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
            </svg>
            Actualizar
          </button>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="sisprot-status-banner status-banner-error animate-fade-in">
        <div className="status-banner-left">
          <div className="status-badge-icon icon-error">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div className="status-banner-texts">
            <h4 className="status-banner-title text-error">No fue posible actualizar los datos</h4>
            <p className="status-banner-subtitle text-error-sub">
              {errorMessage ? `Error: ${errorMessage}. ` : "Ocurrió un error al consultar la API. "}
              Puedes reintentar nuevamente.
            </p>
          </div>
        </div>
        <div className="status-banner-right">
          <button className="status-banner-action-btn btn-retry" onClick={onRetry}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
            </svg>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// Esqueletos animados para gráficos y datos mientras carga
function SkeletonDashboard() {
  return (
    <div className="skeleton-dashboard-grid animate-fade-in">
      {/* Tarjeta 1: Gráfico de Barras */}
      <div className="skeleton-card skeleton-card-bar">
        <div className="skeleton-card-header">
          <div className="skeleton-shimmer skeleton-title-bar" />
          <div className="skeleton-shimmer skeleton-badge-pill" />
        </div>
        <div className="skeleton-bars-container">
          <div className="skeleton-bar-wrapper"><div className="skeleton-shimmer skeleton-bar" style={{ height: "42%" }} /></div>
          <div className="skeleton-bar-wrapper"><div className="skeleton-shimmer skeleton-bar" style={{ height: "76%" }} /></div>
          <div className="skeleton-bar-wrapper"><div className="skeleton-shimmer skeleton-bar" style={{ height: "54%" }} /></div>
          <div className="skeleton-bar-wrapper"><div className="skeleton-shimmer skeleton-bar" style={{ height: "92%" }} /></div>
          <div className="skeleton-bar-wrapper"><div className="skeleton-shimmer skeleton-bar" style={{ height: "68%" }} /></div>
          <div className="skeleton-bar-wrapper"><div className="skeleton-shimmer skeleton-bar" style={{ height: "84%" }} /></div>
          <div className="skeleton-bar-wrapper"><div className="skeleton-shimmer skeleton-bar" style={{ height: "48%" }} /></div>
        </div>
        <div className="skeleton-axis-line" />
      </div>

      {/* Tarjeta 2: Gráfico Circular / Donut */}
      <div className="skeleton-card skeleton-card-donut">
        <div className="skeleton-card-header">
          <div className="skeleton-shimmer skeleton-title-bar" style={{ width: "50%" }} />
        </div>
        <div className="skeleton-donut-layout">
          <div className="skeleton-donut-circle-wrap">
            <div className="skeleton-shimmer skeleton-donut-ring" />
          </div>
          <div className="skeleton-donut-legend">
            <div className="skeleton-legend-item">
              <span className="skeleton-shimmer skeleton-dot" />
              <span className="skeleton-shimmer skeleton-line" style={{ width: "80px" }} />
            </div>
            <div className="skeleton-legend-item">
              <span className="skeleton-shimmer skeleton-dot" />
              <span className="skeleton-shimmer skeleton-line" style={{ width: "100px" }} />
            </div>
            <div className="skeleton-legend-item">
              <span className="skeleton-shimmer skeleton-dot" />
              <span className="skeleton-shimmer skeleton-line" style={{ width: "65px" }} />
            </div>
            <div className="skeleton-legend-item">
              <span className="skeleton-shimmer skeleton-dot" />
              <span className="skeleton-shimmer skeleton-line" style={{ width: "90px" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Tarjeta 3: Métricas y Filas de Sectores */}
      <div className="skeleton-card skeleton-card-rows">
        <div className="skeleton-card-header">
          <div className="skeleton-shimmer skeleton-title-bar" style={{ width: "60%" }} />
        </div>
        <div className="skeleton-rows-container">
          <div className="skeleton-shimmer skeleton-row-line" style={{ width: "100%" }} />
          <div className="skeleton-shimmer skeleton-row-line" style={{ width: "90%" }} />
          <div className="skeleton-shimmer skeleton-row-line" style={{ width: "95%" }} />
          <div className="skeleton-shimmer skeleton-row-line" style={{ width: "80%" }} />
          <div className="skeleton-shimmer skeleton-row-line" style={{ width: "88%" }} />
          <div className="skeleton-shimmer skeleton-row-line" style={{ width: "70%" }} />
        </div>
      </div>
    </div>
  );
}

function TopUrbanismo() {
  const location = useLocation();
  const { showPasswordState, data, isLoading, error, email, fetchData, isUpdating, connectionStatus } = useContext(PasswordContext);

  const [sectorAgenciaMap, setSectorAgenciaMap] = useState({});
  const [urbanismosAprobados, setUrbanismosAprobados] = useState({});

  // Estado para contratos obtenidos en tiempo real
  const [realtimeContracts, setRealtimeContracts] = useState(() => (data?.results && data.results.length > 0 ? data.results : []));
  const [isLoadingContracts, setIsLoadingContracts] = useState(false);
  const [systemStatus, setSystemStatus] = useState("loading"); // "loading" | "success" | "error"
  const [lastUpdatedTime, setLastUpdatedTime] = useState("");
  const [errorContratos, setErrorContratos] = useState(null);

  const getFormattedTime = () => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const d = pad(now.getDate());
    const m = pad(now.getMonth() + 1);
    const y = now.getFullYear();
    const h = pad(now.getHours());
    const min = pad(now.getMinutes());
    return `${d}/${m}/${y} ${h}:${min}`;
  };

  // Asegurar que si data inicial llega del contexto, se cargue de inmediato en automático
  useEffect(() => {
    if (data?.results && data.results.length > 0 && realtimeContracts.length === 0) {
      setRealtimeContracts(data.results);
    }
  }, [data, realtimeContracts.length]);

  useEffect(() => {
    const cargarSectores = async () => {
      try {
        const url = process.env.REACT_APP_SECTORS_API_URL || "https://api.sisprotgf.com/api/public/zones/sectors/?remove_pagination=true";
        const apiKey = process.env.REACT_APP_SECTORS_API_KEY || "v7R2mK9pXqWjL5bZ1nT8sH4dC6fV3gY0xM9aB2iE7uN1oP4rS5";
        
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "X-API-KEY": apiKey.trim(),
            "Accept": "application/json"
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const sectors = await response.json();
        
        // Mapeo de parroquias a agencias/nodos
        const mapParishToAgency = (parishName) => {
          const normParish = String(parishName || "").toUpperCase().trim();
          if (normParish === "SAMAN DE GUERE") return "PARROQUIA SAMAN DE GUERE";
          if (normParish === "PEDRO AREVALO APONTE") return "PARROQUIA PEDRO AREVALO APONTE";
          if (normParish === "TURMERO") return "PARROQUIA TURMERO";
          return `PARROQUIA ${normParish}`;
        };
        
        const newSectorAgenciaMap = {};
        const newUrbanismosAprobados = {
          "PARROQUIA SAMAN DE GUERE": [],
          "PARROQUIA PEDRO AREVALO APONTE": [],
          "PARROQUIA TURMERO": [],
        };
        
        sectors.forEach(sector => {
          if (!sector.name) return;
          const sectorName = norm(sector.name);
          const agency = mapParishToAgency(sector.parish_name);
          
          newSectorAgenciaMap[sectorName] = agency;
          
          if (!newUrbanismosAprobados[agency]) {
            newUrbanismosAprobados[agency] = [];
          }
          if (!newUrbanismosAprobados[agency].includes(sectorName)) {
            newUrbanismosAprobados[agency].push(sectorName);
          }
        });
        
        // Ordenar alfabéticamente
        Object.keys(newUrbanismosAprobados).forEach(agency => {
          newUrbanismosAprobados[agency].sort((a, b) => a.localeCompare(b, "es"));
        });
        
        setSectorAgenciaMap(newSectorAgenciaMap);
        setUrbanismosAprobados(newUrbanismosAprobados);
      } catch (err) {
        console.error("Error al cargar sectores dinámicamente:", err);
      }
    };
    
    cargarSectores();
  }, []);

  const [TopUrb, setTopUrb] = useState([0, 3500]);
  const [estadosSeleccionados, setEstadosSeleccionados] = useState(["Activo"]);
  const [estadosSeleccionadosType, setEstadosSeleccionadosType] = useState(["Todos"]);
  const [totalIngresos, setTotalIngresos] = useState(0);
  const [topUrbanismos, setTopUrbanismos] = useState([]);
  const [totalClientesGlobal, setTotalClientesGlobal] = useState(0);
  const [migradosSeleccionados, setMigradosSeleccionados] = useState(["Todos"]);
  const [ciclosSeleccionados, setCiclosSeleccionados] = useState(["Todos"]);
  const [sectoresSeleccionados, setSectoresSeleccionados] = useState([]);
  const [urbanismosSeleccionados, setUrbanismosSeleccionados] = useState([]);
  const [columnasSeleccionadas, setColumnasSeleccionadas] = useState(["Todas"]);
  const [busquedaSector, setBusquedaSector] = useState("");

  const listaAgenciasDinamica = useMemo(() => {
    const keys = Object.keys(urbanismosAprobados).filter(Boolean);
    keys.sort((a, b) => a.localeCompare(b, "es"));
    return ["Todos", ...keys];
  }, [urbanismosAprobados]);

  const [contratoBuscado, setContratoBuscado] = useState("");
  const [clientesPorContrato, setClientesPorContrato] = useState([]);
  const [modoBusquedaContrato, setModoBusquedaContrato] = useState(false);
  const [serviciosParaExportar, setServiciosParaExportar] = useState([]);

  const handleTop10Urb = () => setTopUrb([0, 10]);
  const handleTopUrb = () => setTopUrb([0, 3500]);

  const handleToggleGeneric = (setter, value, allLabel = "Todos") => {
    setter((prev) => {
      if (value === allLabel) return [allLabel];
      let newList = prev.filter((v) => v !== allLabel);
      if (newList.includes(value)) {
        newList = newList.filter((v) => v !== value);
      } else {
        newList = [...newList, value];
      }
      return newList.length === 0 ? [allLabel] : newList;
    });
  };

  const handleSectoresChange = (sector) => {
    handleToggleGeneric(setSectoresSeleccionados, sector, "Todos");
    setUrbanismosSeleccionados([]);
  };

  const handleMigradosChange = (val) => handleToggleGeneric(setMigradosSeleccionados, val, "Todos");
  const handleEstadoChange = (val) => handleToggleGeneric(setEstadosSeleccionados, val, "Todos");
  const handleEstadoChange2 = (val) => handleToggleGeneric(setEstadosSeleccionadosType, val, "Todos");

  const handleCiclosChange = (val) => handleToggleGeneric(setCiclosSeleccionados, val, "Todos");

  const handleColumnasChange = (colValue) => {
    setColumnasSeleccionadas((prev) => {
      if (colValue === "Todas") {
        return ["Todas"];
      }

      // Si estaba en "Todas", al marcar otra cosa, quitamos "Todas"
      let newList = prev.filter((c) => c !== "Todas");

      if (newList.includes(colValue)) {
        // Desmarcar
        newList = newList.filter((c) => c !== colValue);
      } else {
        // Marcar
        newList = [...newList, colValue];
      }

      // Si no queda nada, volvemos a "Todas"
      return newList.length === 0 ? ["Todas"] : newList;
    });
  };

  // Función para consultar contratos en tiempo real según el estatus seleccionado (en segundo plano)
  const cargarContratosEnTiempoReal = useCallback(async (forceRefresh = false) => {
    setIsLoadingContracts(true);
    setSystemStatus("loading");
    setErrorContratos(null);

    const statusNombres = estadosSeleccionados.includes("Todos") ? ["Todos"] : estadosSeleccionados;

    try {
      const res = await fetchContractsByStatus(statusNombres, forceRefresh);
      if (res && res.results && res.results.length > 0) {
        setRealtimeContracts(res.results);
      }
      setSystemStatus("success");
      setLastUpdatedTime(getFormattedTime());
    } catch (err) {
      console.warn("No se pudo actualizar en tiempo real desde la API:", err);
      setErrorContratos(err);
      setSystemStatus("error");
    } finally {
      setIsLoadingContracts(false);
    }
  }, [estadosSeleccionados]);

  // Cargar contratos cada vez que cambien los estados seleccionados
  useEffect(() => {
    cargarContratosEnTiempoReal(false);
  }, [cargarContratosEnTiempoReal]);

  const buscarPorContrato = () => {
    if (!contratoBuscado || !realtimeContracts || realtimeContracts.length === 0) return;

    const searchStr = String(contratoBuscado).toLowerCase().trim();

    const resultado = realtimeContracts.filter((cliente) => {
      const matchId = String(cliente.id) === searchStr;
      const matchName = cliente.client_name && cliente.client_name.toLowerCase().includes(searchStr);
      const matchIden = cliente.client_identification && String(cliente.client_identification).toLowerCase().includes(searchStr);
      return matchId || matchName || matchIden;
    });

    setClientesPorContrato(resultado);
    setModoBusquedaContrato(true);
  };


  // ✅ NUEVO: Aplicar filtro inicial si viene de navegacion (ej. desde Admin)
  useEffect(() => {
    if (location.state?.initialFilter) {
      setEstadosSeleccionados(location.state.initialFilter);
    }
  }, [location.state]);

  // ✅ NUEVO: Urbanismos a mostrar (si "Todos" o sin agencia, mostrar todos)
  const urbanismosParaMostrar = useMemo(() => {
    const tieneTodos = sectoresSeleccionados.includes("Todos");
    const sinAgencia = sectoresSeleccionados.length === 0;

    if (tieneTodos || sinAgencia) {
      const todos = Object.values(urbanismosAprobados).flat();
      return Array.from(new Set(todos))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, "es"));
    }

    const lista = sectoresSeleccionados.flatMap((s) => urbanismosAprobados[s] || []);
    return Array.from(new Set(lista))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "es"));
  }, [sectoresSeleccionados, urbanismosAprobados]);

  const handleDownloadExcelOperaciones = () => {
    const filtroTextos = [...estadosSeleccionados];
    const urbanismosEspecificos = urbanismosSeleccionados.filter(u => u !== "Todos" && u !== "");
    if (urbanismosEspecificos.length > 0) {
      filtroTextos.push(`Sectores: ${urbanismosEspecificos.join(", ")}`);
    }

    // Lógica para nombre personalizado solicitado: "reporte de suspendidos ciclo X y la fecha [fecha]"
    let statusParaNombre = estadosSeleccionados.includes("Todos") ? "todos" : estadosSeleccionados.join(" y ").toLowerCase();
    
    let cicloParaNombre = "";
    if (!ciclosSeleccionados.includes("Todos") && ciclosSeleccionados.length > 0) {
        const numbers = ciclosSeleccionados.map(c => String(c).replace(/\D/g, ""));
        cicloParaNombre = ` ciclo ${numbers.join(" y ")}`;
    }

    const hoy = new Date();
    const dia = hoy.getDate();
    const mes = hoy.toLocaleString('es-ES', { month: 'long' });
    const anio = hoy.getFullYear();    
    const customFileName = `Reporte de ${statusParaNombre}${cicloParaNombre} y la fecha ${dia} de ${mes} del ${anio}.xlsx`;

    exportToExcel(serviciosParaExportar, filtroTextos, columnasSeleccionadas, "operations", customFileName);
  };

  const handleDownloadExcelSimple = () => {
    const filtroTextos = [...estadosSeleccionados];
    const urbanismosEspecificos = urbanismosSeleccionados.filter(u => u !== "Todos" && u !== "");
    if (urbanismosEspecificos.length > 0) {
      filtroTextos.push(`Sectores: ${urbanismosEspecificos.join(", ")}`);
    }

    let statusParaNombre = estadosSeleccionados.includes("Todos") ? "todos" : estadosSeleccionados.join(" y ").toLowerCase();
    
    let cicloParaNombre = "";
    if (!ciclosSeleccionados.includes("Todos") && ciclosSeleccionados.length > 0) {
        const numbers = ciclosSeleccionados.map(c => String(c).replace(/\D/g, ""));
        cicloParaNombre = ` ciclo ${numbers.join(" y ")}`;
    }

    const hoy = new Date();
    const dia = hoy.getDate();
    const mes = hoy.toLocaleString('es-ES', { month: 'long' });
    const anio = hoy.getFullYear();    
    const customFileName = `Lista Personalizada de ${statusParaNombre}${cicloParaNombre} y la fecha ${dia} de ${mes} del ${anio}.xlsx`;

    exportToExcel(serviciosParaExportar, filtroTextos, columnasSeleccionadas, "simple", customFileName);
  };

  const handleDownloadExcelExecutive = async () => {
    try {
      const filtroTextos = [...estadosSeleccionados];
      const urbanismosEspecificos = urbanismosSeleccionados.filter(u => u !== "Todos" && u !== "");
      if (urbanismosEspecificos.length > 0) {
        filtroTextos.push(`Sectores: ${urbanismosEspecificos.join(", ")}`);
      }
      const baseName = email ? email.split('@')[0] : 'Usuario';
      const cleanName = baseName.replace(/[\._0-9]/g, ' ').trim().split(' ')[0];
      const formattedName = cleanName ? cleanName.charAt(0).toUpperCase() + cleanName.slice(1).toLowerCase() : 'Analista';

      await exportExecutiveReport(serviciosParaExportar, filtroTextos, formattedName, columnasSeleccionadas, realtimeContracts);
    } catch (err) {
      console.error("Error al generar Reporte Ejecutivo:", err);
      alert("No se pudo generar el Reporte Ejecutivo por un error. Por favor intenta de nuevo.");
    }
  };



  const extraerTipoDeSubdivision = useCallback((subdivision) => {
    if (!subdivision) return null;
    const partes = String(subdivision).split("_");
    if (partes.length >= 2 && partes[1]) return partes[1].toUpperCase();
    return "DESCONOCIDO";
  }, []);

  const pasaFiltros = useCallback(
    (servicio) => {
      if (!servicio) return false;

      // Exclusión de nombres específicos solicitados
      const nombreUpper = String(servicio.client_name || "").toUpperCase().replace(/\s+/g, " ");
      if (
        nombreUpper.includes("FREDDY CARRILLO") ||
        nombreUpper.includes("BRYANT REYES") ||
        nombreUpper.includes("ELISAUL REYES")
      ) {
        return false;
      }

      // Exclusión: En contratos cancelados, no mostrar empleados
      const esCancelado =
        servicio.status === 34 ||
        String(servicio.status_name).toUpperCase() === "CANCELADO" ||
        (servicio.client_subdivision && String(servicio.client_subdivision).toUpperCase().includes("CANCELADO"));

      const esEmpleado =
        servicio.client_type_name === "EMPLEADO" ||
        (servicio.client_subdivision && String(servicio.client_subdivision).toUpperCase().includes("EMPLEADO")) ||
        (servicio.plan?.name && String(servicio.plan.name).toUpperCase().includes("EMPLEADO"));

      if (esCancelado && esEmpleado) {
        return false;
      }

      let tipoFiltrado = false;

      if (estadosSeleccionadosType.includes("Todos")) {
        tipoFiltrado = true;
      } else {
        tipoFiltrado = estadosSeleccionadosType.some((tipoSeleccionado) => {
          let tipoServicio = null;

          if (servicio.client_subdivision && servicio.client_subdivision !== "") {
            tipoServicio = extraerTipoDeSubdivision(servicio.client_subdivision);
          }
          if (!tipoServicio && servicio.client_type_name) {
            tipoServicio = String(servicio.client_type_name).trim().toUpperCase();
          }
          if (!tipoServicio) return false;

          return tipoServicio === String(tipoSeleccionado).trim().toUpperCase();
        });
      }

      if (!tipoFiltrado) return false;

      let estadoFiltrado = false;

      if (estadosSeleccionados.includes("Todos")) {
        estadoFiltrado = true;
      } else {
        estadoFiltrado = estadosSeleccionados.some((estadoSeleccionado) => {
          if (estadoSeleccionado === "Todos") return false;
          const estadoBuscado = String(estadoSeleccionado).toUpperCase();

          if (servicio.client_subdivision && servicio.client_subdivision !== "") {
            return String(servicio.client_subdivision).includes(estadoBuscado);
          } else if (servicio.status_name) {
            return (
              String(servicio.status_name).toLowerCase() ===
              String(estadoSeleccionado).toLowerCase()
            );
          }
          return false;
        });
      }

      if (!estadoFiltrado) return false;

      const migradoFiltrado =
        migradosSeleccionados.includes("Todos") ||
        migradosSeleccionados.includes(servicio.migrate ? "Migrado" : "No migrado");
      if (!migradoFiltrado) return false;

      const cicloFiltrado =
        ciclosSeleccionados.includes("Todos") ||
        servicio.cycle == null ||
        ciclosSeleccionados.includes(mapCycleValue(servicio.cycle, servicio));
      if (!cicloFiltrado) return false;

      const sectorName = norm(servicio.sector_name);

      const sectorFiltrado =
        sectoresSeleccionados.length === 0 ||
        sectoresSeleccionados.includes("Todos") ||
        (sectorName &&
          sectorAgenciaMap[sectorName] &&
          sectoresSeleccionados.includes(sectorAgenciaMap[sectorName]));
      if (!sectorFiltrado) return false;

      const urbanismoFiltrado =
        urbanismosSeleccionados.length === 0 ||
        urbanismosSeleccionados.includes("Todos") ||
        (sectorName && urbanismosSeleccionados.includes(sectorName));

      return urbanismoFiltrado;
    },
    [
      estadosSeleccionados,
      estadosSeleccionadosType,
      migradosSeleccionados,
      ciclosSeleccionados,
      sectoresSeleccionados,
      urbanismosSeleccionados,
      extraerTipoDeSubdivision,
      sectorAgenciaMap,
    ]
  );

  const pasaFiltroTotales = useCallback(
    (servicio) => {
      if (!servicio) return false;

      // Exclusión de nombres específicos solicitados
      const nombreUpper = String(servicio.client_name || "").toUpperCase().replace(/\s+/g, " ");
      if (
        nombreUpper.includes("FREDDY CARRILLO") ||
        nombreUpper.includes("BRYANT REYES") ||
        nombreUpper.includes("ELISAUL REYES")
      ) {
        return false;
      }

      // Exclusión: En contratos cancelados, no mostrar empleados
      const esCancelado =
        servicio.status === 34 ||
        String(servicio.status_name).toUpperCase() === "CANCELADO" ||
        (servicio.client_subdivision && String(servicio.client_subdivision).toUpperCase().includes("CANCELADO"));

      const esEmpleado =
        servicio.client_type_name === "EMPLEADO" ||
        (servicio.client_subdivision && String(servicio.client_subdivision).toUpperCase().includes("EMPLEADO")) ||
        (servicio.plan?.name && String(servicio.plan.name).toUpperCase().includes("EMPLEADO"));

      if (esCancelado && esEmpleado) {
        return false;
      }

      let estadoFiltrado = false;

      if (estadosSeleccionados.includes("Todos")) {
        estadoFiltrado = true;
      } else {
        estadoFiltrado = estadosSeleccionados.some((estadoSeleccionado) => {
          if (estadoSeleccionado === "Todos") return false;
          const estadoBuscado = String(estadoSeleccionado).toUpperCase();

          if (servicio.client_subdivision && servicio.client_subdivision !== "") {
            const contieneEstado = String(servicio.client_subdivision).includes(estadoBuscado);

            if (contieneEstado) {
              const tipoServicio = extraerTipoDeSubdivision(servicio.client_subdivision);
              const tipoEsValido = tipoServicio && tiposClienteValidos.includes(tipoServicio);

              if (!tipoEsValido && estadoSeleccionado === "Activo") {
                console.log("DEBUG - Cliente con tipo no valido:", {
                  nombre: servicio.client_name,
                  subdivision: servicio.client_subdivision,
                  tipoExtraido: tipoServicio,
                  tipoEsValido: tipoEsValido,
                });
              }
            }

            return contieneEstado;
          } else if (servicio.status_name) {
            return (
              String(servicio.status_name).toLowerCase() ===
              String(estadoSeleccionado).toLowerCase()
            );
          }

          return false;
        });
      }

      if (!estadoFiltrado) return false;

      const migradoFiltrado =
        migradosSeleccionados.includes("Todos") ||
        migradosSeleccionados.includes(servicio.migrate ? "Migrado" : "No migrado");
      if (!migradoFiltrado) return false;

      const cicloFiltrado =
        ciclosSeleccionados.includes("Todos") ||
        ciclosSeleccionados.includes(mapCycleValue(servicio.cycle, servicio));
      if (!cicloFiltrado) return false;

      const sectorName = norm(servicio.sector_name);

      const sectorFiltrado =
        sectoresSeleccionados.length === 0 ||
        sectoresSeleccionados.includes("Todos") ||
        (sectorName && sectoresSeleccionados.includes(sectorAgenciaMap[sectorName]));
      if (!sectorFiltrado) return false;

      const urbanismoFiltrado =
        urbanismosSeleccionados.length === 0 ||
        urbanismosSeleccionados.includes("Todos") ||
        (sectorName && urbanismosSeleccionados.includes(sectorName));

      return urbanismoFiltrado;
    },
    [
      estadosSeleccionados,
      migradosSeleccionados,
      ciclosSeleccionados,
      sectoresSeleccionados,
      urbanismosSeleccionados,
      extraerTipoDeSubdivision,
      sectorAgenciaMap,
    ]
  );

  useEffect(() => {
    if (!realtimeContracts) return;

    const usarPasaFiltros = estadosSeleccionadosType.includes("Todos") ? pasaFiltroTotales : pasaFiltros;

    const serviciosFiltrados = realtimeContracts.filter((servicio) => usarPasaFiltros(servicio));
    setServiciosParaExportar(serviciosFiltrados);

    const totalClientes = serviciosFiltrados.filter((s) => s.client_subdivision || s.status_name).length;

    const ingresosTotales = serviciosFiltrados.reduce((acc, curr) => {
      const costoPlan = parseFloat(curr.plan?.cost || 0);
      return acc + costoPlan;
    }, 0);

    setTotalClientesGlobal(totalClientes);
    setTotalIngresos(ingresosTotales);

    const urbanismosTotales = serviciosFiltrados.reduce((acc, curr) => {
      const sectorName = norm(curr.sector_name);
      if (!sectorName) return acc;

      if (!acc[sectorName]) {
        acc[sectorName] = {
          cantidadClientes: 1,
          ingresosTotales: parseFloat(curr.plan?.cost || 0),
          estado: curr.status_name,
          tipo: curr.client_type_name,
          clientes: [curr],
        };
      } else {
        acc[sectorName].cantidadClientes++;
        acc[sectorName].ingresosTotales += parseFloat(curr.plan?.cost || 0);
        acc[sectorName].clientes.push(curr);
      }
      return acc;
    }, {});

    const urbanismosTotalesArray = Object.keys(urbanismosTotales).map((sector) => ({
      urbanismo: sector,
      ...urbanismosTotales[sector],
    }));

    urbanismosTotalesArray.sort((a, b) => b.ingresosTotales - a.ingresosTotales);

    const topUrbanismosCalculados = urbanismosTotalesArray.slice(...TopUrb);
    setTopUrbanismos(topUrbanismosCalculados);
  }, [
    realtimeContracts,
    TopUrb,
    estadosSeleccionados,
    estadosSeleccionadosType,
    migradosSeleccionados,
    ciclosSeleccionados,
    sectoresSeleccionados,
    urbanismosSeleccionados,
    pasaFiltros,
    pasaFiltroTotales,
    extraerTipoDeSubdivision,
    sectorAgenciaMap,
  ]);

  if (error) return <div>Error: {error.message}</div>;

  if (showPasswordState) {
    return <LogingForm />;
  }

  return (
    <div className="contenedor">
      <LogoTitulo />
      <DropdownMenu />
      <PageNav />

          <div className="filtros-panel">
            <div className="busqueda-contrato">
              <input
                type="text"
                placeholder="Contrato o nombre..."
                value={contratoBuscado}
                onChange={(e) => setContratoBuscado(e.target.value)}
              />

              <button className="button" onClick={buscarPorContrato}>
                Buscar
              </button>
            </div>

            <div className="top-acciones-botones">
              <button className="button" onClick={handleTop10Urb}>
                Top 10
              </button>
              <button className="button" onClick={handleTopUrb}>
                Top Global
              </button>
            </div>

            <div className="filtros-selects-grid">
              <DropdownFilter
                label="Estatus"
                placeholder={
                  estadosSeleccionados.includes("Todos")
                    ? "Todos"
                    : estadosSeleccionados.length === 0
                    ? "Seleccionar..."
                    : estadosSeleccionados.filter(x => x !== "Todos").join(", ")
                }
              >
                {["Todos", "Activo", "Suspendido", "Por instalar", "Pausado", "Cancelado"].map(est => (
                   <label key={est} className="columna-item-check">
                    <input
                      type="checkbox"
                      checked={estadosSeleccionados.includes(est)}
                      onChange={() => handleEstadoChange(est)}
                    />
                    <span>{est === "Todos" ? "Todos" : est}</span>
                  </label>
                ))}
              </DropdownFilter>

              <DropdownFilter
                label="Tipo de Cliente"
                placeholder={
                  estadosSeleccionadosType.includes("Todos")
                    ? "Todos"
                    : estadosSeleccionadosType.length === 0
                    ? "Seleccionar..."
                    : estadosSeleccionadosType.filter(x => x !== "Todos").join(", ")
                }
              >
                {["Todos", "PYME", "RESIDENCIAL", "INTERCAMBIO", "EMPLEADO", "GRATIS"].map(tipo => (
                   <label key={tipo} className="columna-item-check">
                    <input
                      type="checkbox"
                      checked={estadosSeleccionadosType.includes(tipo)}
                      onChange={() => handleEstadoChange2(tipo)}
                    />
                    <span>{tipo === "Todos" ? "Todos" : tipo}</span>
                  </label>
                ))}
              </DropdownFilter>

              <DropdownFilter
                label="Migrados"
                placeholder={
                  migradosSeleccionados.includes("Todos")
                    ? "Todos"
                    : migradosSeleccionados.length === 0
                    ? "Seleccionar..."
                    : migradosSeleccionados.filter(x => x !== "Todos").join(", ")
                }
              >
                {["Todos", "Migrado", "No migrado"].map(mig => (
                   <label key={mig} className="columna-item-check">
                    <input
                      type="checkbox"
                      checked={migradosSeleccionados.includes(mig)}
                      onChange={() => handleMigradosChange(mig)}
                    />
                    <span>{mig}</span>
                  </label>
                ))}
              </DropdownFilter>

              {(estadosSeleccionadosType.includes("PYME") || estadosSeleccionadosType.includes("Todos")) && (
                <DropdownFilter
                  label="Ciclos"
                  placeholder={
                    ciclosSeleccionados.includes("Todos")
                      ? "Todos"
                      : ciclosSeleccionados.length === 0
                      ? "Seleccionar..."
                      : ciclosSeleccionados.filter(x => x !== "Todos").map(c => `Ciclo ${c}`).join(", ")
                  }
                >
                  {["Todos", "15", "30"].map(ciclo => (
                     <label key={ciclo} className="columna-item-check">
                      <input
                        type="checkbox"
                        checked={ciclosSeleccionados.includes(ciclo)}
                        onChange={() => handleCiclosChange(ciclo)}
                      />
                      <span>{ciclo === "Todos" ? "Todos" : `🗓️ Ciclo ${ciclo}`}</span>
                     </label>
                  ))}
                </DropdownFilter>
              )}

              <DropdownFilter
                label="Parroquias"
                placeholder={
                  sectoresSeleccionados.includes("Todos")
                    ? "Todas"
                    : sectoresSeleccionados.length === 0
                    ? "Seleccionar..."
                    : sectoresSeleccionados.filter(x => x !== "Todos").join(", ")
                }
              >
                {listaAgenciasDinamica.map(sec => (
                   <label key={sec} className="columna-item-check">
                    <input
                      type="checkbox"
                      checked={sectoresSeleccionados.includes(sec)}
                      onChange={() => handleSectoresChange(sec)}
                    />
                    <span>{sec === "Todos" ? "Todas" : sec}</span>
                  </label>
                ))}
              </DropdownFilter>

              <DropdownFilter
                label="Sectores"
                placeholder={
                  urbanismosSeleccionados.includes("Todos")
                    ? "Todos"
                    : urbanismosSeleccionados.length === 0
                    ? "Seleccionar..."
                    : `${urbanismosSeleccionados.length} seleccionados`
                }
              >
                <input
                  type="text"
                  placeholder="🔍 Buscar sector..."
                  value={busquedaSector}
                  onChange={(e) => setBusquedaSector(e.target.value)}
                  className="buscador-sectores"
                />
                <label className="columna-item-check">
                  <input
                    type="checkbox"
                    checked={urbanismosSeleccionados.includes("Todos")}
                    onChange={() => handleToggleGeneric(setUrbanismosSeleccionados, "Todos", "Todos")}
                  />
                  <span>Todos</span>
                </label>
                {urbanismosParaMostrar
                  .filter((urbanismo) =>
                    norm(urbanismo)
                      .toLowerCase()
                      .includes(busquedaSector.toLowerCase())
                  )
                  .map((urbanismo) => (
                    <label key={urbanismo} className="columna-item-check">
                      <input
                        type="checkbox"
                        checked={urbanismosSeleccionados.includes(urbanismo)}
                        onChange={() => handleToggleGeneric(setUrbanismosSeleccionados, urbanismo, "Todos")}
                      />
                      <span>{urbanismo}</span>
                    </label>
                  ))}
              </DropdownFilter>

              <DropdownFilter
                label="Columnas"
                placeholder={
                  columnasSeleccionadas.includes("Todas")
                    ? "Ver Todas"
                    : columnasSeleccionadas.length === 0
                    ? "Ninguna"
                    : `${columnasSeleccionadas.length} columnas`
                }
              >
                <label className="columna-item-check">
                  <input
                    type="checkbox"
                    checked={columnasSeleccionadas.includes("Todas")}
                    onChange={() => handleColumnasChange("Todas")}
                  />
                  <span>📋 Ver Todas</span>
                </label>
                {[
                  "Contrato", "Cedula", "IP", "MAC", "Estatus", "Estado Final", "Cliente",
                  "Teléfono", "Correo", "Sector", "Plan", "Costo", "Migrado", "Ciclo",
                  "Tipo_Cliente", "Dirección", "Interface", "Fecha_Creación", "Días Hábiles"
                ].map((col) => (
                  <label key={col} className="columna-item-check">
                    <input
                      type="checkbox"
                      checked={columnasSeleccionadas.includes(col)}
                      onChange={() => handleColumnasChange(col)}
                    />
                    <span>{col.replace("_", " ")}</span>
                  </label>
                ))}
              </DropdownFilter>
            </div>

            <div className="indicadores-totales-pills">
              <div className="indicador-pill">
                <div className="indicador-pill-icon-wrap">
                  <img
                    src={`${process.env.PUBLIC_URL}/ICON_personas.png`}
                    alt="Clientes"
                    className="indicador-pill-img"
                  />
                </div>
                <div className="indicador-pill-content">
                  <span className="indicador-pill-label">Total de clientes:</span>
                  <span className="indicador-pill-value">
                    {systemStatus === "loading" && totalClientesGlobal === 0
                      ? "..."
                      : totalClientesGlobal.toLocaleString("es-ES")}
                  </span>
                </div>
              </div>

              <div className="indicador-pill">
                <div className="indicador-pill-icon-wrap">
                  <img
                    src={`${process.env.PUBLIC_URL}/ICON_bolsa_dinero.png`}
                    alt="Ingresos"
                    className="indicador-pill-img"
                  />
                </div>
                <div className="indicador-pill-content">
                  <span className="indicador-pill-label">
                    {estadosSeleccionados.includes("Cancelado") ? "Total de Pérdida:" : "Total de Ingresos:"}
                  </span>
                  <span className="indicador-pill-value">
                    {systemStatus === "loading" && totalIngresos === 0
                      ? "..."
                      : `${totalIngresos.toLocaleString("es-ES", { minimumFractionDigits: 2 })}$`}
                  </span>
                </div>
              </div>
            </div>

            {/* SECCIÓN GUÍA DE REPORTES INTELIGENTES (3 Tarjetas Compactas + Acciones) */}
            <div className="reportes-guia-section animate-fade-in">
              <div className="reportes-guia-header">
                <div className="reportes-header-icon-box">
                  <img src={`${process.env.PUBLIC_URL}/ICON_grafico.png`} alt="Reportes" />
                </div>
                <div className="reportes-header-texts">
                  <h3 className="reportes-header-title">
                    Guía de <span className="highlight-text">Reportes Inteligentes</span>
                  </h3>
                  <p className="reportes-header-sub">
                    Selecciona el tipo de reporte que deseas generar. Los reportes utilizan los filtros y criterios seleccionados en el panel superior.
                  </p>
                </div>
              </div>

              <div className="reportes-cards-grid">
                {/* Tarjeta 1: Postventa */}
                <div 
                  className="report-card report-card-postventa"
                  onClick={handleDownloadExcelOperaciones}
                  title="Haz clic para descargar Reporte de Postventa"
                >
                  <div className="report-card-top">
                    <div className="report-card-icon-badge badge-postventa">
                      <img src={`${process.env.PUBLIC_URL}/ICON_personas.png`} alt="Postventa" />
                    </div>
                    <div className="report-card-info">
                      <h4 className="report-card-title">Reporte de Postventa / Atención al Cliente</h4>
                      <p className="report-card-desc">
                        Obtén un listado completo de clientes con su estatus, contactos y atención brindada.
                      </p>
                    </div>
                    <div className="report-card-arrow arrow-postventa">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </div>
                  </div>
                  <div className="report-card-bottom bottom-postventa">
                    <span className="bottom-format-pill">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                      </svg>
                      Formato: Excel
                    </span>
                    <span className="bottom-divider">|</span>
                    <span className="bottom-desc">Información detallada de clientes</span>
                  </div>
                </div>

                {/* Tarjeta 2: Ejecutivo */}
                <div 
                  className="report-card report-card-ejecutivo"
                  onClick={handleDownloadExcelExecutive}
                  title="Haz clic para descargar Reporte Ejecutivo"
                >
                  <div className="report-card-top">
                    <div className="report-card-icon-badge badge-ejecutivo">
                      <img src={`${process.env.PUBLIC_URL}/ICON_grafico.png`} alt="Ejecutivo" />
                    </div>
                    <div className="report-card-info">
                      <h4 className="report-card-title">Reporte Ejecutivo (Dashboard)</h4>
                      <p className="report-card-desc">
                        Visualiza de forma automática gráficas de estatus, top de sectores e indicadores financieros.
                      </p>
                    </div>
                    <div className="report-card-arrow arrow-ejecutivo">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </div>
                  </div>
                  <div className="report-card-bottom bottom-ejecutivo">
                    <span className="bottom-format-pill">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                      </svg>
                      Formato: Dashboard
                    </span>
                    <span className="bottom-divider">|</span>
                    <span className="bottom-desc">Vista visual e interactiva</span>
                  </div>
                </div>

                {/* Tarjeta 3: Personalizada */}
                <div 
                  className="report-card report-card-personalizado"
                  onClick={handleDownloadExcelSimple}
                  title="Haz clic para descargar Lista Personalizada"
                >
                  <div className="report-card-top">
                    <div className="report-card-icon-badge badge-personalizado">
                      <img src={`${process.env.PUBLIC_URL}/ICON_calculadora.png`} alt="Personalizado" />
                    </div>
                    <div className="report-card-info">
                      <h4 className="report-card-title">Lista Personalizada (Solo Columnas)</h4>
                      <p className="report-card-desc">
                        Genera un listado en Excel con únicamente las columnas que selecciones en los filtros.
                      </p>
                    </div>
                    <div className="report-card-arrow arrow-personalizado">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </div>
                  </div>
                  <div className="report-card-bottom bottom-personalizado">
                    <span className="bottom-format-pill">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                      </svg>
                      Formato: Excel
                    </span>
                    <span className="bottom-divider">|</span>
                    <span className="bottom-desc">A medida según tu necesidad</span>
                  </div>
                </div>
              </div>

              {/* Botones de Descarga en Píldora */}
              <div className="reportes-actions-row">
                <button 
                  className="report-download-btn btn-postventa" 
                  onClick={handleDownloadExcelOperaciones}
                  title="Descargar Excel Postventa / Atención al Cliente"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#f59e0b" style={{ marginRight: 8, flexShrink: 0 }}>
                    <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
                  </svg>
                  Descargar Excel Postventa / Atención al Cliente
                </button>
                <button 
                  className="report-download-btn btn-ejecutivo" 
                  onClick={handleDownloadExcelExecutive}
                  title="Descargar Reporte Ejecutivo"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#ffffff" style={{ marginRight: 8, flexShrink: 0 }}>
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                  </svg>
                  Descargar Reporte Ejecutivo
                </button>
                <button 
                  className="report-download-btn btn-personalizado" 
                  onClick={handleDownloadExcelSimple}
                  title="Descargar Lista Personalizada (Solo Columnas)"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#ffffff" style={{ marginRight: 8, flexShrink: 0 }}>
                    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                  </svg>
                  Descargar Lista Personalizada (Solo Columnas)
                </button>
              </div>

              {/* Indicación de filtros unificados */}
              <div className="reportes-info-banner">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                </svg>
                <span>
                  Los reportes se generan con los filtros y criterios seleccionados en el panel superior. Si no seleccionas una opción específica, se utilizarán todos los datos.
                </span>
              </div>
            </div>
          </div>

          {/* BANNER DE ESTADO DEL SISTEMA (Loading, Success o Error) */}
          <SisprotStatusBanner
            status={systemStatus}
            lastUpdatedTime={lastUpdatedTime}
            errorMessage={errorContratos?.message}
            onRetry={() => cargarContratosEnTiempoReal(true)}
            onRefresh={() => cargarContratosEnTiempoReal(true)}
          />

          <div className="titulo-topurbanismos">
            <h2 className="top-sectores-title">Top Sectores</h2>
            <p className="top-sectores-subtitle">Ranking por cantidad de clientes e ingresos</p>
          </div>

          {systemStatus === "loading" ? (
            <SkeletonDashboard />
          ) : modoBusquedaContrato ? (
            <UrbanismoList
              urbanismos={[
                {
                  urbanismo: "Resultado de busqueda",
                  cantidadClientes: clientesPorContrato.length,
                  ingresosTotales: clientesPorContrato.reduce((acc, c) => acc + Number(c.plan?.cost || 0), 0),
                  clientes: clientesPorContrato,
                },
              ]}
            />
          ) : (
            <UrbanismoList urbanismos={topUrbanismos} />
          )}
          {(isLoading || isUpdating) && (
        <div className="loading-overlay-blur">
          <div className="loading-card">
            <div className="loading-spinner"></div>
            <span className="loading-text">Cargando...</span>
          </div>
        </div>
      )}
    </div>
  );
}

function UrbanismoList({ urbanismos }) {
  const [urbanismoAbierto, setUrbanismoAbierto] = useState(null);

  const toggleMostrarLista = (index) => {
    setUrbanismoAbierto((prev) => (prev === index ? null : index));
  };

  const maxClientes = useMemo(() => {
    if (!urbanismos || urbanismos.length === 0) return 1;
    return Math.max(...urbanismos.map((u) => u.cantidadClientes || 0), 1);
  }, [urbanismos]);

  return (
    <ul className="urbanismos-grid">
      {urbanismos.map((urbanismo, index) => {
        const isRank1 = index === 0;
        const isRank2 = index === 1;
        const isRank3 = index === 2;
        const isTop3 = isRank1 || isRank2 || isRank3;
        const percent = Math.min(100, Math.max(10, Math.round(((urbanismo.cantidadClientes || 0) / maxClientes) * 100)));

        return (
          <li
            className={`urbanismo-item ${isTop3 ? `top-rank-${index + 1}` : ""} ${
              urbanismoAbierto === index ? "expanded" : ""
            }`}
            key={urbanismo.urbanismo || index}
          >
            <div className="sector-card-header">
              {isRank1 ? (
                <img
                  src={`${process.env.PUBLIC_URL}/ICON_primer-lugar.png`}
                  alt="1er Lugar"
                  className="rank-medal-img"
                />
              ) : isRank2 ? (
                <img
                  src={`${process.env.PUBLIC_URL}/ICON_segundo-lugar.png`}
                  alt="2do Lugar"
                  className="rank-medal-img"
                />
              ) : isRank3 ? (
                <img
                  src={`${process.env.PUBLIC_URL}/ICON_tercer-lugar.png`}
                  alt="3er Lugar"
                  className="rank-medal-img"
                />
              ) : (
                <div className="rank-number-badge">{index + 1}</div>
              )}

              <div className="sector-card-header-main">
                <h4 className="sector-card-title" title={urbanismo.urbanismo}>
                  {urbanismo.urbanismo}
                </h4>
                <div className="sector-progress-track">
                  <div
                    className="sector-progress-fill"
                    style={{ width: `${percent}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="sector-stats-row">
              <div className="sector-stat-col">
                <div className="sector-stat-icon client-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                  </svg>
                </div>
                <div className="sector-stat-data">
                  <span className="sector-stat-label">Clientes</span>
                  <span className="sector-stat-value">{urbanismo.cantidadClientes}</span>
                </div>
              </div>

              <div className="sector-stat-divider"></div>

              <div className="sector-stat-col">
                <div className="sector-stat-icon money-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" />
                  </svg>
                </div>
                <div className="sector-stat-data">
                  <span className="sector-stat-label">Ingreso</span>
                  <span className="sector-stat-value">
                    {Math.round(urbanismo.ingresosTotales)}$
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => toggleMostrarLista(index)}
              className="btn-ver-clientes"
            >
              {urbanismoAbierto === index ? "Ocultar clientes ↑" : "Ver clientes →"}
            </button>

            {urbanismoAbierto === index && (
              <div className="clientes-wrapper animate-fade-in">
                <div className="clientes-grid">
                  {urbanismo.clientes.map((cliente, idx) => {
                    const planName = cliente.plan?.name || "N/A";
                    const planCost = cliente.plan?.cost ?? "0";

                    return (
                      <article key={idx} className="cliente-card">
                        <div className="cliente-header">
                          <div className="cliente-nombre" title={cliente.client_name}>
                            {cliente.client_name || "Sin nombre"}
                          </div>

                          <span
                            className={`badge-estado badge-${(cliente.status_name || "")
                              .toLowerCase()
                              .replace(/\s+/g, "-")}`}
                          >
                            {cliente.status_name || "Sin estado"}
                          </span>
                        </div>

                        <div className="cliente-body">
                          <div className="cliente-row">
                            <span className="cliente-label">Sector</span>
                            <span className="cliente-value">{cliente.sector_name || "N/A"}</span>
                          </div>

                          <div className="cliente-row">
                            <span className="cliente-label">Plan</span>
                            <span className="cliente-value">
                              {planName} (${planCost})
                            </span>
                          </div>

                          <div className="cliente-row">
                            <span className="cliente-label">Tel</span>
                            <span className="cliente-value">{cliente.client_mobile || "N/A"}</span>
                          </div>

                          <div className="cliente-data">
                            <span>
                              <strong>ID:</strong> {cliente.id}
                            </span>
                            <span>
                              <strong>Ciclo:</strong> {mapCycleValue(cliente.cycle, cliente)}
                            </span>
                          </div>

                          <div className="cliente-row cliente-row-direccion">
                            <span className="cliente-label">Dir</span>
                            <span className="cliente-value">{cliente.address || "N/A"}</span>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default TopUrbanismo;
