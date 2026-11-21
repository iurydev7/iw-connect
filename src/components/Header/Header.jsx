import { useState } from "react";
import iconIW from "../../assets/branding/icone-branco.svg";
import "./Header.css";
import { UserRound, ChevronDown, LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext.js";

const APP_VERSION = "0.1.0";

const menuItems = [
  { id: "dashboard", label: "Dashboard" },
  { id: "contatos", label: "Leads" },
  { id: "importar", label: "Importar contatos" },
];

function Header({ onOpenUsers, onOpenDashboard, showNav = true }) {
  const { user, logout } = useAuth();

  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  const roleLabel = user?.role === "admin" ? "Administrador" : "Usuário";

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
  const [activeSection, setActiveSection] = useState("dashboard");

  function navegarPara(id) {
    if (!showNav) {
      onOpenDashboard();
      setActiveSection("dashboard");
      return;
    }

    const destino = document.getElementById(id);

    if (!destino) return;

    setActiveSection(id);

    destino.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <header className="header">
      <div className="header-container">
        <div className="header-top">
          {/* Identidade do sistema */}
          <a
            href="#dashboard"
            className="header-brand"
            aria-label="Voltar ao Dashboard"
            onClick={(event) => {
              event.preventDefault();
              navegarPara("dashboard");
            }}
          >
            <img src={iconIW} alt="IW" className="header-icon" />

            <div className="header-system">
              <div className="header-title-row">
                <span className="header-connect">
                  Connect<span className="connect-dot">.</span>
                </span>

                <span className="header-version">v{APP_VERSION}</span>
              </div>

              <span className="header-subtitle">
                CRM de Leads e Atendimento
              </span>
            </div>
          </a>

          {/* Área administrativa */}
          <div className="header-admin">
            <details className="header-profile">
              <summary className="header-profile-trigger">
                <div className="admin-avatar">
                  <UserRound size={20} />
                </div>

                <div className="header-profile-info">
                  <strong>{user?.name}</strong>
                  <span>{roleLabel}</span>
                </div>

                <ChevronDown size={16} />
              </summary>

              <div className="header-profile-menu">
                <span className="profile-menu-label">MEU PERFIL</span>

                <strong>{user?.name}</strong>
                <span>{user?.email}</span>

                <div className="profile-role">{roleLabel}</div>
              </div>
            </details>

            <button
              type="button"
              className="header-logout"
              onClick={handleLogout}
              disabled={loggingOut}
              aria-label="Sair do sistema"
            >
              <LogOut size={18} />

              <span>{loggingOut ? "Saindo..." : "Sair"}</span>
            </button>

            {logoutError && (
              <p className="header-logout-error" role="alert">
                {logoutError}
              </p>
            )}
          </div>
        </div>

        {/* Navegação */}
        <nav className="header-nav" aria-label="Navegação principal">
          {showNav ? (
            menuItems
              .filter(
                (item) => user?.role === "admin" || item.id !== "importar",
              )
              .map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`nav-link ${
                    activeSection === item.id ? "nav-active" : ""
                  }`}
                  onClick={() => navegarPara(item.id)}
                >
                  {item.label}
                </button>
              ))
          ) : (
            <button
              type="button"
              className="nav-link"
              onClick={() => navegarPara("dashboard")}
            >
              Voltar ao Dashboard
            </button>
          )}

          {user?.role === "admin" && (
            <button
              type="button"
              className={`nav-link ${!showNav ? "nav-active" : ""}`}
              onClick={onOpenUsers}
            >
              Gerenciar equipe
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}

export default Header;
