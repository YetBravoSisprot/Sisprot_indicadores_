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

  useEffect(() => {
    const fetchData = async () => {
      try {
        // console.log("URL:", api);
        // console.log("Token:", token);

        // const response = await fetch(api, {
        //   headers: {
        //     Authorization: `Bearer ${token}`,
        //   },
        // });

        // if (!response.ok) {
        //   throw new Error(`Error al cargar los datos: ${response.statusText}`);
        // }

        // const jsonData = await response.json();
        //               **            //
        // aqui en vez de usar la api usare datos fiticios ya que es informacion privada de la empresa//
        const jsonData = largeArraydata

        setData(jsonData);
        setIsLoading(false);
      } catch (error) {
        setError(error);
        setIsLoading(false);
      }
    };

    fetchData();
  }, [api, token]);

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
      }}
    >
      {children}
    </PasswordContext.Provider>
  );
}

export { PasswordProvider, PasswordContext };

