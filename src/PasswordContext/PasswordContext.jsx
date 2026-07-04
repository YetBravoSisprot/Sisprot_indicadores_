import React, { createContext, useState, useEffect } from "react";
import largeArraydata from "../PasswordContext/data";

const PasswordContext = createContext();

function PasswordProvider({ children }) {
  const [email, setEmail] = useState(localStorage.getItem("userEmail") || "");
  const [password, setPassword] = useState("");
  const [showPasswordState, setShowPasswordState] = useState(localStorage.getItem("isAuthenticated") !== "true");
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [role, setRole] = useState(localStorage.getItem("userRole") || null);
  const [isAuthenticated, setIsAuthenticated] = useState(localStorage.getItem("isAuthenticated") === "true");
  const [isUpdating, setIsUpdating] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("Conectando...");
  const token = process.env.REACT_APP_TOKEN_KEY;
  const api = process.env.REACT_APP_API;

  const users = [
    { email: process.env.REACT_APP_USER1_EMAIL, password: process.env.REACT_APP_USER1_PASSWORD, role: "admin" },
    { email: process.env.REACT_APP_USER2_EMAIL, password: process.env.REACT_APP_USER2_PASSWORD, role: "admin" },
    { email: process.env.REACT_APP_USER3_EMAIL, password: process.env.REACT_APP_USER3_PASSWORD, role: "admin" },
    { email: process.env.REACT_APP_USER4_EMAIL, password: process.env.REACT_APP_USER4_PASSWORD, role: "admin" },
    { email: process.env.REACT_APP_USER5_EMAIL, password: process.env.REACT_APP_USER5_PASSWORD, role: "admin" },
    { email: process.env.REACT_APP_USER6_EMAIL, password: process.env.REACT_APP_USER6_PASSWORD, role: "admin" },
    { email: process.env.REACT_APP_USER7_EMAIL, password: process.env.REACT_APP_USER7_PASSWORD, role: "ventas" },
    { email: process.env.REACT_APP_USER8_EMAIL, password: process.env.REACT_APP_USER8_PASSWORD, role: "admin" },
    { email: process.env.REACT_APP_USER9_EMAIL, password: process.env.REACT_APP_USER9_PASSWORD, role: "admin" },
    { email: process.env.REACT_APP_USER10_EMAIL, password: process.env.REACT_APP_USER10_PASSWORD, role: "admin" },
    { email: process.env.REACT_APP_USER11_EMAIL, password: process.env.REACT_APP_USER11_PASSWORD, role: "admin" },
    { email: process.env.REACT_APP_USER12_EMAIL, password: process.env.REACT_APP_USER11_PASSWORD, role: "ventas" },
    { email: process.env.REACT_APP_USER13_EMAIL, password: process.env.REACT_APP_USER11_PASSWORD, role: "admin" },
    { email: process.env.REACT_APP_USER17_EMAIL, password: process.env.REACT_APP_USER17_PASSWORD, role: "ventas" },
  ];

  const handleLoginClick = (e) => {
    e.preventDefault();
    login(email, password);
  };

  const login = (inputEmail, inputPassword) => {
    if (!inputEmail.trim() || !inputPassword.trim()) {
      setError("Por favor ingresa usuario y contraseña.");
      setIsAuthenticated(false);
      return;
    }

    const user = users.find(
      (user) => user.email && user.email === inputEmail && user.password === inputPassword
    );

    if (user) {
      localStorage.setItem("userEmail", inputEmail);
      localStorage.setItem("userRole", user.role);
      localStorage.setItem("isAuthenticated", "true");
      setRole(user.role);
      setShowPasswordState(false);
      setIsAuthenticated(true);
      setEmail(inputEmail);
    } else {
      setPassword("");
      setError("Credenciales incorrectas");
      setIsAuthenticated(false);
      localStorage.removeItem("userEmail");
      localStorage.removeItem("userRole");
      localStorage.removeItem("isAuthenticated");
    }
  };

  const logout = () => {
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userRole");
    localStorage.removeItem("isAuthenticated");
    setEmail("");
    setPassword("");
    setRole(null);
    setIsAuthenticated(false);
    setShowPasswordState(true);
  };
  const fetchData = async (isBackground = false) => {
    if (isBackground) {
      setIsUpdating(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    let apiResults = [];
    const apiKey = "xK9pW2vM4zY0nR1tQ5sJ8hF3cD6aB1uE9iO2mN7rT4bV5xS8gL";
    const urls = [
      "https://api.sisprotgf.com/api/public/contracts/?status=16&remove_pagination=True&cycle=10&page=1&provisional=True&client_type=2",
      "https://api.sisprotgf.com/api/public/contracts/?status=16&remove_pagination=True&cycle=25&page=1&provisional=True&client_type=2",
      "https://api.sisprotgf.com/api/public/contracts/?status=16&remove_pagination=True&cycle=1&page=1&provisional=True&client_type=1",
      "https://api.sisprotgf.com/api/public/contracts/?status=19&remove_pagination=True&cycle=1&page=1&provisional=True&client_type=1"
    ];

    setConnectionStatus("Conectando con la API...");

    try {
      let failedCount = 0;
      let lastErrorMessage = "";

      const fetchPromises = urls.map(async (url, idx) => {
        const urlController = new AbortController();
        const timeoutId = setTimeout(() => urlController.abort(), 15000); // 15 seconds timeout
        try {
          const response = await fetch(url, {
            method: "GET",
            signal: urlController.signal,
            headers: {
              "X-API-KEY": apiKey.trim(),
              "Accept": "application/json"
            }
          });
          clearTimeout(timeoutId);
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          return await response.json();
        } catch (apiErr) {
          clearTimeout(timeoutId);
          failedCount++;
          lastErrorMessage = apiErr.message || String(apiErr);
          console.warn(`URL ${idx + 1} failed or timed out. Falling back to local data for this category.`, apiErr);
          
          if (largeArraydata && largeArraydata.results) {
            if (idx === 0) {
              // Pymes Activos Ciclo 10
              return largeArraydata.results.filter(c => 
                c.status_name === "Activo" && c.cycle === 10 && c.client_type_name === "PYME"
              );
            } else if (idx === 1) {
              // Pymes Activos Ciclo 25
              return largeArraydata.results.filter(c => 
                c.status_name === "Activo" && c.cycle === 25 && c.client_type_name === "PYME"
              );
            } else if (idx === 2) {
              // Residenciales Activos Ciclo 1
              return largeArraydata.results.filter(c => 
                c.status_name === "Activo" && c.cycle === 1 && c.client_type_name === "RESIDENCIAL"
              );
            } else if (idx === 3) {
              // Suspendidos Residenciales Ciclo 1
              return largeArraydata.results.filter(c => 
                c.status_name === "Suspendido" && c.cycle === 1 && c.client_type_name === "RESIDENCIAL"
              );
            }
          }
          return [];
        }
      });
      
      const lists = await Promise.all(fetchPromises);
      apiResults = lists.flat();

      if (failedCount === 0) {
        setConnectionStatus("✅ Datos actualizados en tiempo real");
      } else if (failedCount === urls.length) {
        setConnectionStatus(`⚠️ Cargado offline (Error: ${lastErrorMessage})`);
      } else {
        setConnectionStatus(`⚠️ Conexión parcial (Fallaron ${failedCount} de 4 consultas. Error: ${lastErrorMessage})`);
      }
    } catch (apiErr) {
      console.error("General error in fetching process, falling back to all local data:", apiErr);
      apiResults = largeArraydata.results;
      setConnectionStatus("⚠️ Cargado offline (Error crítico en proceso de descarga)");
    }

    try {
      // Map local data by ID for fast lookup
      const localDataMap = new Map();
      if (largeArraydata && largeArraydata.results) {
        largeArraydata.results.forEach(item => {
          if (item && item.id) {
            localDataMap.set(item.id, item);
          }
        });
      }

      // Merge API data with local data details
      const mergedResults = apiResults.map(c => {
        if (!c) return null;
        if (c.client_name !== undefined) {
          return c; // Already in local format if we fell back
        }

        const local = localDataMap.get(c.id) || {};
        
        const status = c.status_name || "N/A";
        const clientType = c.client_type?.name || "N/A";
        const clientSubdivision = `${status.toUpperCase()}_${clientType.toUpperCase()}`;

        return {
          id: c.id,
          client_name: c.client?.full_name || local.client_name || "Sin nombre",
          client_type_name: clientType,
          client_subdivision: clientSubdivision,
          status_name: status,
          cycle: c.cycle !== undefined && c.cycle !== null ? c.cycle : local.cycle,
          migrate: local.migrate !== undefined ? local.migrate : false,
          sector_name: local.sector_name || "",
          plan: c.plan || local.plan || { id: null, name: "N/A", cost: "0.00" },
          client_mobile: c.client?.mobile || local.client_mobile || "N/A",
          client_email: c.client?.email || local.client_email || "N/A",
          address: local.address || "",
          client_identification: c.client?.identification || local.client_identification || "N/A",
          created_at: c.created_at || local.created_at || null,
          service_detail: local.service_detail || null,
          nap_box_name: local.nap_box_name || "",
          ip_name: local.ip_name || "",
          mac_address: local.mac_address || ""
        };
      }).filter(Boolean);

      const jsonData = {
        count: mergedResults.length,
        results: mergedResults
      };

      // Filtrar globalmente registros que contengan "PRUEBA" en cualquier campo relevante
      if (jsonData && jsonData.results) {
        const whitelist = ["ELISAUL REYES", "BRYANT REYES", "THAIS BEJAS"];
        jsonData.results = jsonData.results.filter(cliente => {
          if (!cliente) return false;
          const name = (cliente.client_name || "").toUpperCase();
          const isWhitelisted = whitelist.some(w => name.includes(w.toUpperCase()));
          if (isWhitelisted) return true;

          const searchFields = [
            cliente.client_name,
            cliente.address,
            cliente.sector_name,
            cliente.client_mobile,
            cliente.client_identification,
            cliente.client_type_name,
            cliente.plan?.name
          ];
          return !searchFields.some(val =>
            val !== null && val !== undefined && String(val).toUpperCase().includes("PRUEBA")
          );
        });
      }

      setData(jsonData);
    } catch (err) {
      console.error("Critical error in data merging/processing, using local data raw:", err);
      setError(err);
      setData(largeArraydata);
    } finally {
      setIsLoading(false);
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Lógica de Cierre de Sesión Automático por Inactividad (10 minutos)
  useEffect(() => {
    // Solo activamos el temporizador si el usuario está autenticado
    if (!isAuthenticated) return;

    let inactivityTimer;
    const INACTIVITY_LIMIT = 10 * 60 * 1000; // 10 minutos en milisegundos

    const resetTimer = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        console.log("Sesión cerrada por inactividad");
        logout();
      }, INACTIVITY_LIMIT);
    };

    // Lista de eventos que se consideran "actividad del usuario"
    const activityEvents = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];

    // Añadir escuchas de eventos al objeto window
    activityEvents.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    // Iniciar el temporizador inmediatamente
    resetTimer();

    // Limpiar eventos y temporizador al cerrar sesión o desmontar componente
    return () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      activityEvents.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [isAuthenticated]);

  return (
    <PasswordContext.Provider
      value={{
        setEmail,
        email,
        setPassword,
        password,
        showPasswordState,
        handleLoginClick,
        data,
        isLoading,
        error,
        role,
        isAuthenticated,
        setIsAuthenticated,
        login,
        logout,
        fetchData,
        isUpdating,
        connectionStatus,
      }}
    >
      {children}
    </PasswordContext.Provider>
  );
}

export { PasswordProvider, PasswordContext };

