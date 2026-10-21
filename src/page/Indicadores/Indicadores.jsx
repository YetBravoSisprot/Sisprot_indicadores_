import React, { useState, useEffect, useContext, useMemo, useCallback } from "react";
import PageNav from "../../Componentes/PageNav";
import LogoTitulo from "../../Componentes/LogoTitulo";
import { PasswordContext } from "../../PasswordContext/PasswordContext";
import Loging from "../Loging/Loging";
import DropdownMenu from "../../Componentes/DropdownMenu";
import { fetchContractsByStatus } from "../../services/contractService";
import "./Indicadores.css";

// Mapeo base de sectores a agencias (como respaldo seguro)
const staticSectorAgenciaMap = {
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

const norm = (str) =>
  String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

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
            <h4 className="status-banner-title text-error">No fue posible actualizar los datos en tiempo real</h4>
            <p className="status-banner-subtitle text-error-sub">
              {errorMessage ? `Error: ${errorMessage}. ` : "Ocurrió un error al consultar la API. "}
              Mostrando los datos almacenados localmente.
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

// Medidor circular de porcentaje (Donut Chart)
function DonutMeter({ percentage = 0, size = 114, strokeWidth = 11 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPercent = Math.min(100, Math.max(0, percentage));
  const strokeDashoffset = circumference - (clampedPercent / 100) * circumference;

  return (
    <div className="donut-meter-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="donut-svg">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="donut-track"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="donut-fill"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="donut-center-text">
        <span className="donut-percent-value">{clampedPercent.toFixed(1)}%</span>
      </div>
    </div>
  );
}

// ==========================================
// ICONOS SVG VECTORIALES DE ALTA FIDELIDAD
// ==========================================

function BarChartHeaderIcon({ className = "header-icon-svg" }) {
  return (
    <svg viewBox="0 0 28 28" width="28" height="28" className={className} fill="none">
      <defs>
        <linearGradient id="headerBarGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
      </defs>
      <rect x="3" y="14" width="5.5" height="11" rx="2.5" fill="url(#headerBarGrad)" opacity="0.85" />
      <rect x="11.2" y="8" width="5.5" height="17" rx="2.5" fill="url(#headerBarGrad)" />
      <rect x="19.5" y="3" width="5.5" height="22" rx="2.5" fill="#38bdf8" />
    </svg>
  );
}

function PorcentajeUsersIcon({ size = 24, className = "squircle-icon-svg" }) {
  return (
    <svg viewBox="0 0 26 26" width={size} height={size} className={className} fill="none">
      <defs>
        <linearGradient id="cyanUsersGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
      </defs>
      <circle cx="10" cy="7.5" r="4.2" fill="url(#cyanUsersGrad)" />
      <path
        d="M2.5 21.5c0-4.14 3.36-7.5 7.5-7.5s7.5 3.36 7.5 7.5"
        fill="url(#cyanUsersGrad)"
      />
      <circle cx="18.5" cy="8.5" r="3.2" fill="#38bdf8" fillOpacity="0.75" />
      <path
        d="M17.5 15.2c2.4.6 4.2 2.7 4.5 5.8"
        stroke="#38bdf8"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeOpacity="0.85"
      />
    </svg>
  );
}

function MoneyBagIcon({ size = 26, className = "squircle-icon-svg" }) {
  return (
    <svg viewBox="0 0 28 28" width={size} height={size} className={className} fill="none">
      <defs>
        <linearGradient id="goldBagGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="35%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
      </defs>
      <path
        d="M10 5.2C10 3.8 12 3 14 3s4 .8 4 2.2c0 .6-.5 1-1.2 1h-5.6c-.7 0-1.2-.4-1.2-1z"
        fill="url(#goldBagGrad)"
      />
      <rect x="10.5" y="6.2" width="7" height="2" rx="1" fill="#fde047" />
      <path
        d="M14 8.2c-5 0-9.2 4.2-9.2 9.8 0 4.2 4 7 9.2 7s9.2-2.8 9.2-7c0-5.6-4.2-9.8-9.2-9.8z"
        fill="url(#goldBagGrad)"
      />
      <text
        x="14"
        y="19.8"
        textAnchor="middle"
        fontSize="11"
        fontWeight="900"
        fontFamily="sans-serif"
        fill="#78350f"
      >
        $
      </text>
    </svg>
  );
}

function StarGoldIcon({ size = 26, className = "squircle-icon-svg" }) {
  return (
    <svg viewBox="0 0 28 28" width={size} height={size} className={className} fill="none">
      <defs>
        <linearGradient id="goldStarGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fffbeb" />
          <stop offset="25%" stopColor="#facc15" />
          <stop offset="70%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>
      <path
        d="M14 3l3.3 6.8 7.5 1.1-5.4 5.3 1.3 7.5L14 20.2l-6.7 3.5 1.3-7.5-5.4-5.3 7.5-1.1L14 3z"
        fill="url(#goldStarGrad)"
        stroke="#fef08a"
        strokeWidth="0.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TotalClientsIcon({ size = 24, className = "squircle-icon-svg" }) {
  return (
    <svg viewBox="0 0 26 26" width={size} height={size} className={className} fill="none">
      <defs>
        <linearGradient id="purpleUsersGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e0e7ff" />
          <stop offset="40%" stopColor="#a5b4fc" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>
      <circle cx="10" cy="7.5" r="4.2" fill="url(#purpleUsersGrad)" />
      <path
        d="M2.5 21.5c0-4.14 3.36-7.5 7.5-7.5s7.5 3.36 7.5 7.5"
        fill="url(#purpleUsersGrad)"
      />
      <circle cx="18.5" cy="8.5" r="3.2" fill="#c7d2fe" fillOpacity="0.8" />
      <path
        d="M17.5 15.2c2.4.6 4.2 2.7 4.5 5.8"
        stroke="#c7d2fe"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeOpacity="0.85"
      />
    </svg>
  );
}

function ActivosCheckIcon({ size = 24, className = "squircle-icon-svg" }) {
  return (
    <svg viewBox="0 0 26 26" width={size} height={size} className={className} fill="none">
      <defs>
        <linearGradient id="greenShieldGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>
      <path
        d="M13 2.5L4 6.5v6.2c0 5.6 3.8 10.9 9 12.3 5.2-1.4 9-6.7 9-12.3V6.5l-9-4z"
        fill="url(#greenShieldGrad)"
      />
      <polyline
        points="8.5 13 11.5 16 17.5 9.5"
        stroke="#ffffff"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SuspendidosAlertIcon({ size = 24, className = "squircle-icon-svg" }) {
  return (
    <svg viewBox="0 0 26 26" width={size} height={size} className={className} fill="none">
      <defs>
        <linearGradient id="amberAlertGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="45%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>
      <path
        d="M13 3.5c.8 0 1.6.5 2 1.2l8.8 15.2c.8 1.4-.2 3.1-1.8 3.1H4c-1.6 0-2.6-1.7-1.8-3.1L11 4.7c.4-.7 1.2-1.2 2-1.2z"
        fill="url(#amberAlertGrad)"
      />
      <line x1="13" y1="9.5" x2="13" y2="15" stroke="#78350f" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="13" cy="18.5" r="1.3" fill="#78350f" />
    </svg>
  );
}

function CanceladosStopIcon({ size = 24, className = "squircle-icon-svg" }) {
  return (
    <svg viewBox="0 0 26 26" width={size} height={size} className={className} fill="none">
      <defs>
        <linearGradient id="redCircleGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f87171" />
          <stop offset="100%" stopColor="#dc2626" />
        </linearGradient>
      </defs>
      <circle cx="13" cy="13" r="10" stroke="url(#redCircleGrad)" strokeWidth="2.5" />
      <circle cx="13" cy="13" r="4.5" fill="url(#redCircleGrad)" />
    </svg>
  );
}

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

function Indicadores() {
  const { showPasswordState, data } = useContext(PasswordContext);

  const [sectorAgenciaMap, setSectorAgenciaMap] = useState(staticSectorAgenciaMap);
  const [realtimeContracts, setRealtimeContracts] = useState(() => (data?.results && data.results.length > 0 ? data.results : []));
  const [systemStatus, setSystemStatus] = useState(() => (data?.results && data.results.length > 0 ? "success" : "loading"));
  const [lastUpdatedTime, setLastUpdatedTime] = useState(() => getFormattedTime());
  const [errorContratos, setErrorContratos] = useState(null);

  const [tipoFiltro, setTipoFiltro] = useState("Todos");
  const [agenciaFiltro, setAgenciaFiltro] = useState("Todos");
  const [sectorFiltro, setSectorFiltro] = useState("Todos");
  const [tipoClienteFiltro, setTipoClienteFiltro] = useState("Todos");

  // Sincronizar datos del contexto si llegan posteriormente
  useEffect(() => {
    if (data?.results && data.results.length > 0 && realtimeContracts.length === 0) {
      setRealtimeContracts(data.results);
      setSystemStatus("success");
      setLastUpdatedTime(getFormattedTime());
    }
  }, [data, realtimeContracts.length]);

  // Carga dinámica de sectores desde el mismo endpoint que Top Urbanismo
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
        
        const mapParishToAgency = (parishName) => {
          const normParish = String(parishName || "").toUpperCase().trim();
          if (normParish.includes("SAMAN") || normParish.includes("GUERE") || normParish.includes("MACARO")) return "MACARO";
          if (normParish.includes("PEDRO") || normParish.includes("AREVALO") || normParish.includes("PAYA")) return "PAYA";
          if (normParish.includes("TURMERO")) return "TURMERO";
          return "TURMERO";
        };
        
        const newMap = { ...staticSectorAgenciaMap };
        sectors.forEach(sector => {
          if (!sector.name) return;
          const sName = norm(sector.name);
          const agency = mapParishToAgency(sector.parish_name);
          newMap[sName] = agency;
          newMap[sector.name] = agency;
        });
        
        setSectorAgenciaMap(newMap);
      } catch (err) {
        console.warn("No se pudieron cargar sectores dinámicamente en Indicadores:", err);
      }
    };
    
    cargarSectores();
  }, []);

  // Carga en tiempo real de contratos desde el mismo endpoint que Top Urbanismo
  const cargarContratosEnTiempoReal = useCallback(async (forceRefresh = false) => {
    // Si el usuario presiona 'Actualizar' o aún no hay datos en pantalla, mostramos el estado de carga
    if (forceRefresh || !realtimeContracts || realtimeContracts.length === 0) {
      setSystemStatus("loading");
    }
    setErrorContratos(null);

    try {
      const res = await fetchContractsByStatus(["Todos"], forceRefresh);
      if (res && res.results && res.results.length > 0) {
        setRealtimeContracts(res.results);
      }
      setSystemStatus("success");
      setLastUpdatedTime(getFormattedTime());
    } catch (err) {
      console.warn("No se pudo actualizar contratos en tiempo real en Indicadores:", err);
      setErrorContratos(err);
      // Si ya hay datos en pantalla, se mantiene funcional para no alarmar al usuario
      setSystemStatus((prev) => (realtimeContracts && realtimeContracts.length > 0 ? "success" : "error"));
    }
  }, [realtimeContracts]);

  useEffect(() => {
    cargarContratosEnTiempoReal(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Al cambiar agencia, reseteamos sector
  useEffect(() => {
    setSectorFiltro("Todos");
  }, [agenciaFiltro]);

  // Cálculos de analytics por sector usando los contratos en tiempo real
  const analyticsSectores = useMemo(() => {
    const sectores = {};
    const base = realtimeContracts || [];
    if (!base.length) return [];

    // Filtramos solo clientes activos para el ranking de ingresos (igual que Top Urbanismo)
    const clientesBase = base.filter(c => c.status_name === "Activo" || c.status === 16);

    clientesBase.forEach(cliente => {
      const sector = cliente.sector_name || "Sin Sector";
      const costo = parseFloat(cliente.plan?.cost) || 0;
      if (!sectores[sector]) {
        sectores[sector] = { total: 0, count: 0 };
      }
      sectores[sector].total += costo;
      sectores[sector].count += 1;
    });

    return Object.entries(sectores).map(([name, stats]) => ({
      name,
      average: stats.count > 0 ? stats.total / stats.count : 0,
      total: stats.total,
      count: stats.count,
      agencia: sectorAgenciaMap[name] || sectorAgenciaMap[norm(name)] || "TURMERO"
    })).sort((a, b) => b.total - a.total); // Ordenamos por Ingreso Total
  }, [realtimeContracts, sectorAgenciaMap]);

  const topSector = analyticsSectores[0];
  const listaAgencias = ["Todos", "MACARO", "PAYA", "TURMERO"];
  const listaTiposCliente = ["Todos", "RESIDENCIAL", "PYME", "Residencial y PYME", "EMPLEADO", "GRATIS", "INTERCAMBIO"];

  const listaSectores = useMemo(() => {
    const base = realtimeContracts || [];
    if (!base.length) return ["Todos"];

    const filtradosPorAgencia = agenciaFiltro === "Todos"
      ? base
      : base.filter(c => {
          const ag = sectorAgenciaMap[c.sector_name] || sectorAgenciaMap[norm(c.sector_name)];
          return ag === agenciaFiltro;
        });

    const nombres = Array.from(new Set(filtradosPorAgencia.map(c => c.sector_name).filter(Boolean)));
    nombres.sort((a, b) => a.localeCompare(b, "es"));
    return ["Todos", ...nombres];
  }, [realtimeContracts, agenciaFiltro, sectorAgenciaMap]);

  const clientesFiltrados = useMemo(() => {
    const base = realtimeContracts || [];
    if (!base.length) return [];

    return base.filter(cliente => {
      const ag = sectorAgenciaMap[cliente.sector_name] || sectorAgenciaMap[norm(cliente.sector_name)];
      const matchEstado = tipoFiltro === "Todos" || cliente.status_name === tipoFiltro;
      const matchAgencia = agenciaFiltro === "Todos" || ag === agenciaFiltro;
      const matchSector = sectorFiltro === "Todos" || cliente.sector_name === sectorFiltro;
      const matchTipoCliente = matchesTipoCliente(cliente, tipoClienteFiltro);
      return matchEstado && matchAgencia && matchSector && matchTipoCliente;
    });
  }, [realtimeContracts, tipoFiltro, agenciaFiltro, sectorFiltro, tipoClienteFiltro, sectorAgenciaMap]);

  const contarEstados = () => {
    let baseParaConteo = realtimeContracts || [];

    if (agenciaFiltro !== "Todos") {
      baseParaConteo = baseParaConteo.filter(c => {
        const ag = sectorAgenciaMap[c.sector_name] || sectorAgenciaMap[norm(c.sector_name)];
        return ag === agenciaFiltro;
      });
    }
    if (sectorFiltro !== "Todos") {
      baseParaConteo = baseParaConteo.filter(c => c.sector_name === sectorFiltro);
    }
    baseParaConteo = baseParaConteo.filter(c => matchesTipoCliente(c, tipoClienteFiltro));

    const conteo = { Todos: baseParaConteo.length, Activo: 0, Suspendido: 0, Cancelado: 0 };
    const montos = { Todos: 0, Activo: 0, Suspendido: 0, Cancelado: 0 };

    baseParaConteo.forEach((cliente) => {
      const est = cliente.status_name || "Desconocido";
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
    const activos = clientesFiltrados.filter(c => c.status_name === "Activo" || c.status === 16).length;
    const salud = total > 0 ? (activos / total) * 100 : 0;

    const fuga = clientesFiltrados
      .filter(c => c.status_name === "Cancelado" || c.status === 34)
      .reduce((acc, c) => acc + (parseFloat(c.plan?.cost) || 0), 0);

    const recuperable = clientesFiltrados
      .filter(c => c.status_name === "Suspendido" || c.status === 19)
      .reduce((acc, c) => acc + (parseFloat(c.plan?.cost) || 0), 0);

    return { salud, fuga, recuperable, totalActivos: activos };
  }, [clientesFiltrados]);



  if (showPasswordState) {
    return <Loging />;
  }

  return (
    <div>
      <LogoTitulo />
      <DropdownMenu />
      <PageNav />

      <div className="indicadores-dashboard animate-slide-up">
        {/* ENCABEZADO PRINCIPAL */}
        <div className="dashboard-header-container">
          <div className="dashboard-header-icon-box">
            <BarChartHeaderIcon />
          </div>
          <div className="dashboard-header-texts">
            <h2 className="dashboard-title-main">
              Resumen <span className="title-highlight">Estratégico</span>
            </h2>
            <p className="dashboard-subtitle">
              Visión general del estado de la cartera de clientes y oportunidades de recuperación.
            </p>
          </div>
        </div>

        {/* Banner de sincronización de contratos en tiempo real */}
        <SisprotStatusBanner
          status={systemStatus}
          lastUpdatedTime={lastUpdatedTime}
          errorMessage={errorContratos?.message}
          onRetry={() => cargarContratosEnTiempoReal(true)}
          onRefresh={() => cargarContratosEnTiempoReal(true)}
        />

        {/* SECCIÓN 1: TARJETAS SUPERIORES DE INTELIGENCIA ESTRATÉGICA (BI) */}
        <div className="kpi-grid section-intelligence-top">
          {/* Card 1: Porcentaje Activos */}
          <div className="kpi-card card-bi-salud">
            <div className="card-top-header">
              <div className="card-squircle-icon icon-bg-blue">
                <PorcentajeUsersIcon size={24} />
              </div>
              <span className="card-label-question">
                ¿QUÉ PORCENTAJE DE MIS CLIENTES TOTALES ESTÁN PAGANDO Y TIENEN EL SERVICIO ACTIVO?
              </span>
            </div>

            <div className="card-salud-body">
              <DonutMeter percentage={biMetrics.salud} size={114} strokeWidth={11} />
              <div className="salud-stats-col">
                <span className="salud-main-number">
                  {biMetrics.totalActivos.toLocaleString("es-ES")}
                </span>
                <span className="salud-badge-text">Activos</span>
                <span className="salud-context-text">
                  de {conteos.Todos.toLocaleString("es-ES")} clientes
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Oportunidad USD */}
          <div className="kpi-card card-bi-oportunidad">
            <div className="card-top-header">
              <div className="card-squircle-icon icon-bg-amber">
                <MoneyBagIcon size={26} />
              </div>
              <div className="card-label-with-info">
                <span className="card-label-title">OPORTUNIDAD (USD)</span>
                <span className="info-tooltip-badge" title="Monto acumulado por planes de clientes suspendidos">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                </span>
              </div>
            </div>

            <div className="card-oportunidad-body">
              <p className="oportunidad-big-value">
                ${biMetrics.recuperable.toLocaleString("es-ES", { minimumFractionDigits: 2 })}
              </p>
              <span className="card-sub-hint">Ingreso potencial mensual</span>

              <div className="oportunidad-callout-box">
                <div className="callout-trend-icon">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                    <polyline points="17 6 23 6 23 12" />
                  </svg>
                </div>
                <p className="callout-text">
                  Si la suma de los clientes de todos los clientes{" "}
                  <strong className="highlight-green">Suspendidos</strong>, representa lo que tu empresa podria recuperar mensualmente si se reactiva en este análisis.
                </p>
              </div>
            </div>
          </div>

          {/* Card 3: Sector Líder */}
          <div className="kpi-card card-bi-lider">
            <div className="card-top-header">
              <div className="card-squircle-icon icon-bg-gold">
                <StarGoldIcon size={26} />
              </div>
              <span className="card-label-title">SECTOR LÍDER</span>
            </div>

            <div className="card-lider-body">
              <p className="lider-sector-name">
                {topSector ? topSector.name : "Casco de Turmero"}
              </p>

              <div className="lider-meta-row">
                <span className="tag-agencia-pill">
                  {topSector ? topSector.agencia : "TURMERO"}
                </span>
                <span className="lider-amount-text">
                  {topSector ? `$${topSector.total.toLocaleString("es-ES", { minimumFractionDigits: 2 })}` : "$0,00"}
                </span>
              </div>
            </div>

            {/* Barras decorativas ascendentes del fondo como en el diseño */}
            <div className="sector-leader-bars-graphic" aria-hidden="true">
              <span className="bar bar-1" />
              <span className="bar bar-2" />
              <span className="bar bar-3" />
              <span className="bar bar-4" />
            </div>
          </div>
        </div>

        {/* SECCIÓN 2: RESUMEN DE CLIENTES */}
        <div className="section-divider-row">
          <div className="section-divider-left">
            <div className="section-header-icon-badge">
              <PorcentajeUsersIcon size={20} />
            </div>
            <h3 className="section-title-text">
              Resumen de <span className="title-highlight">clientes</span>
            </h3>
          </div>
          <div className="section-divider-line" />
        </div>

        {/* 4 TARJETAS: CONTEOS CON ONDAS AMBIENTALES */}
        <div className="kpi-grid section-counts-grid">
          {/* Total Clientes */}
          <div className="kpi-card card-metric-wave wave-purple">
            <div className="metric-header-row">
              <div className="metric-squircle squircle-purple">
                <TotalClientsIcon size={24} />
              </div>
              <div className="metric-label-wrap">
                <span className="metric-label-text">TOTAL CLIENTES</span>
                <span className="info-tooltip-badge" title={`Total de la base: ${fmtMonto(montosPorEstado.Todos)} en facturación`}>
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                </span>
              </div>
            </div>
            <p className="metric-value-huge">{conteos.Todos.toLocaleString("es-ES")}</p>
            <span className="metric-footer-text">Total de la base de clientes</span>
            <div className="card-wave-bg wave-tint-purple" />
          </div>

          {/* Activos */}
          <div className="kpi-card card-metric-wave wave-green">
            <div className="metric-header-row">
              <div className="metric-squircle squircle-green">
                <ActivosCheckIcon size={24} />
              </div>
              <div className="metric-label-wrap">
                <span className="metric-label-text">ACTIVOS</span>
                <span className="info-tooltip-badge" title={`Ingreso mensual activo: ${fmtMonto(montosPorEstado.Activo)}`}>
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                </span>
              </div>
            </div>
            <p className="metric-value-huge">{(conteos.Activo || 0).toLocaleString("es-ES")}</p>
            <span className="metric-footer-text">Total de clientes con servicio activo mensual</span>
            <div className="card-wave-bg wave-tint-green" />
          </div>

          {/* Suspendidos */}
          <div className="kpi-card card-metric-wave wave-amber">
            <div className="metric-header-row">
              <div className="metric-squircle squircle-amber">
                <SuspendidosAlertIcon size={24} />
              </div>
              <div className="metric-label-wrap">
                <span className="metric-label-text">SUSPENDIDOS</span>
                <span className="info-tooltip-badge" title={`Monto recuperable mensual: ${fmtMonto(montosPorEstado.Suspendido)}`}>
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                </span>
              </div>
            </div>
            <p className="metric-value-huge">{(conteos.Suspendido || 0).toLocaleString("es-ES")}</p>
            <span className="metric-footer-text">Total de clientes suspendidos</span>
            <div className="card-wave-bg wave-tint-amber" />
          </div>

          {/* Cancelados */}
          <div className="kpi-card card-metric-wave wave-red">
            <div className="metric-header-row">
              <div className="metric-squircle squircle-red">
                <CanceladosStopIcon size={24} />
              </div>
              <div className="metric-label-wrap">
                <span className="metric-label-text">CANCELADOS TASA GENERAL</span>
                <span className="info-tooltip-badge" title={`Pérdida mensual por cancelaciones: ${fmtMonto(montosPorEstado.Cancelado)}`}>
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                </span>
              </div>
            </div>
            <p className="metric-value-huge">{(conteos.Cancelado || 0).toLocaleString("es-ES")}</p>
            <span className="metric-footer-text">Total de clientes cancelados mensual</span>
            <div className="card-wave-bg wave-tint-red" />
          </div>
        </div>

        {/* SECCIÓN 3: FILTROS DE CONSULTA (Barra horizontal unificada) */}
        <div className="filtros-consulta-horizontal-bar">
          <div className="filtros-bar-title-wrap">
            <div className="filtros-funnel-squircle">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
            </div>
            <span className="filtros-bar-heading">Filtros de consulta</span>
          </div>

          <div className="filtros-bar-controls-grid">
            {/* Agencia */}
            <div className="filtro-unit">
              <label className="filtro-unit-label">SELECCIONAR AGENCIA</label>
              <div className="filtro-select-box">
                <select
                  value={agenciaFiltro}
                  onChange={(e) => setAgenciaFiltro(e.target.value)}
                  className="filtro-custom-select"
                >
                  {listaAgencias.map((agencia) => (
                    <option key={agencia} value={agencia}>{agencia}</option>
                  ))}
                </select>
                <span className="filtro-select-chevron">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </span>
              </div>
            </div>

            {/* Sector */}
            <div className="filtro-unit">
              <label className="filtro-unit-label">SELECCIONAR SECTOR</label>
              <div className="filtro-select-box">
                <select
                  value={sectorFiltro}
                  onChange={(e) => setSectorFiltro(e.target.value)}
                  className="filtro-custom-select"
                >
                  {listaSectores.map((sector) => (
                    <option key={sector} value={sector}>{sector}</option>
                  ))}
                </select>
                <span className="filtro-select-chevron">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </span>
              </div>
            </div>

            {/* Tipo de cliente */}
            <div className="filtro-unit">
              <label className="filtro-unit-label">TIPO DE CLIENTE</label>
              <div className="filtro-select-box">
                <select
                  value={tipoClienteFiltro}
                  onChange={(e) => setTipoClienteFiltro(e.target.value)}
                  className="filtro-custom-select"
                >
                  {listaTiposCliente.map((tipo) => (
                    <option key={tipo} value={tipo}>{tipo}</option>
                  ))}
                </select>
                <span className="filtro-select-chevron">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Indicadores;
