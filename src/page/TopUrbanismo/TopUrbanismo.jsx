import React, { useState, useEffect } from "react";
import PageNav from "../../Componentes/PageNav";
import LogoTitulo from "../../Componentes/LogoTitulo";
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

// Urbanismos aprobados
const urbanismosAprobados = {
  "NODO MACARO": [
    "Villas El Carmen","El Macaro","Saman de Guere","Villa Los Tamarindos",
    "Saman Tarazonero II","La Casona II","Saman Tarazonero I","La Casona I",
    "Palmeras II","La Macarena","Isaac Oliveira","La Magdalena","El Paraiso",
    "San Sebastian","Lascenio Guerrero","Plaza Jardin","Jabillar","La Concepcion",
    "Simon Bolivar","Palmeras I","Santa Eduviges","Villa De San Jose","Salto Angel",
    "La Esperanza","La Concepcion III","La Julia","Taguapire","La Casona II Edificios",
    "Antonio Jose de Sucre","Valle del Rosario","Arturo Luis Berti","La Casona I Edificios",
    "Narayola II","Terrazas de Juan Pablo","Guerito","Leocolbo","Los Caobos",
    "Santa Barbara","18 de Septiembre","Urb. Vista Hermosa La Julia","19 de Abril"
  ],
  "NODO PAYA": [
    "Mata Caballo","Pantin","Rio Seco","Durpa","Paya Abajo","Prados III","Bicentenario",
    "Prados II","Brisas de Paya","Antigua Hacienda De Paya","Ppal Paya","Los Hornos",
    "Callejon Lim","Antigua Hacienda De Paya II","Vallecito","Prados I","Las Rurales",
    "Canaima","Vista Hermosa","Valle Verde","Palma Real","El Naranjal","Terrazas de Paya",
    "La Arboleda","Luz y Vida","Los Mangos","Callejon Los Jabillos","Dios Es Mi Refugio",
    "Huerta Los Pajaros","Betania","1ro de Mayo Norte","Payita","Las Palmas","1ro de Mayo Sur",
    "El Cambur","La Orquidea","Sector los Mangos","El Bosque","Callejon Rosales","Prados",
    "Callejon 17","Polvorin","Guayabita","La Marcelota","Manirito","Paraguatan","La Guzman",
    "Guerrero de Chavez"
  ],
  "NODO TURMERO": [
    "Casco de Turmero","Ezequiel Zamora","Guanarito","Tibisay Guevara","San Pablo","Valle Paraiso",
    "Prados de Cafetal","La Floresta","Villeguita","Terrazas de Turmero","Haras de San Pablo",
    "Laguna Plaza","Villa Caribe","Residencias Candys","El Nispero","Ciudad Bendita",
    "Residencias Mariño","San Carlos","Laguna II","Marina Caribe","La Montañita","La Aduana",
    "Valle Fresco","Calle Peñalver","Los Nisperos","La Montaña","Valle lindo","Edif. El Torreon",
    "Edif. El Portal","Villas Del Sur"
  ]
};

// Función para normalizar tipos de cliente
const normalizarTipoCliente = (tipoCliente) => {
  if (!tipoCliente) return "OTRO";
  const tipo = tipoCliente.toString().toUpperCase().trim();
  if (tipo === "RESIDENCIAL" || tipo === "RESIDENCIALES") return "RESIDENCIAL";
  if (tipo === "PYME" || tipo === "PYMES") return "PYME";
  if (tipo === "INTERCAMBIO") return "INTERCAMBIO";
  if (tipo === "EMPLEADO" || tipo === "EMPLEADOS") return "EMPLEADO";
  if (tipo === "GRATIS") return "GRATIS";
  if (tipo.includes("RESIDENCIAL")) return "RESIDENCIAL";
  if (tipo.includes("PYME")) return "PYME";
  if (tipo.includes("EMPLEADO")) return "EMPLEADO";
  if (tipo.includes("GRATIS") || tipo.includes("CORTESIA")) return "GRATIS";
  if (tipo.includes("INTERCAMBIO")) return "INTERCAMBIO";
  return "OTRO";
};

function TopUrbanismo() {
  // States
  const [contracts, setContracts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [TopUrb, setTopUrb] = useState([0, 3500]);
  const [estadosSeleccionados, setEstadosSeleccionados] = useState(["Activo"]);
  const [estadosSeleccionadosType, setEstadosSeleccionadosType] = useState(["Todos"]);
  const [migradosSeleccionados, setMigradosSeleccionados] = useState(["Todos"]);
  const [ciclosSeleccionados, setCiclosSeleccionados] = useState(["Todos"]);
  const [sectoresSeleccionados, setSectoresSeleccionados] = useState([]);
  const [urbanismosSeleccionados, setUrbanismosSeleccionados] = useState([]);

  const [topUrbanismos, setTopUrbanismos] = useState([]);
  const [totalIngresos, setTotalIngresos] = useState(0);
  const [totalClientesGlobal, setTotalClientesGlobal] = useState(0);
  const [handleGrafico2, setHandleGrafico2] = useState(false);

  // Fetch Contracts
  useEffect(() => {
    const API_KEY = 'aZ9LKg3WxYnpF8TbCUl7qrEJ4hdvPT1oBm6eNAi0vXyQGCsZTR';
    const BASE_URL = 'https://api.sisprotgf.com/api/public/contracts/';
    const headers = { 'X-API-KEY': API_KEY, 'Accept': 'application/json' };
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const fetchContracts = async () => {
      let allContracts = [];
      let page = 1;

      try {
        while (true) {
          let response;
          let success = false;

          while (!success) {
            try {
              const res = await fetch(`${BASE_URL}?page=${page}&remove_pagination=true&n8n=true`, { headers });
              if (res.status === 429) {
                await sleep(1100);
                continue;
              }
              response = await res.json();
              success = true;
            } catch (err) {
              console.error('Fetch error', err);
              throw err;
            }
          }

          let batch = [];
          if (Array.isArray(response)) batch = response;
          else if (response?.results && Array.isArray(response.results)) batch = response.results;
          else if (response?.data && Array.isArray(response.data)) batch = response.data;

          if (!batch || batch.length === 0) break;

          allContracts.push(...batch);
          if (batch.length < 10) break;
          page++;
          await sleep(1100);
        }

        setContracts(allContracts);
        setIsLoading(false);
      } catch (err) {
        setError(err);
        setIsLoading(false);
      }
    };

    fetchContracts();
  }, []);

  // Aquí va la lógica de filtros y cálculo (igual que antes) usando `contracts`
  useEffect(() => {
    if (!contracts || contracts.length === 0) return;

    const clientesSinPrueba = contracts.filter(s => !s.client_name.includes("PRUEBA"));

    // Filtrado y cálculo
    const urbanismosTotales = clientesSinPrueba
      .filter((servicio) => {
        // 1. Estado
        const estadoFiltrado = estadosSeleccionados.includes("Todos") || estadosSeleccionados.includes(servicio.status_name);
        if (!estadoFiltrado) return false;

        // 2. Tipo de cliente
        const tipoFiltrado = estadosSeleccionadosType.includes("Todos") || 
          estadosSeleccionadosType.some(tipo => normalizarTipoCliente(servicio.client_type_name) === tipo.toUpperCase());
        if (!tipoFiltrado) return false;

        // 3. Migrados
        const migradoFiltrado = migradosSeleccionados.includes("Todos") || migradosSeleccionados.includes(servicio.migrate ? "Migrado" : "No migrado");
        if (!migradoFiltrado) return false;

        // 4. Ciclo
        const cicloFiltrado = ciclosSeleccionados.includes("Todos") || ciclosSeleccionados.includes(servicio.cycle?.toString() || "");
        if (!cicloFiltrado) return false;

        // 5. Sector/Agencia
        const sectorFiltrado = sectoresSeleccionados.length === 0 || sectoresSeleccionados.includes("Todos") ||
          (servicio.sector_name && sectoresSeleccionados.includes(sectorAgenciaMap[servicio.sector_name]));
        if (!sectorFiltrado) return false;

        // 6. Urbanismo
        const urbanismoFiltrado = urbanismosSeleccionados.length === 0 || urbanismosSeleccionados.includes("Todos") ||
          (servicio.sector_name && urbanismosSeleccionados.includes(servicio.sector_name));
        if (!urbanismoFiltrado) return false;

        return true;
      })
      .reduce((acc, curr) => {
        if (!curr.sector_name) return acc;
        if (!acc[curr.sector_name]) {
          acc[curr.sector_name] = {
            cantidadClientes: 1,
            ingresosTotales: parseFloat(curr.plan?.cost || 0),
            estado: curr.status_name,
            tipoNormalizado: normalizarTipoCliente(curr.client_type_name),
            clientes: [curr],
          };
        } else {
          acc[curr.sector_name].cantidadClientes++;
          acc[curr.sector_name].ingresosTotales += parseFloat(curr.plan?.cost || 0);
          acc[curr.sector_name].clientes.push(curr);
        }
        return acc;
      }, {});

    const urbanismosTotalesArray = Object.keys(urbanismosTotales).map((sector) => ({
      urbanismo: sector,
      ...urbanismosTotales[sector],
    }));

    urbanismosTotalesArray.sort((a, b) => b.ingresosTotales - a.ingresosTotales);

    setTopUrbanismos(urbanismosTotalesArray.slice(...TopUrb));
    setTotalIngresos(urbanismosTotalesArray.reduce((acc, curr) => acc + curr.ingresosTotales, 0));
    setTotalClientesGlobal(urbanismosTotalesArray.reduce((acc, curr) => acc + curr.cantidadClientes, 0));
  }, [contracts, TopUrb, estadosSeleccionados, estadosSeleccionadosType, migradosSeleccionados, ciclosSeleccionados, sectoresSeleccionados, urbanismosSeleccionados]);

  // Descargar Excel
  const descargarExcel = () => {
    const ws = XLSX.utils.json_to_sheet(topUrbanismos.map(tu => ({
      Urbanismo: tu.urbanismo,
      Clientes: tu.cantidadClientes,
      Ingresos: tu.ingresosTotales.toFixed(2),
      Estado: tu.estado,
      TipoCliente: tu.tipoNormalizado
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Top Urbanismos");
    XLSX.writeFile(wb, "TopUrbanismos.xlsx");
  };

  if (isLoading) return <div>Cargando datos...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="contenedor">
      <LogoTitulo />
      <PageNav />
      <div className="filtros">
        <DropdownMenu
          label="Estados"
          options={["Todos","Activo","Suspendido","Cancelado","Pausado","Por instalar"]}
          selected={estadosSeleccionados}
          setSelected={setEstadosSeleccionados}
        />
        <DropdownMenu
          label="Tipo Cliente"
          options={["Todos","RESIDENCIAL","PYME","INTERCAMBIO","EMPLEADO","GRATIS","OTRO"]}
          selected={estadosSeleccionadosType}
          setSelected={setEstadosSeleccionadosType}
        />
        <DropdownMenu
          label="Migrado"
          options={["Todos","Migrado","No migrado"]}
          selected={migradosSeleccionados}
          setSelected={setMigradosSeleccionados}
        />
        <DropdownMenu
          label="Ciclos"
          options={["Todos",...Array.from({length:36},(_,i)=>i+1)]}
          selected={ciclosSeleccionados}
          setSelected={setCiclosSeleccionados}
        />
        <DropdownMenu
          label="Sectores"
          options={["Todos",...Object.values(sectorAgenciaMap).filter((v,i,a)=>a.indexOf(v)===i)]}
          selected={sectoresSeleccionados}
          setSelected={setSectoresSeleccionados}
        />
        <DropdownMenu
          label="Urbanismos"
          options={["Todos",...Object.keys(sectorAgenciaMap)]}
          selected={urbanismosSeleccionados}
          setSelected={setUrbanismosSeleccionados}
        />
      </div>

      <ChartComponent data={topUrbanismos} />
      <div className="totales">
        <p>Total Ingresos: ${totalIngresos.toFixed(2)}</p>
        <p>Total Clientes: {totalClientesGlobal}</p>
      </div>
      <button onClick={descargarExcel}>Descargar Excel</button>

      <div className="listado-clientes">
        {topUrbanismos.map((u, idx) => (
          <div key={idx}>
            <h4>{u.urbanismo} ({u.cantidadClientes} clientes)</h4>
            <ul>
              {u.clientes.map((c, i) => (
                <li key={i}>{c.client_name} - {c.plan?.name || "Sin plan"} - ${c.plan?.cost || 0}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TopUrbanismo;
