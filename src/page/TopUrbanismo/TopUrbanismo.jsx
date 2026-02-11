// TopUrbanismo.jsx
import React, { useState, useEffect, useContext, useCallback } from "react";
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

const tiposClienteValidos = ["PYME", "RESIDENCIAL", "INTERCAMBIO", "EMPLEADO", "GRATIS"];

function TopUrbanismo() {
  const { showPasswordState, data, isLoading, error } = useContext(PasswordContext);

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
  const [contratoBuscado, setContratoBuscado] = useState("");
  const [clientesPorContrato, setClientesPorContrato] = useState([]);
  const [modoBusquedaContrato, setModoBusquedaContrato] = useState(false);
  const [serviciosParaExportar, setServiciosParaExportar] = useState([]);

  const handleTop10Urb = () => setTopUrb([0, 10]);
  const handleTopUrb = () => setTopUrb([0, 3500]);

  const handleSectoresChange = (event) => {
    const selectedOptions = Array.from(event.target.selectedOptions, (option) => option.value);
    setSectoresSeleccionados(selectedOptions);
    setUrbanismosSeleccionados([]);
  };

  const handleMigradosChange = (event) => {
    const selectedOptions = Array.from(event.target.selectedOptions, (option) => option.value);
    setMigradosSeleccionados(selectedOptions);
  };

  const handleEstadoChange = (event) => {
    const selectedOptions = Array.from(event.target.selectedOptions, (option) => option.value);
    setEstadosSeleccionados(selectedOptions);
  };

  const toggleGraficos = () => setHandleGrafico2(!handleGrafico2);

  const handleEstadoChange2 = (event) => {
    const selectedOptions2 = Array.from(event.target.selectedOptions, (option) => option.value);
    setEstadosSeleccionadosType(selectedOptions2);
  };

  const handleCiclosChange = (event) => {
    const selectedOptions = Array.from(event.target.selectedOptions, (option) => option.value);
    setCiclosSeleccionados(selectedOptions);
  };

  const buscarPorContrato = () => {
    if (!contratoBuscado) return;

    const resultado = data.results.filter(
      (cliente) => String(cliente.id) === String(contratoBuscado)
    );

    setClientesPorContrato(resultado);
    setModoBusquedaContrato(true);
  };

  const handleDownloadExcel = () => {
    const workbook = XLSX.utils.book_new();

    function calcularDiasHabiles(fechaInicio, fechaFin) {
      let count = 0;
      let current = new Date(fechaInicio);

      while (current <= fechaFin) {
        const day = current.getDay();
        if (day !== 0 && day !== 6) count++;
        current.setDate(current.getDate() + 1);
      }
      return count;
    }

    const hoy = new Date();

    const worksheetData = serviciosParaExportar.map((cliente) => {
      const service = cliente.service_detail || {};
      const created_at_raw = cliente.created_at || "";
      const created_at = created_at_raw ? new Date(created_at_raw) : null;
      const diasHabiles = created_at ? calcularDiasHabiles(created_at, hoy) : "";

      return {
        "Contrato": cliente.id,
        Cliente: cliente.client_name,
        "Teléfono": cliente.client_mobile,
        "Dirección": cliente.address,
        Urbanismo: cliente.sector_name || "",
        "Migrado": cliente.migrate ? "Migrado" : "No migrado",
        "Ciclo": cliente.cycle || "",
        "Cedula": cliente.client_identification,
        IP: service.ip || "",
        MAC: service.mac || "",
        "Fecha_Creación": created_at_raw ? created_at_raw.slice(0, 10) : "",
        "Días Hábiles": diasHabiles,
        Tipo_Cliente: cliente.client_type_name,
        plan: `${cliente.plan?.name || "N/A"} (${cliente.plan?.cost || "0"}$)`,
      };
    });

    worksheetData.sort((a, b) => (b["Días Hábiles"] || 0) - (a["Días Hábiles"] || 0));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);

    const columnWidths = worksheetData.reduce((acc, row) => {
      Object.keys(row).forEach((key, idx) => {
        const cellValue = String(row[key]);
        const currentWidth = acc[idx] || 0;
        acc[idx] = Math.max(currentWidth, cellValue.length);
      });
      return acc;
    }, []);

    worksheet["!cols"] = columnWidths.map((width) => ({ wpx: width * 6 }));
    XLSX.utils.book_append_sheet(workbook, worksheet, "Clientes por Urbanismo");

    const estadoSeleccionado = estadosSeleccionados.join("_");
    const nombreArchivo = `listado_de_clientes_${estadoSeleccionado}.xlsx`;

    XLSX.writeFile(workbook, nombreArchivo);
  };

  const extraerTipoDeSubdivision = useCallback((subdivision) => {
    if (!subdivision) return null;
    const partes = subdivision.split("_");
    if (partes.length >= 2 && partes[1]) return partes[1].toUpperCase();
    return "DESCONOCIDO";
  }, []);

  const pasaFiltros = useCallback((servicio) => {
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
          tipoServicio = servicio.client_type_name.trim().toUpperCase();
        }
        if (!tipoServicio) return false;

        return tipoServicio === tipoSeleccionado.trim().toUpperCase();
      });
    }

    if (!tipoFiltrado) return false;

    let estadoFiltrado = false;

    if (estadosSeleccionados.includes("Todos")) {
      estadoFiltrado = true;
    } else {
      estadoFiltrado = estadosSeleccionados.some((estadoSeleccionado) => {
        if (estadoSeleccionado === "Todos") return false;
        const estadoBuscado = estadoSeleccionado.toUpperCase();

        if (servicio.client_subdivision && servicio.client_subdivision !== "") {
          return servicio.client_subdivision.includes(estadoBuscado);
        } else if (servicio.status_name) {
          return servicio.status_name.toLowerCase() === estadoSeleccionado.toLowerCase();
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
      ciclosSeleccionados.includes(String(servicio.cycle));
    if (!cicloFiltrado) return false;

    const sectorFiltrado =
      sectoresSeleccionados.length === 0 ||
      sectoresSeleccionados.includes("Todos") ||
      (servicio.sector_name &&
        sectorAgenciaMap[servicio.sector_name] &&
        sectoresSeleccionados.includes(sectorAgenciaMap[servicio.sector_name]));
    if (!sectorFiltrado) return false;

    const urbanismoFiltrado =
      urbanismosSeleccionados.length === 0 ||
      urbanismosSeleccionados.includes("Todos") ||
      (servicio.sector_name && urbanismosSeleccionados.includes(servicio.sector_name));

    return urbanismoFiltrado;
  }, [
    estadosSeleccionados,
    estadosSeleccionadosType,
    migradosSeleccionados,
    ciclosSeleccionados,
    sectoresSeleccionados,
    urbanismosSeleccionados,
    extraerTipoDeSubdivision
  ]);

  const pasaFiltroTotales = useCallback((servicio) => {
    let estadoFiltrado = false;

    if (estadosSeleccionados.includes("Todos")) {
      estadoFiltrado = true;
    } else {
      estadoFiltrado = estadosSeleccionados.some((estadoSeleccionado) => {
        if (estadoSeleccionado === "Todos") return false;
        const estadoBuscado = estadoSeleccionado.toUpperCase();

        if (servicio.client_subdivision && servicio.client_subdivision !== "") {
          const contieneEstado = servicio.client_subdivision.includes(estadoBuscado);

          if (contieneEstado) {
            const tipoServicio = extraerTipoDeSubdivision(servicio.client_subdivision);
            const tipoEsValido = tipoServicio && tiposClienteValidos.includes(tipoServicio);

            if (!tipoEsValido && estadoSeleccionado === "Activo") {
              console.log("DEBUG - Cliente con tipo no valido:", {
                nombre: servicio.client_name,
                subdivision: servicio.client_subdivision,
                tipoExtraido: tipoServicio,
                tipoEsValido: tipoEsValido
              });
            }
          }

          return contieneEstado;
        } else if (servicio.status_name) {
          return servicio.status_name.toLowerCase() === estadoSeleccionado.toLowerCase();
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
      ciclosSeleccionados.includes(servicio.cycle ? servicio.cycle.toString() : "");
    if (!cicloFiltrado) return false;

    const sectorFiltrado =
      sectoresSeleccionados.length === 0 ||
      sectoresSeleccionados.includes("Todos") ||
      (servicio.sector_name && sectoresSeleccionados.includes(sectorAgenciaMap[servicio.sector_name]));
    if (!sectorFiltrado) return false;

    const urbanismoFiltrado =
      urbanismosSeleccionados.length === 0 ||
      urbanismosSeleccionados.includes("Todos") ||
      (servicio.sector_name && urbanismosSeleccionados.includes(servicio.sector_name));

    return urbanismoFiltrado;
  }, [
    estadosSeleccionados,
    migradosSeleccionados,
    ciclosSeleccionados,
    sectoresSeleccionados,
    urbanismosSeleccionados,
    extraerTipoDeSubdivision
  ]);

  useEffect(() => {
    if (!data) return;

    const usarPasaFiltros = estadosSeleccionadosType.includes("Todos")
      ? pasaFiltroTotales
      : pasaFiltros;

    const serviciosFiltrados = data.results.filter((servicio) => usarPasaFiltros(servicio));
    setServiciosParaExportar(serviciosFiltrados);

    const totalClientes = serviciosFiltrados.filter(
      (s) => s.client_subdivision || s.status_name
    ).length;

    const ingresosTotales = serviciosFiltrados.reduce((acc, curr) => {
      const costoPlan = parseFloat(curr.plan?.cost || 0);
      return acc + costoPlan;
    }, 0);

    setTotalClientesGlobal(totalClientes);
    setTotalIngresos(ingresosTotales);

    const urbanismosTotales = serviciosFiltrados.reduce((acc, curr) => {
      if (!curr.sector_name) return acc;

      if (!acc[curr.sector_name]) {
        acc[curr.sector_name] = {
          cantidadClientes: 1,
          ingresosTotales: parseFloat(curr.plan?.cost || 0),
          estado: curr.status_name,
          tipo: curr.client_type_name,
          clientes: [curr]
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
      ...urbanismosTotales[sector]
    }));

    urbanismosTotalesArray.sort((a, b) => b.ingresosTotales - a.ingresosTotales);

    const topUrbanismosCalculados = urbanismosTotalesArray.slice(...TopUrb);
    setTopUrbanismos(topUrbanismosCalculados);
  }, [
    data,
    TopUrb,
    estadosSeleccionados,
    estadosSeleccionadosType,
    migradosSeleccionados,
    ciclosSeleccionados,
    sectoresSeleccionados,
    urbanismosSeleccionados,
    pasaFiltros,
    pasaFiltroTotales,
    extraerTipoDeSubdivision
  ]);

  if (isLoading) return <div>Cargando...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="contenedor">
      <LogoTitulo />
      {showPasswordState ? (
        <>
          <h1>Inicia Sesion</h1>
          <LogingForm />
        </>
      ) : (
        <>
          <DropdownMenu />
          <PageNav />

          <div className="filtros-panel">
            <div className="busqueda-contrato">
              <input
                type="number"
                placeholder="Numero de contrato"
                value={contratoBuscado}
                onChange={(e) => setContratoBuscado(e.target.value)}
              />
              <button className="button" onClick={buscarPorContrato}>
                Buscar
              </button>
            </div>

            <div>
              <button className="button" onClick={handleTop10Urb}>Top 10</button>
              <button className="button" onClick={handleTopUrb}>Top Global</button>
            </div>

            <select
              id="estadoSelect"
              size="5"
              multiple
              value={estadosSeleccionados}
              onChange={handleEstadoChange}
            >
              <option value="Todos">Todos</option>
              <option value="Activo">Activos</option>
              <option value="Suspendido">Suspendidos</option>
              <option value="Por instalar">Por instalar</option>
              <option value="Pausado">Pausado</option>
              <option value="Cancelado">Cancelados</option>
            </select>

            <select
              id="estadoSelect2"
              size="5"
              multiple
              value={estadosSeleccionadosType}
              onChange={handleEstadoChange2}
            >
              <option value="Todos">Tipo de Cliente / Todos</option>
              <option value="PYME">Pyme</option>
              <option value="RESIDENCIAL">Residenciales</option>
              <option value="INTERCAMBIO">Intercambio</option>
              <option value="EMPLEADO">Empleado</option>
              <option value="GRATIS">Gratis</option>
            </select>

            <select
              id="migradosSelect"
              size="2"
              multiple
              value={migradosSeleccionados}
              onChange={handleMigradosChange}
            >
              <option value="Todos">Todos</option>
              <option value="Migrado">Migrados</option>
              <option value="No migrado">No migrados</option>
            </select>

            <select
              id="ciclosSelect"
              size="3"
              multiple
              value={ciclosSeleccionados}
              onChange={handleCiclosChange}
            >
              <option value="Todos">Todos</option>
              <option value="15">Ciclo 15</option>
              <option value="25">Ciclo 25</option>
            </select>

            <select
              id="sectoresSelect"
              size="5"
              multiple
              value={sectoresSeleccionados}
              onChange={handleSectoresChange}
            >
              <option value="Todos">Todas las agencias</option>
              <option value="NODO PAYA">AGENCIA PAYA</option>
              <option value="NODO TURMERO">AGENCIA TURMERO</option>
              <option value="NODO MACARO">AGENCIA MACARO</option>
            </select>

            <select
              id="urbanismosSelect"
              size="5"
              multiple
              value={urbanismosSeleccionados}
              onChange={(e) =>
                setUrbanismosSeleccionados(
                  Array.from(e.target.selectedOptions, (option) => option.value)
                )
              }
            >
              <option value="Todos">Todos los urbanismos</option>
              {sectoresSeleccionados.map((sector) =>
                urbanismosAprobados[sector]?.map((urbanismo) => (
                  <option key={urbanismo} value={urbanismo}>
                    {urbanismo}
                  </option>
                ))
              )}
            </select>

            <button className="buttonIngreso">
              Total de clientes: {totalClientesGlobal}
            </button>

            <button className="buttonIngreso marginbutton">
              {estadosSeleccionados.includes("Cancelado")
                ? `Total de Perdida: ${totalIngresos.toLocaleString("es-ES", { minimumFractionDigits: 2 })}$`
                : `Total de Ingresos: ${totalIngresos.toLocaleString("es-ES", { minimumFractionDigits: 2 })}$`}
            </button>

            <button
              className={!handleGrafico2 ? "button" : "buttonCerrar"}
              onClick={toggleGraficos}
            >
              {handleGrafico2 ? "Cerrar Graficos" : "Abrir Graficos"}
            </button>

            <button className="buttonDescargar" onClick={handleDownloadExcel}>
              Descargar Excel
            </button>
          </div>

          {handleGrafico2 && <ChartComponent urbanismos={topUrbanismos} />}

          <div className="titulo-topurbanismos">
            <h3 className="h3">Top Urbanismos</h3>
          </div>

          {modoBusquedaContrato ? (
            <UrbanismoList
              urbanismos={[
                {
                  urbanismo: "Resultado de busqueda",
                  cantidadClientes: clientesPorContrato.length,
                  ingresosTotales: clientesPorContrato.reduce(
                    (acc, c) => acc + Number(c.plan?.cost || 0),
                    0
                  ),
                  clientes: clientesPorContrato
                }
              ]}
            />
          ) : (
            <UrbanismoList urbanismos={topUrbanismos} />
          )}
        </>
      )}
    </div>
  );
}

function UrbanismoList({ urbanismos }) {
  const [urbanismoAbierto, setUrbanismoAbierto] = useState(null);

  const toggleMostrarLista = (index) => {
    setUrbanismoAbierto((prev) => (prev === index ? null : index));
  };

  return (
    <ul className="urbanismos-grid">
      {urbanismos.map((urbanismo, index) => (
        <li
          className={`urbanismo-item ${urbanismoAbierto === index ? "expanded" : ""}`}
          key={index}
        >
          <div className="card-header">
            <span className="urbanismo-nombre">
              {index + 1}. {urbanismo.urbanismo}
            </span>
          </div>

          <div className="encabezados">
            <span><strong>Clientes:</strong> {urbanismo.cantidadClientes}</span>
            {!(
              urbanismo.estado === "Cancelado" || urbanismo.estado === "Gratis"
            ) && (
              <span><strong>Ingreso:</strong> {Math.round(urbanismo.ingresosTotales)}$</span>
            )}
          </div>

          <button onClick={() => toggleMostrarLista(index)} className="mostrar-ocultar">
            {urbanismoAbierto === index
              ? "Ocultar Lista"
              : `Mostrar Lista (${urbanismo.cantidadClientes})`}
          </button>

          {urbanismoAbierto === index && (
            <div className="clientes-wrapper">
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
                          <span className="cliente-value">{planName} (${planCost})</span>
                        </div>

                        <div className="cliente-row">
                          <span className="cliente-label">Tel</span>
                          <span className="cliente-value">{cliente.client_mobile || "N/A"}</span>
                        </div>

                        <div className="cliente-row">
                          <span className="cliente-label">Ciclo</span>
                          <span className="cliente-value">{cliente.cycle ?? "N/A"}</span>
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
      ))}
    </ul>
  );
}

export default TopUrbanismo;
