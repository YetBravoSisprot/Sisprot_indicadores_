import React, { useState, useEffect, useContext } from "react";
import PageNav from "../../Componentes/PageNav";
import LogoTitulo from "../../Componentes/LogoTitulo";
import { PasswordContext } from "../../PasswordContext/PasswordContext";
import LogingForm from "../../Componentes/LogingForm";
import "./TopUrbanismo.css";
import ChartComponent from "../../Componentes/ChartComponent";
import DropdownMenu from "./../../Componentes/DropdownMenu";
import * as XLSX from "xlsx";

// ... (sectorAgenciaMap y urbanismosAprobados se mantienen igual) ...

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

  // Función para normalizar tipos de cliente - MÁS PRECISA
  const normalizarTipoCliente = (tipoCliente) => {
    if (!tipoCliente || tipoCliente === "" || tipoCliente === null || tipoCliente === undefined) {
      return "OTRO";
    }
    
    const tipo = tipoCliente.toString().toUpperCase().trim();
    
    // Verificación EXACTA primero
    if (tipo === "RESIDENCIAL" || tipo === "RESIDENCIALES") return "RESIDENCIAL";
    if (tipo === "PYME" || tipo === "PYMES") return "PYME";
    if (tipo === "INTERCAMBIO") return "INTERCAMBIO";
    if (tipo === "EMPLEADO" || tipo === "EMPLEADOS") return "EMPLEADO";
    if (tipo === "GRATIS") return "GRATIS";
    
    // Verificación por contenido
    if (tipo.includes("RESIDENCIAL")) return "RESIDENCIAL";
    if (tipo.includes("PYME")) return "PYME";
    if (tipo.includes("EMPLEADO")) return "EMPLEADO";
    if (tipo.includes("GRATIS") || tipo.includes("CORTESIA")) return "GRATIS";
    if (tipo.includes("INTERCAMBIO")) return "INTERCAMBIO";
    
    return "OTRO";
  };

  useEffect(() => {
    if (!data) return;

    // DEBUG: Verificar datos reales primero
    const clientesSinPrueba = data.results.filter(s => !s.client_name.includes("PRUEBA"));
    const clientesActivos = clientesSinPrueba.filter(s => s.status_name === "Activo");
    
    console.log("=== DEBUG INICIAL ===");
    console.log("Total sin PRUEBA:", clientesSinPrueba.length);
    console.log("Total Activos sin PRUEBA:", clientesActivos.length);
    
    // Verificar conteos POR TIPO en activos
    const tiposEnActivos = {};
    clientesActivos.forEach(cliente => {
      const tipoOriginal = cliente.client_type_name || "SIN TIPO";
      const tipoNormalizado = normalizarTipoCliente(tipoOriginal);
      
      if (!tiposEnActivos[tipoNormalizado]) {
        tiposEnActivos[tipoNormalizado] = {
          count: 0,
          originalTypes: new Set()
        };
      }
      tiposEnActivos[tipoNormalizado].count++;
      tiposEnActivos[tipoNormalizado].originalTypes.add(tipoOriginal);
    });
    
    console.log("Conteo por tipo normalizado (ACTIVOS):");
    Object.keys(tiposEnActivos).forEach(tipo => {
      console.log(`  ${tipo}: ${tiposEnActivos[tipo].count} clientes`);
      console.log(`    Tipos originales:`, Array.from(tiposEnActivos[tipo].originalTypes));
    });
    
    // Sumar todos los tipos para verificar
    const sumaTipos = Object.values(tiposEnActivos).reduce((sum, tipo) => sum + tipo.count, 0);
    console.log(`Suma de todos los tipos: ${sumaTipos}`);
    console.log(`Total activos real: ${clientesActivos.length}`);
    console.log(`Diferencia: ${clientesActivos.length - sumaTipos}`);
    console.log("=====================");

    // Ahora aplicamos los filtros para la tabla principal - VERSIÓN CORREGIDA
    const urbanismosTotales = data.results
      .filter((servicio) => !servicio.client_name.includes("PRUEBA"))
      .filter((servicio) => {
        // 1. Filtro por estado - EXACTO
        const estadoFiltrado = estadosSeleccionados.includes("Todos") || 
                              estadosSeleccionados.includes(servicio.status_name);
        if (!estadoFiltrado) return false;

        // 2. Filtro por tipo de cliente - VERSIÓN SIMPLIFICADA Y EXACTA
        const tipoFiltrado = (() => {
          if (estadosSeleccionadosType.includes("Todos")) return true;
          
          const tipoClienteNormalizado = normalizarTipoCliente(servicio.client_type_name);
          
          // Para cada tipo seleccionado, verificamos si coincide EXACTAMENTE
          const encontrado = estadosSeleccionadosType.some(tipoSeleccionado => {
            const tipoSeleccionadoUpper = tipoSeleccionado.toUpperCase().trim();
            return tipoClienteNormalizado === tipoSeleccionadoUpper;
          });
          
          return encontrado;
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

    // DEBUG: Verificar los filtros aplicados
    console.log("=== FILTROS APLICADOS ===");
    console.log("Estados seleccionados:", estadosSeleccionados);
    console.log("Tipos seleccionados:", estadosSeleccionadosType);
    
    // Verificar cuántos clientes pasaron cada filtro
    const totalFiltrado = Object.keys(urbanismosTotales)
      .reduce((sum, key) => sum + urbanismosTotales[key].cantidadClientes, 0);
    
    console.log("Total filtrado en tabla:", totalFiltrado);
    
    // Verificar por tipo en los filtrados
    const conteoPorTipoFiltrado = {};
    Object.values(urbanismosTotales).forEach(urb => {
      urb.clientes.forEach(cliente => {
        const tipoNormalizado = normalizarTipoCliente(cliente.client_type_name);
        if (!conteoPorTipoFiltrado[tipoNormalizado]) {
          conteoPorTipoFiltrado[tipoNormalizado] = 0;
        }
        conteoPorTipoFiltrado[tipoNormalizado]++;
      });
    });
    
    console.log("Conteo por tipo en tabla filtrada:", conteoPorTipoFiltrado);
    console.log("=====================");

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

          {/* PANEL DE VERIFICACIÓN */}
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '15px',
            margin: '15px 0',
            borderRadius: '8px',
            border: '1px solid #dee2e6'
          }}>
            <h4 style={{marginBottom: '15px', color: '#495057'}}>
              🔍 Verificación de Datos
            </h4>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '10px'
            }}>
              <div style={{
                backgroundColor: '#e7f5ff',
                padding: '10px',
                borderRadius: '6px',
                borderLeft: '4px solid #339af0'
              }}>
                <div style={{fontSize: '12px', color: '#1864ab'}}>Filtro: "Activo"</div>
                <div style={{fontSize: '16px', fontWeight: 'bold', color: '#1c7ed6'}}>
                  {estadosSeleccionados.includes("Activo") ? "✓ Aplicado" : "✗ No aplicado"}
                </div>
              </div>
              
              <div style={{
                backgroundColor: '#d3f9d8',
                padding: '10px',
                borderRadius: '6px',
                borderLeft: '4px solid #51cf66'
              }}>
                <div style={{fontSize: '12px', color: '#2b8a3e'}}>Filtro: "Residenciales"</div>
                <div style={{fontSize: '16px', fontWeight: 'bold', color: '#37b24d'}}>
                  {estadosSeleccionadosType.includes("RESIDENCIAL") ? "✓ Aplicado" : "✗ No aplicado"}
                </div>
              </div>
              
              <div style={{
                backgroundColor: '#ffe3e3',
                padding: '10px',
                borderRadius: '6px',
                borderLeft: '4px solid #ff6b6b'
              }}>
                <div style={{fontSize: '12px', color: '#c92a2a'}}>Filtro: "Pymes"</div>
                <div style={{fontSize: '16px', fontWeight: 'bold', color: '#fa5252'}}>
                  {estadosSeleccionadosType.includes("PYME") ? "✓ Aplicado" : "✗ No aplicado"}
                </div>
              </div>
            </div>
            
            <div style={{
              marginTop: '15px',
              padding: '10px',
              backgroundColor: '#fff',
              borderRadius: '6px',
              border: '1px dashed #adb5bd',
              fontSize: '14px'
            }}>
              <div><strong>Nota:</strong> Abre la consola (F12) para ver los detalles del cálculo</div>
              <div style={{marginTop: '5px', fontSize: '12px', color: '#666'}}>
                Los números deberían ser: 3347 Residenciales + 159 Pymes = 3506 Activos
              </div>
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
                    <p><strong>Tipo:</strong> {cliente.client_type_name}</p>
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
