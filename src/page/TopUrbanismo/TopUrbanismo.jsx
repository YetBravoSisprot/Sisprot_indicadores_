import React, { useState, useEffect, useContext } from "react";
import PageNav from "../../Componentes/PageNav";
import LogoTitulo from "../../Componentes/LogoTitulo";
import { PasswordContext } from "../../PasswordContext/PasswordContext";
import LogingForm from "../../Componentes/LogingForm";
import "./TopUrbanismo.css";
import ChartComponent from "../../Componentes/ChartComponent";
import DropdownMenu from "../../Componentes/DropdownMenu";
import * as XLSX from "xlsx";

/* ===============================
   MAPEO DE SECTORES A AGENCIAS
================================ */
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
  "Los Hornos": "NODO PAYA",
  "Terrazas de Paya": "NODO PAYA",
  "Terrazas de Turmero": "NODO TURMERO",
};

/* ===============================
   COMPONENTE PRINCIPAL
================================ */
function TopUrbanismo() {
  const { showPasswordState, data, isLoading, error } =
    useContext(PasswordContext);

  const [TopUrb, setTopUrb] = useState([0, 3500]);
  const [estadosSeleccionados, setEstadosSeleccionados] = useState(["Activo"]);
  const [estadosSeleccionadosType, setEstadosSeleccionadosType] = useState([
    "Todos",
  ]);
  const [totalIngresos, setTotalIngresos] = useState(0);
  const [topUrbanismos, setTopUrbanismos] = useState([]);
  const [totalClientesGlobal, setTotalClientesGlobal] = useState(0);
  const [handleGrafico2, setHandleGrafico2] = useState(false);
  const [migradosSeleccionados, setMigradosSeleccionados] = useState(["Todos"]);
  const [ciclosSeleccionados, setCiclosSeleccionados] = useState(["Todos"]);
  const [sectoresSeleccionados, setSectoresSeleccionados] = useState([]);
  const [urbanismosSeleccionados, setUrbanismosSeleccionados] = useState([]);

  /* ===============================
     USE EFFECT PRINCIPAL
  ================================ */
  useEffect(() => {
    if (!data?.results) return;

    const agrupado = data.results
      .filter((c) => !c.client_name?.includes("PRUEBA"))
      .filter((c) => {
        const estadoOK =
          estadosSeleccionados.includes("Todos") ||
          estadosSeleccionados.includes(c.status_name);

        const tipoOK =
          estadosSeleccionadosType.includes("Todos") ||
          estadosSeleccionadosType.includes(c.client_type_name);

        const migradoOK =
          migradosSeleccionados.includes("Todos") ||
          migradosSeleccionados.includes(
            c.migrate ? "Migrado" : "No migrado"
          );

        const cicloOK =
          ciclosSeleccionados.includes("Todos") ||
          ciclosSeleccionados.includes(c.cycle?.toString());

        const sectorOK =
          sectoresSeleccionados.length === 0 ||
          sectoresSeleccionados.includes("Todos") ||
          sectoresSeleccionados.includes(sectorAgenciaMap[c.sector_name]);

        const urbanismoOK =
          urbanismosSeleccionados.length === 0 ||
          urbanismosSeleccionados.includes("Todos") ||
          urbanismosSeleccionados.includes(c.sector_name);

        return (
          estadoOK &&
          tipoOK &&
          migradoOK &&
          cicloOK &&
          sectorOK &&
          urbanismoOK
        );
      })
      .reduce((acc, curr) => {
        if (!acc[curr.sector_name]) {
          acc[curr.sector_name] = {
            urbanismo: curr.sector_name,
            cantidadClientes: 0,
            ingresosTotales: 0,
            estados: {
              Activo: 0,
              Suspendido: 0,
              Pausado: 0,
              Cancelado: 0,
              "Por instalar": 0,
            },
            tipos: {},
            clientes: [],
          };
        }

        acc[curr.sector_name].cantidadClientes++;
        acc[curr.sector_name].ingresosTotales += Number(curr.plan?.cost || 0);

        if (acc[curr.sector_name].estados[curr.status_name] !== undefined) {
          acc[curr.sector_name].estados[curr.status_name]++;
        }

        acc[curr.sector_name].tipos[curr.client_type_name] =
          (acc[curr.sector_name].tipos[curr.client_type_name] || 0) + 1;

        acc[curr.sector_name].clientes.push(curr);

        return acc;
      }, {});

    const arrayFinal = Object.values(agrupado).sort(
      (a, b) => b.ingresosTotales - a.ingresosTotales
    );

    setTopUrbanismos(arrayFinal.slice(...TopUrb));
    setTotalIngresos(
      arrayFinal.reduce((acc, u) => acc + u.ingresosTotales, 0)
    );
    setTotalClientesGlobal(
      arrayFinal.reduce((acc, u) => acc + u.cantidadClientes, 0)
    );
  }, [
    data,
    TopUrb,
    estadosSeleccionados,
    estadosSeleccionadosType,
    migradosSeleccionados,
    ciclosSeleccionados,
    sectoresSeleccionados,
    urbanismosSeleccionados,
  ]);

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

          <button className="buttonIngreso">
            Total de clientes: {totalClientesGlobal}
          </button>

          <button className="buttonIngreso">
            Total ingresos:{" "}
            {totalIngresos.toLocaleString("es-ES", {
              minimumFractionDigits: 2,
            })}
            $
          </button>

          <button
            className="button"
            onClick={() => setHandleGrafico2(!handleGrafico2)}
          >
            {handleGrafico2 ? "Cerrar Gráficos" : "Abrir Gráficos"}
          </button>

          {handleGrafico2 && (
            <ChartComponent urbanismos={topUrbanismos} />
          )}

          <UrbanismoList urbanismos={topUrbanismos} />
        </>
      )}
    </div>
  );
}

/* ===============================
   LISTA DE URBANISMOS
================================ */
function UrbanismoList({ urbanismos }) {
  const [mostrarLista, setMostrarLista] = useState({});

  const toggle = (i) =>
    setMostrarLista((prev) => ({ ...prev, [i]: !prev[i] }));

  return (
    <ul>
      {urbanismos.map((u, i) => (
        <li key={i} className="urbanismo-item">
          <strong>
            {i + 1}. {u.urbanismo}
          </strong>

          <div>
            <p>Total clientes: {u.cantidadClientes}</p>
            <p>🟢 Activos: {u.estados.Activo}</p>
            <p>🟡 Pausados: {u.estados.Pausado}</p>
            <p>🔴 Cancelados: {u.estados.Cancelado}</p>
            <p>🔵 Por instalar: {u.estados["Por instalar"]}</p>

            <strong>Tipos:</strong>
            {Object.entries(u.tipos).map(([tipo, total]) => (
              <div key={tipo}>
                {tipo}: {total}
              </div>
            ))}

            <p>
              <strong>Ingreso total:</strong>{" "}
              {Math.round(u.ingresosTotales)}$
            </p>
          </div>

          <button onClick={() => toggle(i)}>
            {mostrarLista[i] ? "Ocultar" : "Ver clientes"}
          </button>

          {mostrarLista[i] && (
            <ul>
              {u.clientes.map((c, idx) => (
                <li key={idx}>
                  {c.client_name} – {c.status_name}
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
