import React, { useState, useEffect, useContext } from "react";
import PageNav from "../../Componentes/PageNav";
import LogoTitulo from "../../Componentes/LogoTitulo";
import { PasswordContext } from "../../PasswordContext/PasswordContext";
import LogingForm from "../../Componentes/LogingForm";
import "./TopUrbanismo.css";
import ChartComponent from "../../Componentes/ChartComponent";
import DropdownMenu from "./../../Componentes/DropdownMenu";
import * as XLSX from "xlsx";

// Mapeo de sectores a agencias
const sectorAgenciaMap = {
"Villas El Carmen": "NODO MACARO",
"El Macaro": "NODO MACARO",
"Saman de Guere": "NODO MACARO",
"Casco de Turmero": "NODO TURMERO",
"Villa Los Tamarindos": "NODO MACARO",
"Mata Caballo": "NODO PAYA",
"Pantin": "NODO PAYA",
"Saman Tarazonero II": "NODO MACARO",
"Rio Seco": "NODO PAYA",
"Ezequiel Zamora": "NODO TURMERO",
"La Casona II": "NODO MACARO",
"Durpa": "NODO PAYA",
"Paya Abajo": "NODO PAYA",
"Saman Tarazonero I": "NODO MACARO",
"Prados III": "NODO PAYA",
"Bicentenario": "NODO PAYA",
"Prados II": "NODO PAYA",
"La Casona I": "NODO MACARO",
"Palmeras II": "NODO MACARO",
"Guanarito": "NODO TURMERO",
"La Macarena": "NODO MACARO",
"Brisas de Paya": "NODO PAYA",
"Isaac Oliveira": "NODO MACARO",
"La Magdalena": "NODO MACARO",
"El Paraiso": "NODO MACARO",
"Antigua Hacienda De Paya": "NODO PAYA",
"San Sebastian": "NODO MACARO",
"Ppal Paya": "NODO PAYA",
"Lascenio Guerrero": "NODO MACARO",
"Los Hornos": "NODO PAYA",
"Callejon Lim": "NODO PAYA",
"Tibisay Guevara": "NODO TURMERO",
"Plaza Jardin": "NODO MACARO",
"Antigua Hacienda De Paya II": "NODO PAYA",
"Villas Del Sur": "NODO TURMERO", 
"San Pablo": "NODO TURMERO",
"Vallecito": "NODO PAYA",
"Jabillar": "NODO MACARO",
"Prados I": "NODO PAYA",
"La Concepcion": "NODO MACARO",
"Las Rurales": "NODO PAYA",
"Valle Paraiso": "NODO TURMERO",
"Simon Bolivar": "NODO MACARO",
"Canaima": "NODO PAYA",
"Vista Hermosa": "NODO PAYA",
"Valle Verde": "NODO PAYA",
"Palma Real": "NODO PAYA",
"Palmeras I": "NODO MACARO",
"Prados de Cafetal": "NODO TURMERO",
"Santa Eduviges": "NODO MACARO",
"El Naranjal": "NODO PAYA",
"Villa De San Jose": "NODO MACARO",
"La Floresta": "NODO TURMERO",
"Terrazas de Paya": "NODO PAYA",
"Salto Angel": "NODO MACARO",
"Villeguita": "NODO TURMERO",
"La Esperanza": "NODO MACARO",
"La Arboleda": "NODO PAYA",
"La Concepcion III": "NODO MACARO",
"La Julia": "NODO MACARO",
"Terrazas de Turmero": "NODO TURMERO",
"Haras de San Pablo": "NODO TURMERO",
"Taguapire": "NODO MACARO",
"La Casona II Edificios": "NODO MACARO",
"Antonio Jose de Sucre": "NODO MACARO",
"Valle del Rosario": "NODO MACARO",
"Arturo Luis Berti": "NODO MACARO",
"Callejon Cañaveral": "NODO PAYA",
"Laguna Plaza": "NODO TURMERO",
"La Casona I Edificios": "NODO MACARO",
"Villa Caribe": "NODO TURMERO",
"Narayola II": "NODO MACARO",
"Luz y Vida": "NODO PAYA",
"Terrazas de Juan Pablo": "NODO MACARO",
"Residencias Candys": "NODO TURMERO",
"El Nispero": "NODO TURMERO",
"Ciudad Bendita": "NODO TURMERO",
"Residencias Mariño": "NODO TURMERO",
"San Carlos": "NODO TURMERO",
"Los Mangos": "NODO PAYA",
"Callejon Los Jabillos": "NODO PAYA",
"Guerito": "NODO MACARO",
"Laguna II": "NODO TURMERO",
"Marina Caribe": "NODO TURMERO",
"Dios Es Mi Refugio": "NODO PAYA",
"Huerta Los Pajaros": "NODO PAYA",
"La Montañita": "NODO TURMERO",
"Betania": "NODO PAYA",
"1ro de Mayo Norte": "NODO PAYA",
"Payita": "NODO PAYA",
"Las Palmas": "NODO PAYA",
"1ro de Mayo Sur": "NODO PAYA",
"El Cambur": "NODO PAYA",
"La Orquidea": "NODO PAYA",
"Sector los Mangos": "NODO PAYA",
"La Aduana": "NODO TURMERO",
"Valle Fresco": "NODO TURMERO",
"El Bosque": "NODO PAYA",
"Leocolbo": "NODO MACARO",
"Callejon Rosales": "NODO PAYA",
"Prados": "NODO PAYA",
"Calle Peñalver": "NODO TURMERO",
"Los Caobos": "NODO MACARO",
"Callejon 17": "NODO PAYA",
"Los Nisperos": "NODO TURMERO",
"La Montaña": "NODO TURMERO",
"Santa Barbara": "NODO MACARO",
"Valle lindo": "NODO TURMERO",
"Polvorin": "NODO PAYA",
"Guayabita": "NODO PAYA",
"La Marcelota": "NODO PAYA",
"Manirito": "NODO PAYA",
"Paraguatan": "NODO PAYA",
"La Guzman": "NODO PAYA",
"18 de Septiembre": "NODO MACARO",
"Edif. El Torreon": "NODO TURMERO",
"Edif. El Portal": "NODO TURMERO",
"Urb. Vista Hermosa La Julia": "NODO MACARO",
"Guerrero de Chavez": "NODO PAYA",
"19 de Abril": "NODO MACARO"




};


const urbanismosAprobados = {
  "NODO MACARO": [
    "Villas El Carmen", "El Macaro", "Saman de Guere", "Villa Los Tamarindos",
    "Saman Tarazonero II", "La Casona II", "Saman Tarazonero I", "La Casona I",
    "Palmeras II", "La Macarena", "Isaac Oliveira", "La Magdalena",
    "El Paraiso", "San Sebastian", "Lascenio Guerrero", "Plaza Jardin",
    "Jabillar", "La Concepcion", "Simon Bolivar", "Palmeras I",
    "Santa Eduviges", "Villa De San Jose", "Salto Angel", "La Esperanza",
    "La Concepcion III", "La Julia", "Taguapire", "La Casona II Edificios",
    "Antonio Jose de Sucre", "Valle del Rosario", "Arturo Luis Berti",
    "La Casona I Edificios", "Narayola II", "Terrazas de Juan Pablo",
    "Guerito", "Leocolbo", "Los Caobos", "Santa Barbara",
    "18 de Septiembre", "Urb. Vista Hermosa La Julia", "19 de Abril"
  ],
  "NODO PAYA": [
    "Mata Caballo", "Pantin", "Rio Seco", "Durpa", "Paya Abajo", "Prados III",
    "Bicentenario", "Prados II", "Brisas de Paya", "Antigua Hacienda De Paya",
    "Ppal Paya", "Los Hornos", "Callejon Lim", "Antigua Hacienda De Paya II",
    "Vallecito", "Prados I", "Las Rurales", "Canaima", "Vista Hermosa",
    "Valle Verde", "Palma Real", "El Naranjal", "Terrazas de Paya",
    "La Arboleda", "Luz y Vida", "Los Mangos", "Callejon Los Jabillos",
    "Dios Es Mi Refugio", "Huerta Los Pajaros", "Betania", "1ro de Mayo Norte",
    "Payita", "Las Palmas", "1ro de Mayo Sur", "El Cambur", "La Orquidea",
    "Sector los Mangos", "El Bosque", "Callejon Rosales", "Prados",
    "Callejon 17", "Polvorin", "Guayabita", "La Marcelota", "Manirito",
    "Paraguatan", "La Guzman", "Guerrero de Chavez"
  ],
  "NODO TURMERO": [
    "Casco de Turmero", "Ezequiel Zamora", "Guanarito", "Tibisay Guevara",
    "San Pablo", "Valle Paraiso", "Prados de Cafetal", "La Floresta",
    "Villeguita", "Terrazas de Turmero", "Haras de San Pablo", "Laguna Plaza",
    "Villa Caribe", "Residencias Candys", "El Nispero", "Ciudad Bendita",
    "Residencias Mariño", "San Carlos", "Laguna II", "Marina Caribe",
    "La Montañita", "La Aduana", "Valle Fresco", "Calle Peñalver",
    "Los Nisperos", "La Montaña", "Valle lindo", "Edif. El Torreon",
    "Edif. El Portal", "Villas Del Sur"
  ]
};


/* =========================
   NORMALIZACIÓN ÚNICA
========================= */
const normalizeService = (s) => ({
  id: s.id,
  name: s.client_name,
  status: s.status_name,
  type: s.client_type_name,
  migrated: s.migrate ? "Migrado" : "No migrado",
  cycle: s.cycle ? String(s.cycle) : null,
  urbanismo: s.sector_name,
  agencia: sectorAgenciaMap[s.sector_name] || "SIN_AGENCIA",
  cost: Number(s.plan?.cost || 0),
  raw: s,
});

/* =========================
   MATCH UNIVERSAL
========================= */
const match = (value, selected) => {
  if (!selected || selected.length === 0) return true;
  if (selected.includes("Todos")) return true;
  return selected.includes(value);
};

/* =========================
   FILTRO PURO
========================= */
const applyFilters = (services, filters) =>
  services.filter((s) =>
    match(s.status, filters.status) &&
    match(s.type, filters.type) &&
    match(s.migrated, filters.migrated) &&
    match(s.cycle, filters.cycle) &&
    match(s.agencia, filters.agencia) &&
    match(s.urbanismo, filters.urbanismo)
  );

/* =========================
   MOTOR DE AGRUPACIÓN
========================= */
const groupByUrbanismo = (services) => {
  const map = {};

  services.forEach((s) => {
    if (!map[s.urbanismo]) {
      map[s.urbanismo] = {
        urbanismo: s.urbanismo,
        cantidadClientes: 0,
        ingresosTotales: 0,
        clientes: [],
      };
    }

    map[s.urbanismo].cantidadClientes += 1;
    map[s.urbanismo].ingresosTotales += s.cost;
    map[s.urbanismo].clientes.push(s.raw);
  });

  return Object.values(map).sort(
    (a, b) => b.ingresosTotales - a.ingresosTotales
  );
};

/* =========================
   COMPONENTE PRINCIPAL
========================= */
function TopUrbanismo() {
  const { showPasswordState, data, isLoading, error } =
    useContext(PasswordContext);

  const [TopUrb, setTopUrb] = useState([0, 3500]);
  const [estadosSeleccionados, setEstadosSeleccionados] = useState(["Activo"]);
  const [estadosSeleccionadosType, setEstadosSeleccionadosType] = useState(["Todos"]);
  const [migradosSeleccionados, setMigradosSeleccionados] = useState(["Todos"]);
  const [ciclosSeleccionados, setCiclosSeleccionados] = useState(["Todos"]);
  const [sectoresSeleccionados, setSectoresSeleccionados] = useState([]);
  const [urbanismosSeleccionados, setUrbanismosSeleccionados] = useState([]);

  const [topUrbanismos, setTopUrbanismos] = useState([]);
  const [totalClientesGlobal, setTotalClientesGlobal] = useState(0);
  const [totalIngresos, setTotalIngresos] = useState(0);
  const [handleGrafico2, setHandleGrafico2] = useState(false);

  /* =========================
     NORMALIZAR DATA (UNA VEZ)
  ========================= */
  const services = useMemo(() => {
    if (!data?.results) return [];
    return data.results
      .filter((s) => !s.client_name?.includes("PRUEBA"))
      .map(normalizeService);
  }, [data]);

  /* =========================
     FILTROS ACTIVOS
  ========================= */
  const filteredServices = useMemo(() => {
    return applyFilters(services, {
      status: estadosSeleccionados,
      type: estadosSeleccionadosType,
      migrated: migradosSeleccionados,
      cycle: ciclosSeleccionados,
      agencia: sectoresSeleccionados,
      urbanismo: urbanismosSeleccionados,
    });
  }, [
    services,
    estadosSeleccionados,
    estadosSeleccionadosType,
    migradosSeleccionados,
    ciclosSeleccionados,
    sectoresSeleccionados,
    urbanismosSeleccionados,
  ]);

  /* =========================
     CÁLCULOS PERFECTOS
  ========================= */
  useEffect(() => {
    const grouped = groupByUrbanismo(filteredServices);

    const sliced = grouped.slice(...TopUrb);
    const totalClientes = grouped.reduce(
      (acc, u) => acc + u.cantidadClientes,
      0
    );
    const totalIngresosCalc = grouped.reduce(
      (acc, u) => acc + u.ingresosTotales,
      0
    );

    setTopUrbanismos(sliced);
    setTotalClientesGlobal(totalClientes);
    setTotalIngresos(totalIngresosCalc);
  }, [filteredServices, TopUrb]);

  /* =========================
     UI
  ========================= */
  if (isLoading) return <div>Cargando...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <LogoTitulo />
      {showPasswordState ? (
        <>
          <h1>Inicia Sesión</h1>
          <LogingForm />
        </>
      ) : (
        <>
          <DropdownMenu />
          <PageNav />

          <div className="filtros-panel">
            <button className="button" onClick={() => setTopUrb([0, 10])}>
              Top 10
            </button>
            <button className="button" onClick={() => setTopUrb([0, 3500])}>
              Top Global
            </button>

            {/* TOTALES */}
            <button className="buttonIngreso">
              Total de clientes: {totalClientesGlobal}
            </button>

            <button className="buttonIngreso marginbutton">
              Total de Ingresos:{" "}
              {totalIngresos.toLocaleString("es-ES", {
                minimumFractionDigits: 2,
              })}
              $
            </button>

            <button
              className={!handleGrafico2 ? "button" : "buttonCerrar"}
              onClick={() => setHandleGrafico2(!handleGrafico2)}
            >
              {handleGrafico2 ? "Cerrar Gráficos" : "Abrir Gráficos"}
            </button>
          </div>

          {handleGrafico2 && <ChartComponent urbanismos={topUrbanismos} />}

          <div className="titulo-topurbanismos">
            <h3 className="h3">Top Urbanismos</h3>
          </div>

          <UrbanismoList urbanismos={topUrbanismos} />
        </>
      )}
    </div>
  );
}

/* =========================
   LISTADO
========================= */
function UrbanismoList({ urbanismos }) {
  const [mostrar, setMostrar] = useState({});

  return (
    <ul>
      {urbanismos.map((u, i) => (
        <li key={i} className="urbanismo-item">
          <strong>{i + 1}. {u.urbanismo}</strong>
          <p>Cantidad: {u.cantidadClientes}</p>
          <p>Ingreso: {Math.round(u.ingresosTotales)}$</p>

          <button
            className="mostrar-ocultar"
            onClick={() =>
              setMostrar((p) => ({ ...p, [i]: !p[i] }))
            }
          >
            {mostrar[i] ? "Ocultar" : "Mostrar"} clientes
          </button>

          {mostrar[i] && (
            <ul>
              {u.clientes.map((c, idx) => (
                <li key={idx}>
                  {c.client_name} – {c.status_name} – {c.plan?.cost}$
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}

export default TopUrbanismo;
