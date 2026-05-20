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

// ===================== HELPERS =====================
const norm = (v) => (v == null ? "" : String(v).replace(/\u00a0/g, " ").trim());

// Mapeo de sectores a agencias (Fallback estático)
const FALLBACK_SECTOR_AGENCIA_MAP = {
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
  "19 de Abril": "NODO MACARO",

  // ✅ NUEVO: Turmerito
  "Turmerito": "NODO TURMERO",
};

// Lista aprobada por agencia (para el dropdown) (Fallback estático)
const FALLBACK_URBANISMOS_APROBADOS = {
  "NODO MACARO": [
    "Villas El Carmen",
    "El Macaro",
    "Saman de Guere",
    "Villa Los Tamarindos",
    "Saman Tarazonero II",
    "La Casona II",
    "Saman Tarazonero I",
    "La Casona I",
    "Palmeras II",
    "La Macarena",
    "Isaac Oliveira",
    "La Magdalena",
    "El Paraiso",
    "San Sebastian",
    "Lascenio Guerrero",
    "Plaza Jardin",
    "Jabillar",
    "La Concepcion",
    "Simon Bolivar",
    "Palmeras I",
    "Santa Eduviges",
    "Villa De San Jose",
    "Salto Angel",
    "La Esperanza",
    "La Concepcion III",
    "La Julia",
    "Taguapire",
    "La Casona II Edificios",
    "Antonio Jose de Sucre",
    "Valle del Rosario",
    "Arturo Luis Berti",
    "La Casona I Edificios",
    "Narayola II",
    "Terrazas de Juan Pablo",
    "Guerito",
    "Leocolbo",
    "Los Caobos",
    "Santa Barbara",
    "18 de Septiembre",
    "Urb. Vista Hermosa La Julia",
    "19 de Abril",
  ],
  "NODO PAYA": [
    "Mata Caballo",
    "Pantin",
    "Rio Seco",
    "Durpa",
    "Paya Abajo",
    "Prados III",
    "Bicentenario",
    "Prados II",
    "Brisas de Paya",
    "Antigua Hacienda De Paya",
    "Ppal Paya",
    "Los Hornos",
    "Callejon Lim",
    "Antigua Hacienda De Paya II",
    "Vallecito",
    "Prados I",
    "Las Rurales",
    "Canaima",
    "Vista Hermosa",
    "Valle Verde",
    "Palma Real",
    "El Naranjal",
    "Terrazas de Paya",
    "La Arboleda",
    "Luz y Vida",
    "Los Mangos",
    "Callejon Los Jabillos",
    "Dios Es Mi Refugio",
    "Huerta Los Pajaros",
    "Betania",
    "1ro de Mayo Norte",
    "Payita",
    "Las Palmas",
    "1ro de Mayo Sur",
    "El Cambur",
    "La Orquidea",
    "Sector los Mangos",
    "El Bosque",
    "Callejon Rosales",
    "Prados",
    "Callejon 17",
    "Polvorin",
    "Guayabita",
    "La Marcelota",
    "Manirito",
    "Paraguatan",
    "La Guzman",
    "Guerrero de Chavez",
  ],
  "NODO TURMERO": [
    "Casco de Turmero",
    "Ezequiel Zamora",
    "Guanarito",
    "Tibisay Guevara",
    "San Pablo",
    "Valle Paraiso",
    "Prados de Cafetal",
    "La Floresta",
    "Villeguita",
    "Terrazas de Turmero",
    "Haras de San Pablo",
    "Laguna Plaza",
    "Villa Caribe",
    "Residencias Candys",
    "El Nispero",
    "Ciudad Bendita",
    "Residencias Mariño",
    "San Carlos",
    "Laguna II",
    "Marina Caribe",
    "La Montañita",
    "La Aduana",
    "Valle Fresco",
    "Calle Peñalver",
    "Los Nisperos",
    "La Montaña",
    "Valle lindo",
    "Edif. El Torreon",
    "Edif. El Portal",
    "Villas Del Sur",

    // ✅ NUEVO
    "Turmerito",
  ],
};

const tiposClienteValidos = ["PYME", "RESIDENCIAL", "INTERCAMBIO", "EMPLEADO", "GRATIS"];



function TopUrbanismo() {
  const location = useLocation();
  const { showPasswordState, data, isLoading, error, email } = useContext(PasswordContext);

  const [sectorAgenciaMap, setSectorAgenciaMap] = useState(FALLBACK_SECTOR_AGENCIA_MAP);
  const [urbanismosAprobados, setUrbanismosAprobados] = useState(FALLBACK_URBANISMOS_APROBADOS);

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
          if (normParish === "SAMAN DE GUERE") return "NODO MACARO";
          if (normParish === "PEDRO AREVALO APONTE") return "NODO PAYA";
          if (normParish === "TURMERO") return "NODO TURMERO";
          return `NODO ${normParish}`;
        };
        
        const newSectorAgenciaMap = {};
        const newUrbanismosAprobados = {
          "NODO MACARO": [],
          "NODO PAYA": [],
          "NODO TURMERO": [],
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

  const buscarPorContrato = () => {
    if (!contratoBuscado || !data?.results) return;

    const searchStr = String(contratoBuscado).toLowerCase().trim();

    const resultado = data.results.filter((cliente) => {
      const matchId = String(cliente.id) === searchStr;
      const matchName = cliente.client_name && cliente.client_name.toLowerCase().includes(searchStr);
      return matchId || matchName;
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
      filtroTextos.push(`Urbanismos: ${urbanismosEspecificos.join(", ")}`);
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

  const handleDownloadExcelExecutive = async () => {
    try {
      const filtroTextos = [...estadosSeleccionados];
      const urbanismosEspecificos = urbanismosSeleccionados.filter(u => u !== "Todos" && u !== "");
      if (urbanismosEspecificos.length > 0) {
        filtroTextos.push(`Urbanismos: ${urbanismosEspecificos.join(", ")}`);
      }
      const baseName = email ? email.split('@')[0] : 'Usuario';
      const cleanName = baseName.replace(/[\._0-9]/g, ' ').trim().split(' ')[0];
      const formattedName = cleanName ? cleanName.charAt(0).toUpperCase() + cleanName.slice(1).toLowerCase() : 'Analista';

      await exportExecutiveReport(serviciosParaExportar, filtroTextos, formattedName, columnasSeleccionadas);
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
        ciclosSeleccionados.includes(mapCycleValue(servicio.cycle));
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
        ciclosSeleccionados.includes(mapCycleValue(servicio.cycle));
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
    if (!data?.results) return;

    const usarPasaFiltros = estadosSeleccionadosType.includes("Todos") ? pasaFiltroTotales : pasaFiltros;

    const serviciosFiltrados = data.results.filter((servicio) => usarPasaFiltros(servicio));
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
    extraerTipoDeSubdivision,
    sectorAgenciaMap,
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
                type="text"
                placeholder="Contrato o nombre..."
                value={contratoBuscado}
                onChange={(e) => setContratoBuscado(e.target.value)}
              />

              <button className="button" onClick={buscarPorContrato}>
                Buscar
              </button>
            </div>

            <div>
              <button className="button" onClick={handleTop10Urb}>
                Top 10
              </button>
              <button className="button" onClick={handleTopUrb}>
                Top Global
              </button>
            </div>

            <div className="filtros-selects-grid">
              <div className="columnas-checkbox-container" id="estadoSelect">
                <label className="filter-header">Estatus</label>
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
              </div>

              <div className="columnas-checkbox-container" id="estadoSelect2">
                <label className="filter-header">Tipo de Cliente</label>
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
              </div>

              <div className="columnas-checkbox-container" id="migradosSelect">
                <label className="filter-header">Migrados</label>
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
              </div>

              <div className="columnas-checkbox-container" id="ciclosSelect">
                <label className="filter-header">Ciclos</label>
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
              </div>

              <div className="columnas-checkbox-container" id="sectoresSelect">
                <label className="filter-header">Agencias</label>
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
              </div>

              <div className="columnas-checkbox-container" id="urbanismosSelect">
                <label className="filter-header">Urbanismos</label>
                <label className="columna-item-check">
                  <input
                    type="checkbox"
                    checked={urbanismosSeleccionados.includes("Todos")}
                    onChange={() => handleToggleGeneric(setUrbanismosSeleccionados, "Todos", "Todos")}
                  />
                  <span>Todos</span>
                </label>
                {urbanismosParaMostrar.map((urbanismo) => (
                  <label key={urbanismo} className="columna-item-check">
                    <input
                      type="checkbox"
                      checked={urbanismosSeleccionados.includes(urbanismo)}
                      onChange={() => handleToggleGeneric(setUrbanismosSeleccionados, urbanismo, "Todos")}
                    />
                    <span>{urbanismo}</span>
                  </label>
                ))}
              </div>

              <div className="columnas-checkbox-container" id="columnasSelect">
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
                  "Teléfono", "Urbanismo", "Plan", "Costo", "Migrado", "Ciclo",
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
              </div>

            </div>

            <button className="buttonIngreso">Total de clientes: {totalClientesGlobal}</button>

            <button className="buttonIngreso marginbutton">
              {estadosSeleccionados.includes("Cancelado")
                ? `Total de Perdida: ${totalIngresos.toLocaleString("es-ES", { minimumFractionDigits: 2 })}$`
                : `Total de Ingresos: ${totalIngresos.toLocaleString("es-ES", { minimumFractionDigits: 2 })}$`}
            </button>

            <div style={{ backgroundColor: '#fdfcfe', padding: '20px', borderRadius: '12px', marginBottom: '25px', fontSize: '0.95rem', color: '#2c3e50', border: '1px solid #e1e8ed', textAlign: 'left', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <p style={{ margin: '0 0 12px 0', color: '#1f4e78', fontSize: '1.1rem' }}><strong>📊 Guía de Reportes Inteligentes:</strong></p>
              <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.6' }}>
                <li style={{ marginBottom: '10px' }}>
                  <strong>Reporte de Postventa / Atención al Cliente:</strong> Optimizado para el seguimiento de usuarios y gestión de contactos. Permite generar listas personalizadas para validar el estatus y la atención brindada.
                </li>
                <li style={{ marginBottom: '10px' }}>
                  <strong>Reporte Ejecutivo (Dashboard):</strong> Es automático y visual. Genera gráficas de estatus, top de sectores e indicadores financieros, e incluye también el detalle de clientes con las columnas que hayas seleccionado.
                </li>
              </ul>
            </div>

            <div style={{ width: '100%', display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'center', margin: '15px 0' }}>
               <button className="buttonDescargar" onClick={handleDownloadExcelOperaciones} style={{ width: 'auto', minWidth: '260px', backgroundColor: '#34495e' }}>
                📂 Descargar Excel Postventa / Atención al Cliente
              </button>
              <button className="buttonDescargar" onClick={handleDownloadExcelExecutive} style={{ width: 'auto', minWidth: '260px', backgroundColor: '#27ae60' }}>
                📈 Descargar Reporte Ejecutivo
              </button>
            </div>

            <span className="filtro-tip">
              💡 <b>Tip de uso:</b> Ahora puedes <b>marcar directamente</b> las casillas para elegir los filtros. Si marcas una opción específica, se quitará la selección de "Todos" automáticamente.
            </span>
          </div>


          <div className="titulo-topurbanismos">
            <h3 className="h3">Top Urbanismos</h3>
          </div>

          {modoBusquedaContrato ? (
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
        <li className={`urbanismo-item ${urbanismoAbierto === index ? "expanded" : ""}`} key={index}>
          <div className="card-header">
            <span className="urbanismo-nombre">
              {index + 1}. {urbanismo.urbanismo}
            </span>
          </div>

          <div className="encabezados">
            <span>
              <strong>Clientes:</strong> {urbanismo.cantidadClientes}
            </span>
            {!((urbanismo.estado === "Cancelado" || urbanismo.estado === "Gratis")) && (
              <span>
                <strong>Ingreso:</strong> {Math.round(urbanismo.ingresosTotales)}$
              </span>
            )}
          </div>

          <button onClick={() => toggleMostrarLista(index)} className="mostrar-ocultar">
            {urbanismoAbierto === index ? "Ocultar Lista" : `Mostrar Lista (${urbanismo.cantidadClientes})`}
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
                          <span className="cliente-value">
                            {planName} (${planCost})
                          </span>
                        </div>

                        <div className="cliente-row">
                          <span className="cliente-label">Tel</span>
                          <span className="cliente-value">{cliente.client_mobile || "N/A"}</span>
                        </div>

                        <div className="cliente-data">
                          <span><strong>ID:</strong> {cliente.id}</span>
                          <span><strong>Ciclo:</strong> {mapCycleValue(cliente.cycle)}</span>
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
