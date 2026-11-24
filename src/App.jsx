import { useState } from "react";
import AppShell from "./components/AppShell/AppShell";
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
  const [filtrosPagina, setFiltrosPagina] = useState(null);
  const [carteiraSupervisionada, setCarteiraSupervisionada] = useState(null);

  const isAdmin = ["admin", "master"].includes(user?.role);
  const exibirEquipe = isAdmin && pagina === "team";

  function abrirDashboard() {
    setCarteiraSupervisionada(null);
    setFiltrosPagina(null);
    setPagina("dashboard");
  }

  function navegar(paginaDestino, filtros = null) {
    setCarteiraSupervisionada(null);
    setFiltrosPagina(filtros);
    setPagina(paginaDestino);
  }

  function visualizarCarteira(consultorId) {
    if (user?.role !== "master") return;

    setCarteiraSupervisionada(consultorId);
    setFiltrosPagina(null);
    setPagina("wallet");
  }

  return (
    <AppShell page={pagina} onNavigate={navegar}>
      {exibirEquipe ? (
        <AdminUsers onViewPortfolio={visualizarCarteira} />
      ) : (
        <Dashboard
          key={`${pagina}-${carteiraSupervisionada || "padrao"}`}
          page={pagina}
          filtrosIniciais={filtrosPagina}
          responsavelInicial={carteiraSupervisionada}
          onReturnHome={abrirDashboard}
          onNavigate={navegar}
        />
      )}
    </AppShell>
  );
}

function AppContent() {
  const { isAuthenticated, loading, sessionError } = useAuth();

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
