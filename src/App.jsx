import Header from "./components/Header/Header";
import Dashboard from "./pages/Dashboard/Dashboard";
import Login from "./pages/Login/Login";

import AuthProvider from "./context/AuthProvider";
import { useAuth } from "./context/AuthContext";

import "./App.css";

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

  return (
    <>
      <Header />
      <Dashboard />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;