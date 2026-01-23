import React, { useState, useEffect } from "react";
import PageNav from "../../Componentes/PageNav";
import LogoTitulo from "../../Componentes/LogoTitulo";
import LogingForm from "../../Componentes/LogingForm";
import ChartComponent from "../../Componentes/ChartComponent";
import DropdownMenu from "./../../Componentes/DropdownMenu";
import * as XLSX from "xlsx";
import "./TopUrbanismo.css";

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
  // ... sigue igual
};

// Urbanismos aprobados por agencia
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

// Función para normalizar tipos de cliente
const normalizarTipoCliente = (tipoCliente) => {
  if (!tipoCliente) return "OTRO";
  const tipo = tipoCliente.toString().toUpperCase().trim();
  if (["RESIDENCIAL", "RESIDENCIALES"].includes(tipo)) return "RESIDENCIAL";
  if (["PYME", "PYMES"].includes(tipo)) return "PYME";
  if (tipo.includes("INTERCAMBIO")) return "INTERCAMBIO";
  if (["EMPLEADO", "EMPLEADOS"].includes(tipo)) return "EMPLEADO";
  if (["GRATIS", "CORTESIA"].includes(tipo)) return "GRATIS";
  return "OTRO";
};

function TopUrbanismo() {
  const [contracts, setContracts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [TopUrb, setTopUrb] = useState([0, 3500]);
  const [estadosSeleccionados, setEstadosSeleccionados] = useState(["Activo"]);
  const [estadosSeleccionadosType, setEstadosSeleccionadosType] = useState(["Todos"]);
  const [totalIngresos, setTotalIngresos] = useState(0);
  const [topUrbanismos, setTopUrbanismos] = useState([]);
  const [totalClientesGlobal, setTotalClientesGlobal] = useState(0);
  const [handleGrafico2, setHandleGrafico2] = useState(false);
  const [migradosSeleccionados, setMigradosSeleccionados] = useState(["Todos"]);
  const [ciclosSeleccionados, setCiclosSeleccionados] = useState(["Todos"]);
  const [sectoresSeleccionados, setSectoresSeleccionados] = useState([]);
  const [urbanismosSeleccionados, setUrbanismosSeleccionados] = useState([]);

  // Botones Top
  const handleTop10Urb = () => setTopUrb([0, 10]);
  const handleTopUrb = () => setTopUrb([0, 3500]);
  const toggleGraficos = () => setHandleGrafico2(!handleGrafico2);

  // Filtros
  const handleSectoresChange = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions, (o) => o.value);
    setSectoresSeleccionados(selectedOptions);
    setUrbanismosSeleccionados([]);
  };
  const handleMigradosChange = (e) => setMigradosSeleccionados(Array.from(e.target.selectedOptions, (o) => o.value));
  const handleEstadoChange = (e) => setEstadosSeleccionados(Array.from(e.target.selectedOptions, (o) => o.value));
  const handleEstadoChange2 = (e) => setEstadosSeleccionadosType(Array.from(e.target.selectedOptions, (o) => o.value));
  const handleCiclosChange = (e) => setCiclosSeleccionados(Array.from(e.target.selectedOptions, (o) => o.value));

  // Descarga Excel
  const handleDownloadExcel = () => {
    const workbook = XLSX.utils.book_new();
    const hoy = new Date();

    const calcularDiasHabiles = (fechaInicio, fechaFin) => {
      let count = 0;
      let current = new Date(fechaInicio);
      while (current <= fechaFin) {
        const day = current.getDay();
        if (day !== 0 && day !== 6) count++;
        current.setDate(current.getDate() + 1);
      }
      return count;
    };

    const worksheetData = topUrbanismos.flatMap((urbanismo) =>
      urbanismo.clientes.map((cliente, idx) => {
        const created_at = cliente.created_at ? new Date(cliente.created_at) : null;
        const diasHabiles = created_at ? calcularDiasHabiles(created_at, hoy) : "";
        return {
          "N° Cliente": idx + 1,
          id: cliente.id,
          Cliente: `${cliente.name} ${cliente.last_name}`,
          Teléfono: cliente.mobile,
          Dirección: cliente.address_tax,
          Urbanismo: cliente.sector_name,
          Cedula: cliente.identification,
          IP: cliente?.service?.ip || "",
          MAC: cliente?.service?.mac || "",
          "Fecha_Creación": cliente.created_at?.slice(0, 10),
          "Días Hábiles": diasHabiles,
          Tipo_Cliente: normalizarTipoCliente(cliente.client_type_name),
          plan: `${cliente.plan_name || "N/A"} (${cliente.plan?.cost || "0"}$)`,
        };
      })
    );

    worksheetData.sort((a, b) => b["Días Hábiles"] - a["Días Hábiles"]);
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const columnWidths = worksheetData.reduce((acc, row) => {
      Object.keys(row).forEach((key, idx) => {
        const cellValue = String(row[key]);
        acc[idx] = Math.max(acc[idx] || 0, cellValue.length);
      });
      return acc;
    }, []);
    worksheet["!cols"] = columnWidths.map((w) => ({ wpx: w * 6 }));
    XLSX.utils.book_append_sheet(workbook, worksheet, "Clientes por Urbanismo");
    const estadoSeleccionado = estadosSeleccionados.join("_");
    XLSX.writeFile(workbook, `listado_de_clientes_${estadoSeleccionado}.xlsx`);
  };

  // Fetch API
  useEffect(() => {
    const API_KEY = 'aZ9LKg3WxYnpF8TbCUl7qrEJ4hdvPT1oBm6eNAi0vXyQGCsZTR';
    const BASE_URL = 'https://api.sisprotgf.com/api/public/contracts/';
    const headers = { 'X-API-KEY': API_KEY, 'Accept': 'application/json' };
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const fetchContracts = async () => {
      try {
        let allContracts = [];
        let page = 1;
        while (true) {
          let success = false;
          let response = null;
          while (!success) {
            try {
              const res = await fetch(`${BASE_URL}?page=${page}&remove_pagination=true&n8n=true`, { headers });
              if (res.status === 429) { await sleep(1100); continue; }
              response = await res.json();
              success = true;
            } catch (err) {
              console.error("Error fetch:", err);
              throw err;
            }
          }

          let batch = [];
          if (Array.isArray(response)) batch = response;
          else if (response?.results) batch = response.results;
          else if (response?.data) batch = response.data;

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

  // Filtrado y cálculo Top Urbanismos
  useEffect(() => {
    if (!contracts || contracts.length === 0) return;

    const clientesSinPrueba = contracts.filter(c => !`${c.name}${c.last_name}`.includes("PRUEBA"));

    const urbanismosTotales = clientesSinPrueba.reduce((acc, c) => {
      if (!c.sector_name) return acc;
      if (!acc[c.sector_name]) {
        acc[c.sector_name] = {
          cantidadClientes: 1,
          ingresosTotales: parseFloat(c.plan?.cost || 0),
          estado: c.status_name,
          tipoNormalizado: normalizarTipoCliente(c.client_type_name),
          clientes: [c],
        };
      } else {
        acc[c.sector_name].cantidadClientes++;
        acc[c.sector_name].ingresosTotales += parseFloat(c.plan?.cost || 0);
        acc[c.sector_name].clientes.push(c);
      }
      return acc;
    }, {});

    const urbanismosArray = Object.keys(urbanismosTotales).map(k => ({
      urbanismo: k,
      ...urbanismosTotales[k],
    })).sort((a,b)=>b.ingresosTotales - a.ingresosTotales);

    setTopUrbanismos(urbanismosArray.slice(...TopUrb));
    setTotalIngresos(urbanismosArray.reduce((sum, u) => sum + u.ingresosTotales,0));
    setTotalClientesGlobal(urbanismosArray.reduce((sum, u) => sum + u.cantidadClientes,0));

  }, [contracts, TopUrb, estadosSeleccionados, estadosSeleccionadosType, migradosSeleccionados, ciclosSeleccionados, sectoresSeleccionados, urbanismosSeleccionados]);

  if (isLoading) return <div>Cargando...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <LogoTitulo />
      <DropdownMenu />
      <PageNav />

      {/* Panel de filtros y botones */}
      {/* … aquí puedes dejar todo el JSX de filtros igual que tu código anterior … */}
      <button className="buttonDescargar" onClick={handleDownloadExcel}>Descargar Excel</button>

      {handleGrafico2 && <ChartComponent urbanismos={topUrbanismos} />}
      <div className="titulo-topurbanismos">
        <h3 className="h3">Top Urbanismos</h3>
      </div>
      <UrbanismoList urbanismos={topUrbanismos} />
    </div>
  );
}

function UrbanismoList({ urbanismos }) {
  const [mostrarLista, setMostrarLista] = useState({});
  const toggleMostrarLista = (index) => setMostrarLista(prev => ({ ...prev, [index]: !prev[index] }));

  return (
    <ul>
      {urbanismos.map((u, idx)=>(
        <li key={idx} className="urbanismo-item encabezados">
          <span className="urbanismo-nombre">{idx+1}. {u.urbanismo}</span>
          <div className="encabezados">
            <span><strong>Cantidad de Clientes:</strong> {u.cantidadClientes}</span>
            {!["Cancelado","Gratis"].includes(u.estado) && <span><strong>Ingreso total:</strong> {Math.round(u.ingresosTotales)}$</span>}
          </div>
          <button onClick={()=>toggleMostrarLista(idx)}>{mostrarLista[idx]?"Ocultar Lista":"Mostrar Lista"}</button>
          {mostrarLista[idx] && (
            <ul className="lista-clientes">
              {u.clientes.map((c,i)=>(
                <li key={i}>
                  <p><strong>Nombre:</strong> {c.name} {c.last_name}</p>
                  <p><strong>Estado:</strong> {c.status_name}</p>
                  <p><strong>Tipo:</strong> {c.client_type_name}</p>
                  <p><strong>Sector:</strong> {c.sector_name}</p>
                  <p><strong>Plan:</strong> {c.plan_name} (${c.plan?.cost})</p>
                  <p><strong>Teléfono:</strong> {c.mobile}</p>
                  <p><strong>Ciclo:</strong> {c.cycle}</p>
                  <p><strong>Dirección:</strong> {c.address_tax}</p>
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
