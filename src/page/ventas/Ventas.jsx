import React, { useState, useEffect } from "react";
import PageNav from "../../Componentes/PageNav";
import LogoTitulo from "../../Componentes/LogoTitulo";
import DropdownMenu from "../../Componentes/DropdownMenu";
import ChartComponent from "../../Componentes/ChartComponent";
import * as XLSX from "xlsx";
import "./ventas.css";

const API_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxOTAxOTc0MTQ4LCJpYXQiOjE3MjA1MzQxNDgsImp0aSI6IjE5YThhNzU0ODg4NzQ5NGM4YjNmZjBjODMxMDIzMzc1IiwidXNlcl9pZCI6MjE4fQ.hgNwOhyqekwEOnV5ij7XsfYMUIGM_gcDWLHeeEzsSio";

const API_URL =
  "https://coresisprot.gsoft.app/api/gsoft/thirds/contracts/";

function Ventas() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const [topRange, setTopRange] = useState([0, 5000]);
  const [estadosSeleccionados, setEstadosSeleccionados] = useState([
    "Por instalar",
  ]);
  const [tiposSeleccionados, setTiposSeleccionados] = useState(["Todos"]);

  const [totalClientes, setTotalClientes] = useState(0);
  const [topUrbanismos, setTopUrbanismos] = useState([]);
  const [mostrarGraficos, setMostrarGraficos] = useState(true);

  // ===============================
  // FETCH DATA
  // ===============================
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const pageSize = 500;
      const url = `${API_URL}?status_name=Por+instalar&page_size=${pageSize}`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${API_TOKEN}` },
      });

      if (!response.ok) {
        throw new Error(`Error HTTP ${response.status}`);
      }

      const json = await response.json();

      let allResults = json.results || [];
      const totalPages = Math.ceil(json.count / pageSize);

      const requests = [];
      for (let i = 2; i <= totalPages; i++) {
        requests.push(
          fetch(`${url}&page=${i}`, {
            headers: { Authorization: `Bearer ${API_TOKEN}` },
          }).then((r) => r.json())
        );
      }

      const pages = await Promise.all(requests);
      pages.forEach((p) => {
        allResults = allResults.concat(p.results || []);
      });

      setData({
        count: allResults.length,
        results: allResults.map((c) => ({
          id: c.id,
          client_name: c.client_name,
          client_type_name: c.client_type_name,
          status_name: c.status_name,
          sector_name: c.sector_name,
          plan: c.plan,
          client_mobile: c.client_mobile,
          address: c.address,
          cycle: c.cycle,
        })),
      });
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ===============================
  // PROCESAMIENTO
  // ===============================
  useEffect(() => {
    if (!data || isLoading) return;

    const agrupado = data.results
      .filter((item) => {
        const estadoOk =
          estadosSeleccionados.includes("Todos") ||
          estadosSeleccionados.includes(item.status_name);

        const tipoOk =
          tiposSeleccionados.includes("Todos") ||
          tiposSeleccionados.includes(item.client_type_name);

        return estadoOk && tipoOk;
      })
      .reduce((acc, curr) => {
        if (!curr.sector_name) return acc;

        if (!acc[curr.sector_name]) {
          acc[curr.sector_name] = {
            urbanismo: curr.sector_name,
            cantidadClientes: 1,
            ingresos: Number(curr.plan?.cost || 0),
            clientes: [curr],
          };
        } else {
          acc[curr.sector_name].cantidadClientes += 1;
          acc[curr.sector_name].ingresos += Number(curr.plan?.cost || 0);
          acc[curr.sector_name].clientes.push(curr);
        }
        return acc;
      }, {});

    const arrayFinal = Object.values(agrupado).sort(
      (a, b) => b.ingresos - a.ingresos
    );

    setTopUrbanismos(arrayFinal.slice(...topRange));
    setTotalClientes(
      arrayFinal.reduce((acc, u) => acc + u.cantidadClientes, 0)
    );
  }, [data, isLoading, topRange, estadosSeleccionados, tiposSeleccionados]);

  // ===============================
  // EXCEL
  // ===============================
  const descargarExcel = () => {
    const rows = topUrbanismos.flatMap((u, i) =>
      u.clientes.map((c, idx) => ({
        Urbanismo: u.urbanismo,
        Cliente: c.client_name,
        Teléfono: c.client_mobile,
        Dirección: c.address,
        Plan: c.plan?.name,
        Costo: c.plan?.cost,
        Estado: c.status_name,
        Tipo: c.client_type_name,
        Nº: `${i + 1}.${idx + 1}`,
      }))
    );

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clientes");
    XLSX.writeFile(wb, "clientes.xlsx");
  };

  // ===============================
  // RENDER
  // ===============================
  if (isLoading) return <div>Cargando datos...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <LogoTitulo />
      <DropdownMenu />
      <PageNav />

      <div>
        <button onClick={() => setTopRange([0, 10])}>Top 10</button>
        <button onClick={() => setTopRange([0, 5000])}>Top Global</button>
      </div>

      <select
        multiple
        value={tiposSeleccionados}
        onChange={(e) =>
          setTiposSeleccionados(
            Array.from(e.target.selectedOptions, (o) => o.value)
          )
        }
      >
        <option value="Todos">Todos</option>
        <option value="PYME">Pyme</option>
        <option value="RESIDENCIAL">Residencial</option>
        <option value="GRATIS">Gratis</option>
      </select>

      <button>Total de clientes: {totalClientes}</button>

      <button onClick={() => setMostrarGraficos((p) => !p)}>
        {mostrarGraficos ? "Cerrar gráficos" : "Abrir gráficos"}
      </button>

      <button onClick={descargarExcel}>Descargar Excel</button>

      {mostrarGraficos && <ChartComponent urbanismos={topUrbanismos} />}

      <h3>Top Urbanismos</h3>
      <UrbanismoList urbanismos={topUrbanismos} />
    </div>
  );
}

function UrbanismoList({ urbanismos }) {
  const [abiertos, setAbiertos] = useState({});

  return (
    <ul>
      {urbanismos.map((u, i) => (
        <li key={i}>
          <strong>
            {i + 1}. {u.urbanismo} ({u.cantidadClientes})
          </strong>

          <button
            onClick={() =>
              setAbiertos((p) => ({ ...p, [i]: !p[i] }))
            }
          >
            {abiertos[i] ? "Ocultar" : "Ver clientes"}
          </button>

          {abiertos[i] && (
            <ul>
              {u.clientes.map((c, idx) => (
                <li key={idx}>
                  {c.client_name} – {c.plan?.name} (${c.plan?.cost})
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}

export default Ventas;
