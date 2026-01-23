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
  
  // NUEVOS ESTADOS PARA LAS MEDIDAS COMO EN POWER BI
  const [medidasPowerBI, setMedidasPowerBI] = useState({
    totalActivos: 0,
    totalResidencialesActivos: 0,
    totalPymesActivas: 0,
    totalIntercambioActivos: 0,
    totalEmpleadosActivos: 0,
    totalGratisActivos: 0,
    totalOtrosActivos: 0
  });

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

  const handleDownloadExcel = () => {
    const workbook = XLSX.utils.book_new();

    function calcularDiasHabiles(fechaInicio, fechaFin) {
      let count = 0;
      let current = new Date(fechaInicio);

      while (current <= fechaFin) {
        const day = current.getDay();
        if (day !== 0 && day !== 6) {
          count++;
        }
        current.setDate(current.getDate() + 1);
      }
      return count;
    }

    const hoy = new Date();

    const worksheetData = topUrbanismos.flatMap((urbanismo) => {
      return urbanismo.clientes.map((cliente, clientIndex) => {
        const service = cliente.service_detail || {};
        const created_at_raw = cliente.created_at || "";
        const created_at = created_at_raw ? new Date(created_at_raw) : null;
        const diasHabiles = created_at ? calcularDiasHabiles(created_at, hoy) : "";

        return {
          "N° Cliente": clientIndex + 1,
          id: cliente.id,
          Cliente: cliente.client_name, 
          Teléfono: cliente.client_mobile,
          Dirección: cliente.address,
          Urbanismo: urbanismo.urbanismo,
          "Cedula": cliente.client_identification,
          IP: service.ip || "",
          MAC: service.mac || "",
          "Fecha_Creación": created_at_raw.slice(0, 10),
          "Días Hábiles": diasHabiles,
          Tipo_Cliente: cliente.client_type_name,
          plan: `${cliente.plan?.name || "N/A"} (${cliente.plan?.cost || "0"}$)`,
        };
      });
    });

    worksheetData.sort((a, b) => b["Días Hábiles"] - a["Días Hábiles"]);

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

  // Función para normalizar tipos de cliente
  const normalizarTipoCliente = (tipoCliente) => {
    if (!tipoCliente || tipoCliente === "" || tipoCliente === null || tipoCliente === undefined) return "OTRO";
    
    const tipo = tipoCliente.toString().toUpperCase().trim();
    
    // Mapeo de posibles variaciones a valores estandarizados
    if (tipo.includes("RESIDENCIAL") || tipo.includes("RESIDENCIAS") || tipo === "RESIDENCIALES") return "RESIDENCIAL";
    if (tipo.includes("PYME") || tipo.includes("EMPRESA") || tipo.includes("COMERCIAL") || tipo.includes("NEGOCIO") || tipo.includes("EMPRESARIAL")) return "PYME";
    if (tipo.includes("INTERCAMBIO") || tipo.includes("EXCHANGE")) return "INTERCAMBIO";
    if (tipo.includes("EMPLEADO") || tipo.includes("EMPLOYEE") || tipo.includes("STAFF") || tipo.includes("TRABAJADOR") || tipo.includes("COLABORADOR")) return "EMPLEADO";
    if (tipo.includes("GRATIS") || tipo.includes("FREE") || tipo.includes("CORTESIA") || tipo.includes("PROMOCIONAL") || tipo.includes("SIN COSTO")) return "GRATIS";
    
    return "OTRO";
  };

  // Función para calcular todas las medidas como en Power BI
  const calcularMedidasPowerBI = (servicios) => {
    if (!servicios || servicios.length === 0) {
      return {
        totalActivos: 0,
        totalResidencialesActivos: 0,
        totalPymesActivas: 0,
        totalIntercambioActivos: 0,
        totalEmpleadosActivos: 0,
        totalGratisActivos: 0,
        totalOtrosActivos: 0
      };
    }

    // Primero, filtramos solo los clientes activos (excluyendo PRUEBA)
    const clientesActivos = servicios.filter(servicio => 
      !servicio.client_name.includes("PRUEBA") && 
      servicio.status_name === "Activo"
    );

    // Calculamos cada medida individualmente
    const medidas = {
      // Total Activos (como en Power BI)
      totalActivos: clientesActivos.length,
      
      // Residenciales Activos
      totalResidencialesActivos: clientesActivos.filter(cliente => 
        normalizarTipoCliente(cliente.client_type_name) === "RESIDENCIAL"
      ).length,
      
      // Pymes Activas
      totalPymesActivas: clientesActivos.filter(cliente => 
        normalizarTipoCliente(cliente.client_type_name) === "PYME"
      ).length,
      
      // Intercambio Activos
      totalIntercambioActivos: clientesActivos.filter(cliente => 
        normalizarTipoCliente(cliente.client_type_name) === "INTERCAMBIO"
      ).length,
      
      // Empleados Activos
      totalEmpleadosActivos: clientesActivos.filter(cliente => 
        normalizarTipoCliente(cliente.client_type_name) === "EMPLEADO"
      ).length,
      
      // Gratis Activos
      totalGratisActivos: clientesActivos.filter(cliente => 
        normalizarTipoCliente(cliente.client_type_name) === "GRATIS"
      ).length,
      
      // Otros Activos (todo lo que no entre en las categorías anteriores)
      totalOtrosActivos: clientesActivos.filter(cliente => 
        normalizarTipoCliente(cliente.client_type_name) === "OTRO"
      ).length
    };

    // Verificación: La suma de todas las categorías debe ser igual al total de activos
    const sumaCategorias = 
      medidas.totalResidencialesActivos +
      medidas.totalPymesActivas +
      medidas.totalIntercambioActivos +
      medidas.totalEmpleadosActivos +
      medidas.totalGratisActivos +
      medidas.totalOtrosActivos;

    console.log("✅ VERIFICACIÓN POWER BI:");
    console.log("Total Activos:", medidas.totalActivos);
    console.log("Suma Categorías:", sumaCategorias);
    console.log("Diferencia:", medidas.totalActivos - sumaCategorias);
    console.log("Desglose:", medidas);

    return medidas;
  };

  useEffect(() => {
    if (!data) return;

    // 1. Primero calculamos las medidas como en Power BI
    const medidasCalculadas = calcularMedidasPowerBI(data.results);
    setMedidasPowerBI(medidasCalculadas);

    // 2. DEBUG: Mostrar tipos únicos de clientes
    const tiposUnicos = [...new Set(
      data.results
        .filter(s => !s.client_name.includes("PRUEBA"))
        .map(s => `${s.client_type_name} -> ${normalizarTipoCliente(s.client_type_name)}`)
    )];
    
    console.log("🔍 Tipos únicos (original -> normalizado):", tiposUnicos);
    console.log("📊 Total registros (sin PRUEBA):", data.results.filter(s => !s.client_name.includes("PRUEBA")).length);
    console.log("📊 Total activos (sin PRUEBA):", data.results.filter(s => !s.client_name.includes("PRUEBA") && s.status_name === "Activo").length);

    // 3. Ahora aplicamos los filtros para la tabla principal
    const urbanismosTotales = data.results
      .filter((servicio) => !servicio.client_name.includes("PRUEBA"))
      .filter((servicio) => {
        // 1. Filtro por estado
        const estadoFiltrado = estadosSeleccionados.includes("Todos") || 
                              estadosSeleccionados.includes(servicio.status_name);
        if (!estadoFiltrado) return false;

        // 2. Filtro por tipo de cliente - VERSIÓN CORREGIDA
        const tipoFiltrado = (() => {
          if (estadosSeleccionadosType.includes("Todos")) return true;
          
          const tipoClienteNormalizado = normalizarTipoCliente(servicio.client_type_name);
          if (!tipoClienteNormalizado || tipoClienteNormalizado === "OTRO") {
            // Si es "OTRO", solo lo incluimos si "OTRO" está seleccionado
            return estadosSeleccionadosType.includes("OTRO");
          }
          
          // Para cada tipo seleccionado, verificamos si coincide
          return estadosSeleccionadosType.some(tipoSeleccionado => {
            const tipoSeleccionadoUpper = tipoSeleccionado.toUpperCase().trim();
            return tipoClienteNormalizado === tipoSeleccionadoUpper;
          });
        })();
        
        if (!tipoFiltrado) return false;

        // 3. Filtro por migración
        const migradoFiltrado = migradosSeleccionados.includes("Todos") || 
                               migradosSeleccionados.includes(servicio.migrate ? "Migrado" : "No migrado");
        if (!migradoFiltrado) return false;

        // 4. Filtro por ciclo
        const cicloFiltrado = ciclosSeleccionados.includes("Todos") || 
                             ciclosSeleccionados.includes(servicio.cycle ? servicio.cycle.toString() : "");
        if (!cicloFiltrado) return false;

        // 5. Filtro por sector/agencia
        const sectorFiltrado = 
          sectoresSeleccionados.length === 0 ||
          sectoresSeleccionados.includes("Todos") || 
          (servicio.sector_name && sectoresSeleccionados.includes(sectorAgenciaMap[servicio.sector_name]));
        if (!sectorFiltrado) return false;

        // 6. Filtro por urbanismo
        const urbanismoFiltrado = 
          urbanismosSeleccionados.length === 0 ||
          urbanismosSeleccionados.includes("Todos") || 
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
            tipo: curr.client_type_name,
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

    // DEBUG: Verificar conteos
    const totalFiltrado = Object.keys(urbanismosTotales)
      .reduce((sum, key) => sum + urbanismosTotales[key].cantidadClientes, 0);
    
    console.log("🎯 Total filtrado para tabla:", totalFiltrado);
    console.log("📈 Medidas Power BI activas:", medidasCalculadas);

    // DEBUG: Verificar filtros aplicados
    const clientesFiltradosPorTipo = data.results
      .filter((servicio) => !servicio.client_name.includes("PRUEBA"))
      .filter((servicio) => {
        const estadoFiltrado = estadosSeleccionados.includes("Todos") || 
                              estadosSeleccionados.includes(servicio.status_name);
        return estadoFiltrado;
      });
    
    const conteoPorTipoFiltrado = clientesFiltradosPorTipo.reduce((acc, curr) => {
      const tipoNormalizado = normalizarTipoCliente(curr.client_type_name);
      if (!acc[tipoNormalizado]) acc[tipoNormalizado] = 0;
      acc[tipoNormalizado]++;
      return acc;
    }, {});
    
    console.log("🎯 Conteo por tipo (con filtros de estado):", conteoPorTipoFiltrado);

    const urbanismosTotalesArray = Object.keys(urbanismosTotales).map((sector) => ({
      urbanismo: sector,
      ...urbanismosTotales[sector],
    }));

    urbanismosTotalesArray.sort((a, b) => b.ingresosTotales - a.ingresosTotales);

    const topUrbanismosCalculados = urbanismosTotalesArray.slice(...TopUrb);
    const ingresosTotalesCalculados = urbanismosTotalesArray.reduce((acc, curr) => acc + curr.ingresosTotales, 0);
    const totalClientes = urbanismosTotalesArray.reduce((acc, curr) => acc + curr.cantidadClientes, 0);

    setTotalClientesGlobal(totalClientes);
    setTotalIngresos(ingresosTotalesCalculados);
    setTopUrbanismos(topUrbanismosCalculados);
  }, [data, TopUrb, estadosSeleccionados, estadosSeleccionadosType, migradosSeleccionados, ciclosSeleccionados, sectoresSeleccionados, urbanismosSeleccionados]);

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
          
          {/* Panel de Filtros */}
          <div className="filtros-panel">
            {/* Botones TOP */}
            <div>
              <button className="button" onClick={handleTop10Urb}>Top 10</button>
              <button className="button" onClick={handleTopUrb}>Top Global</button>
            </div>

            {/* ESTADO */}
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

            {/* TIPO DE CLIENTE */}
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
              <option value="OTRO">Otros</option>
            </select>

            {/* MIGRADOS */}
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

            {/* CICLOS */}
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

            {/* AGENCIAS */}
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

            {/* URBANISMOS */}
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

            {/* TOTALES */}
            <button className="buttonIngreso">
              Total de clientes: {totalClientesGlobal}
            </button>

            <button className="buttonIngreso marginbutton">
              {estadosSeleccionados.includes("Cancelado")
                ? `Total de Pérdida: ${totalIngresos.toLocaleString("es-ES", { minimumFractionDigits: 2 })}$`
                : `Total de Ingresos: ${totalIngresos.toLocaleString("es-ES", { minimumFractionDigits: 2 })}$`}
            </button>

            {/* ACCIONES */}
            <button
              className={!handleGrafico2 ? "button" : "buttonCerrar"}
              onClick={toggleGraficos}
            >
              {handleGrafico2 ? "Cerrar Gráficos" : "Abrir Gráficos"}
            </button>

            <button className="buttonDescargar" onClick={handleDownloadExcel}>
              Descargar Excel
            </button>
          </div>

          {/* PANEL DE MEDIDAS POWER BI */}
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '15px',
            margin: '15px 0',
            borderRadius: '8px',
            border: '1px solid #dee2e6',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h4 style={{marginBottom: '15px', color: '#495057'}}>
              📊 Medidas como en Power BI (Solo clientes ACTIVOS)
            </h4>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '10px'
            }}>
              <div style={{
                backgroundColor: '#e7f5ff',
                padding: '10px',
                borderRadius: '6px',
                borderLeft: '4px solid #339af0'
              }}>
                <div style={{fontSize: '12px', color: '#1864ab'}}>Total Activos</div>
                <div style={{fontSize: '18px', fontWeight: 'bold', color: '#1c7ed6'}}>
                  {medidasPowerBI.totalActivos}
                </div>
              </div>
              
              <div style={{
                backgroundColor: '#fff3bf',
                padding: '10px',
                borderRadius: '6px',
                borderLeft: '4px solid #fcc419'
              }}>
                <div style={{fontSize: '12px', color: '#e67700'}}>Residenciales Activos</div>
                <div style={{fontSize: '18px', fontWeight: 'bold', color: '#f59f00'}}>
                  {medidasPowerBI.totalResidencialesActivos}
                </div>
              </div>
              
              <div style={{
                backgroundColor: '#d3f9d8',
                padding: '10px',
                borderRadius: '6px',
                borderLeft: '4px solid #51cf66'
              }}>
                <div style={{fontSize: '12px', color: '#2b8a3e'}}>Pymes Activas</div>
                <div style={{fontSize: '18px', fontWeight: 'bold', color: '#37b24d'}}>
                  {medidasPowerBI.totalPymesActivas}
                </div>
              </div>
              
              <div style={{
                backgroundColor: '#ffe3e3',
                padding: '10px',
                borderRadius: '6px',
                borderLeft: '4px solid #ff6b6b'
              }}>
                <div style={{fontSize: '12px', color: '#c92a2a'}}>Intercambio Activos</div>
                <div style={{fontSize: '18px', fontWeight: 'bold', color: '#fa5252'}}>
                  {medidasPowerBI.totalIntercambioActivos}
                </div>
              </div>
              
              <div style={{
                backgroundColor: '#f3d9fa',
                padding: '10px',
                borderRadius: '6px',
                borderLeft: '4px solid #cc5de8'
              }}>
                <div style={{fontSize: '12px', color: '#862e9c'}}>Empleados Activos</div>
                <div style={{fontSize: '18px', fontWeight: 'bold', color: '#da77f2'}}>
                  {medidasPowerBI.totalEmpleadosActivos}
                </div>
              </div>
              
              <div style={{
                backgroundColor: '#e5dbff',
                padding: '10px',
                borderRadius: '6px',
                borderLeft: '4px solid #845ef7'
              }}>
                <div style={{fontSize: '12px', color: '#5f3dc4'}}>Gratis Activos</div>
                <div style={{fontSize: '18px', fontWeight: 'bold', color: '#7950f2'}}>
                  {medidasPowerBI.totalGratisActivos}
                </div>
              </div>
              
              <div style={{
                backgroundColor: '#d0ebff',
                padding: '10px',
                borderRadius: '6px',
                borderLeft: '4px solid #74c0fc'
              }}>
                <div style={{fontSize: '12px', color: '#1971c2'}}>Otros Activos</div>
                <div style={{fontSize: '18px', fontWeight: 'bold', color: '#339af0'}}>
                  {medidasPowerBI.totalOtrosActivos}
                </div>
              </div>
            </div>
            
            {/* VERIFICACIÓN DE SUMA */}
            <div style={{
              marginTop: '15px',
              padding: '10px',
              backgroundColor: '#fff',
              borderRadius: '6px',
              border: '1px dashed #adb5bd'
            }}>
              <div style={{fontSize: '12px', color: '#495057'}}>Verificación de suma:</div>
              <div style={{fontSize: '14px', fontWeight: 'bold'}}>
                Residenciales ({medidasPowerBI.totalResidencialesActivos}) + 
                Pymes ({medidasPowerBI.totalPymesActivas}) + 
                Intercambio ({medidasPowerBI.totalIntercambioActivos}) + 
                Empleados ({medidasPowerBI.totalEmpleadosActivos}) + 
                Gratis ({medidasPowerBI.totalGratisActivos}) + 
                Otros ({medidasPowerBI.totalOtrosActivos}) = 
                <span style={{
                  color: medidasPowerBI.totalActivos === 
                    (medidasPowerBI.totalResidencialesActivos + 
                     medidasPowerBI.totalPymesActivas + 
                     medidasPowerBI.totalIntercambioActivos + 
                     medidasPowerBI.totalEmpleadosActivos + 
                     medidasPowerBI.totalGratisActivos + 
                     medidasPowerBI.totalOtrosActivos) 
                    ? '#2b8a3e' : '#e03131'
                }}>
                  {" "}
                  {medidasPowerBI.totalResidencialesActivos + 
                   medidasPowerBI.totalPymesActivas + 
                   medidasPowerBI.totalIntercambioActivos + 
                   medidasPowerBI.totalEmpleadosActivos + 
                   medidasPowerBI.totalGratisActivos + 
                   medidasPowerBI.totalOtrosActivos}
                </span>
                {" "}
                {medidasPowerBI.totalActivos === 
                 (medidasPowerBI.totalResidencialesActivos + 
                  medidasPowerBI.totalPymesActivas + 
                  medidasPowerBI.totalIntercambioActivos + 
                  medidasPowerBI.totalEmpleadosActivos + 
                  medidasPowerBI.totalGratisActivos + 
                  medidasPowerBI.totalOtrosActivos) 
                 ? "✅ CORRECTO" : "❌ ERROR"}
              </div>
            </div>
          </div>

          {/* DEBUG INFO */}
          <div style={{
            fontSize: '12px', 
            color: '#666', 
            padding: '10px',
            backgroundColor: '#f5f5f5',
            margin: '10px 0',
            borderRadius: '4px',
            borderLeft: '4px solid #007bff'
          }}>
            <strong>🔍 Filtros Activos:</strong> 
            <div style={{marginTop: '5px'}}>
              <span>Estados: <strong>{estadosSeleccionados.join(', ')}</strong></span> | 
              <span> Tipos: <strong>{estadosSeleccionadosType.join(', ')}</strong></span> | 
              <span> Total Tabla: <strong>{totalClientesGlobal}</strong></span>
            </div>
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

function UrbanismoList({ urbanismos }) {
  const [mostrarLista, setMostrarLista] = useState({});

  const toggleMostrarLista = (index) => {
    setMostrarLista((prevState) => ({ ...prevState, [index]: !prevState[index] }));
  };

  return (
    <ul>
      {urbanismos.map((urbanismo, index) => (
        <li className="urbanismo-item encabezados" key={index}>
          <span className="urbanismo-nombre">
            {index + 1}. {urbanismo.urbanismo}
          </span>

          <br />
          <div className="encabezados">
            <span><strong>Cantidad de Clientes:</strong> {urbanismo.cantidadClientes}</span>
            <br />
            {!(
              urbanismo.estado === "Cancelado" || urbanismo.estado === "Gratis"
            ) && (
              <span><strong>Ingreso total:</strong> { Math.round(urbanismo.ingresosTotales)}$</span>
            )}
          </div>

          <button onClick={() => toggleMostrarLista(index)} className="mostrar-ocultar">
            {mostrarLista[index] ? "Ocultar Lista" : "Mostrar Lista"}
          </button>

          <div>
            {mostrarLista[index] && (
              <ul className="lista-clientes">
                {urbanismo.clientes.map((cliente, idx) => (
                  <li key={idx}>
                    <p><strong>Nombre:</strong> {cliente.client_name}</p>
                    <p><strong>Estado:</strong> {cliente.status_name}</p>
                    <p><strong>Tipo:</strong> {cliente.client_type_name} ({urbanismo.tipoNormalizado})</p>
                    <p><strong>Sector:</strong> {cliente.sector_name}</p>
                    <p><strong>Plan:</strong> {cliente.plan.name} (${cliente.plan.cost})</p>
                    <p><strong>Teléfono:</strong> {cliente.client_mobile}</p>
                    <p><strong>Ciclo:</strong> {cliente.cycle}</p>
                    <p><strong>Dirección:</strong> {cliente.address}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

export default TopUrbanismo;
