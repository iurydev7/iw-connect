import {
  ContactRound,
  ChevronLeft,
  LayoutDashboard,
  LogOut,
  Menu,
  UsersRound,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext.js";
import iconIW from "../../assets/branding/icone-app-azul.png";
import "./AppShell.css";

const APP_VERSION = "2.0";

const PAGE_LABELS = {
  dashboard: "Visão geral",
  wallet: "Minha carteira",
  leads: "Leads gerais",
  team: "Equipe",
};

function AppShell({ page, onNavigate, children }) {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const previousPageRef = useRef(page);
  const [previousPage, setPreviousPage] = useState(page);

  const isAdmin = ["admin", "master"].includes(user?.role);
  const roleLabel =
    user?.role === "master"
      ? "Master"
      : user?.role === "admin"
        ? "Administrador"
        : "Consultor";

  const navigation = [
    { id: "dashboard", label: "Visão geral", icon: LayoutDashboard },
    { id: "wallet", label: "Minha carteira", icon: ContactRound },
    { id: "leads", label: "Leads gerais", icon: UsersRound },
    ...(isAdmin
      ? [{ id: "team", label: "Equipe", icon: UsersRound }]
      : []),
  ];

  useEffect(() => {
    if (previousPageRef.current !== page) {
      setPreviousPage(previousPageRef.current);
      previousPageRef.current = page;
    }
  }, [page]);

  async function handleLogout() {
    setLoggingOut(true);
    setLogoutError("");

    try {
      await logout();
    } catch {
      setLogoutError("Não foi possível encerrar a sessão.");
    } finally {
      setLoggingOut(false);
    }
  }

  function navigate(id) {
    onNavigate(id);
    setSidebarOpen(false);
  }

  return (
    <div className="app-shell">
      <button
        type="button"
        className={`app-sidebar-backdrop ${sidebarOpen ? "is-visible" : ""}`}
        aria-label="Fechar menu"
        onClick={() => setSidebarOpen(false)}
      />

      <aside className={`app-sidebar ${sidebarOpen ? "is-open" : ""}`}>
        <button
          type="button"
          className="app-brand"
          onClick={() => navigate("dashboard")}
          aria-label="IW Connect 2.0 — ir para Visão geral"
        >
          <img src={iconIW} alt="" className="app-brand-icon" />
          <span className="app-brand-copy">
            <strong>Connect</strong>
            <span>v{APP_VERSION}</span>
          </span>
        </button>

        <div className="app-nav-label">MENU PRINCIPAL</div>
        <nav className="app-nav" aria-label="Navegação principal">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={`app-nav-link ${page === id ? "is-active" : ""}`}
              aria-current={page === id ? "page" : undefined}
              onClick={() => navigate(id)}
              title={label}
            >
              <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="app-sidebar-footer">
          <div className="app-user-avatar" aria-hidden="true">
            {(user?.name || "U").slice(0, 1).toUpperCase()}
          </div>
          <div className="app-user-copy">
            <strong>{user?.name}</strong>
            <span>{roleLabel}</span>
          </div>
        </div>
      </aside>

      <div className="app-workspace">
        <header className="app-topbar">
          <button
            type="button"
            className="app-mobile-menu"
            aria-label={sidebarOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen((open) => !open)}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <button
            type="button"
            className="app-breadcrumb"
            onClick={() =>
              onNavigate(previousPage === page ? "dashboard" : previousPage)
            }
            aria-label={`Voltar para ${PAGE_LABELS[previousPage] || "Visão geral"}`}
            title={`Voltar para ${PAGE_LABELS[previousPage] || "Visão geral"}`}
          >
            <ChevronLeft size={16} aria-hidden="true" />
            <span>IW Connect</span>
            <span className="app-breadcrumb-divider">/</span>
            <strong>{PAGE_LABELS[page] || PAGE_LABELS.dashboard}</strong>
          </button>
          <button
            type="button"
            className="app-logout"
            onClick={handleLogout}
            disabled={loggingOut}
            title="Sair do sistema"
          >
            <LogOut size={17} />
            <span>{loggingOut ? "Saindo..." : "Sair"}</span>
          </button>
          {logoutError && (
            <span className="app-logout-error" role="alert">
              {logoutError}
            </span>
          )}
        </header>
        <div className={`app-page app-page-${page}`} key={page}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default AppShell;
