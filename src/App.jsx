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
  const [carteiraSupervisionada, setCarteiraSupervisionada] = useState(null);

  const isAdmin = ["admin", "master"].includes(user?.role);
  const exibirEquipe = isAdmin && pagina === "equipe";

  function abrirDashboard() {
    setCarteiraSupervisionada(null);
    setPagina("dashboard");
  }

  function visualizarCarteira(consultorId) {
    if (user?.role !== "master") return;

    setCarteiraSupervisionada(consultorId);
    setPagina("dashboard");
  }

  return (
    <>
      <Header
        onOpenUsers={() => setPagina("equipe")}
        onOpenDashboard={abrirDashboard}
        showNav={!exibirEquipe}
      />

      {exibirEquipe ? (
        <AdminUsers onViewPortfolio={visualizarCarteira} />
      ) : (
        <Dashboard
          key={carteiraSupervisionada || "padrao"}
          responsavelInicial={carteiraSupervisionada}
          onReturnHome={abrirDashboard}
        />
      )}
    </>
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
