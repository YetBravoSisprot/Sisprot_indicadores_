import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useContext } from "react";
import Loging from "./page/Loging/Loging";
import MouseSpotlight from "./Componentes/MouseSpotlight/MouseSpotlight";
import TopUrbanismo from "./page/TopUrbanismo/TopUrbanismo";
import Indicadores from "./page/Indicadores/Indicadores";
import Admin from "./page/Admin/Admin";
import PageNotFound from "./page/PageNotFound/PageNotFound";
import Ventas from "./page/ventas/Ventas";
import VentasGlobales from "./page/ventas/VentasGlobales";
import Reactivados from "./page/Reactivados/Reactivados";
import { PasswordProvider, PasswordContext } from "./PasswordContext/PasswordContext";

import Chatbot from "./Componentes/Chatbot/Chatbot";

function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, role: userRole } = useContext(PasswordContext);

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  if (roles && !roles.includes(userRole)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function App() {
  return (
    <PasswordProvider>
      <AppContent />
    </PasswordProvider>
  );
}

function AppContent() {
  const { isAuthenticated } = useContext(PasswordContext);

  return (
    <BrowserRouter>
      <MouseSpotlight />
      {isAuthenticated && <Chatbot />}
      <Routes>
        <Route path="/" element={<Loging />} />

        <Route
          path="TopUrbanismo"
          element={
            <ProtectedRoute roles={["admin"]}>
              <TopUrbanismo />
            </ProtectedRoute>
          }
        />

        <Route
          path="Indicadores"
          element={
            <ProtectedRoute roles={["admin"]}>
              <Indicadores />
            </ProtectedRoute>
          }
        />

        <Route
          path="Admin"
          element={
            <ProtectedRoute roles={["admin"]}>
              <Admin />
            </ProtectedRoute>
          }
        />

        <Route
          path="Ventas"
          element={
            <ProtectedRoute roles={["admin", "ventas"]}>
              <Ventas />
            </ProtectedRoute>
          }
        />

        <Route
          path="VentasGlobales"
          element={
            <ProtectedRoute roles={["admin", "ventas"]}>
              <VentasGlobales />
            </ProtectedRoute>
          }
        />

        <Route
          path="Reactivados"
          element={
            <ProtectedRoute roles={["admin", "analista_atencion"]}>
              <Reactivados />
            </ProtectedRoute>
          }
        />

       

        <Route
          path="*"
          element={
            <ProtectedRoute roles={["admin", ""]}>
              <PageNotFound />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
