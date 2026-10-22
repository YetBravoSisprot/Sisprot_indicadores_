import React, { createContext, useState, useEffect } from "react";
import largeArraydata from "../PasswordContext/data";
import { fetchContractsByStatus } from "../services/contractService";

// Filter out test contracts for "Freddy Carrillo" and "Bryant Reyes"
if (largeArraydata && Array.isArray(largeArraydata.results)) {
  largeArraydata.results = largeArraydata.results.filter(
    client => {
      if (!client) return false;
      const n = (client.client_name || "").toUpperCase().replace(/\s+/g, " ");
      return !n.includes("FREDDY CARRILLO") && !n.includes("BRYANT REYES");
    }
  );
}

const PasswordContext = createContext();

function PasswordProvider({ children }) {
  const [email, setEmail] = useState(localStorage.getItem("userEmail") || "");
  const [password, setPassword] = useState("");
  const [showPasswordState, setShowPasswordState] = useState(localStorage.getItem("isAuthenticated") !== "true");
  const getInitialFilteredData = () => {
    const jsonData = { ...largeArraydata };
    if (jsonData && jsonData.results) {
      const whitelist = ["ELISAUL REYES", "THAIS BEJAS"];
      jsonData.results = jsonData.results.filter(cliente => {
        if (!cliente) return false;
        const name = (cliente.client_name || "").toUpperCase().replace(/\s+/g, " ");
        if (name.includes("FREDDY CARRILLO") || name.includes("BRYANT REYES")) return false;
        const isWhitelisted = whitelist.some(w => name.includes(w.toUpperCase().replace(/\s+/g, " ")));
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
    return jsonData;
  };

  const [data, setData] = useState(getInitialFilteredData());
  const [isLoading, setIsLoading] = useState(false);
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
    { email: process.env.REACT_APP_USER18_EMAIL, password: process.env.REACT_APP_USER18_PASSWORD, role: "analista_atencion" },
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
    setConnectionStatus("Conectando con la API en tiempo real...");

    try {
      const res = await fetchContractsByStatus(["Todos"], false);
      if (res && res.results && res.results.length > 0) {
        setData({
          count: res.results.length,
          results: res.results
        });
        setConnectionStatus("✅ Datos actualizados en tiempo real");
        return;
      }
    } catch (apiErr) {
      console.warn("fetchContractsByStatus falló en PasswordContext, usando respaldo local:", apiErr);
      setConnectionStatus("⚠️ Cargado offline");
      if (largeArraydata && largeArraydata.results) {
        setData(largeArraydata);
      }
    } finally {
      setIsLoading(false);
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    fetchData(true);
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

