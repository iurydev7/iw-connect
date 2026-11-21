import { useState } from "react";
import Header from "./components/Header/Header";
import Dashboard from "./pages/Dashboard/Dashboard";
import Login from "./pages/Login/Login";
import AdminUsers from "./pages/AdminUsers/AdminUsers";
import AuthProvider from "./context/AuthProvider";
import { useAuth } from "./context/AuthContext";

import "./App.css";
import "./styles/theme.css";

function AreaLogada() {
  const { user } = useAuth();

  const [pagina, setPagina] = useState("dashboard");

  const isAdmin = user?.role === "admin";

  const exibirEquipe = isAdmin && pagina === "equipe";

  return (
    <>
      <Header
        onOpenUsers={() => setPagina("equipe")}
        onOpenDashboard={() => setPagina("dashboard")}
        showNav={!exibirEquipe}
      />

      {exibirEquipe ? <AdminUsers /> : <Dashboard />}
    </>
  );
}

function AppContent() {
  const {
    isAuthenticated,
    loading,
    sessionError,
  } = useAuth();

  if (loading) {
    return <p>Carregando...</p>;
  }

  if (sessionError) {
    return (
      <div>
        <p>{sessionError}</p>

        <button onClick={() => window.location.reload()}>
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return <AreaLogada />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;