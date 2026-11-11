
import { useState } from "react";
import iconIW from "../../assets/branding/icone-branco.svg";
import "./Header.css";

const APP_VERSION = "0.1.0";

const menuItems = [
  { id: "dashboard", label: "Dashboard" },
  { id: "contatos", label: "Leads" },
  { id: "importar", label: "Importar contatos" },
];

function Header() {
  const [activeSection, setActiveSection] = useState("dashboard");

  function navegarPara(id) {
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
            <img
              src={iconIW}
              alt="IW"
              className="header-icon"
            />

            <div className="header-system">
              <div className="header-title-row">
                <span className="header-connect">
                  Connect<span className="connect-dot">.</span>
                </span>

                <span className="header-version">
                  v{APP_VERSION}
                </span>
              </div>

              <span className="header-subtitle">
                CRM de Leads e Atendimento
              </span>
            </div>
          </a>

          {/* Área administrativa */}
          <div className="header-admin">
            <span className="admin-label">
              Área administrativa
            </span>

            <div className="admin-avatar" aria-hidden="true">
              <span>ADM</span>
            </div>
          </div>

        </div>

        {/* Navegação */}
        <nav className="header-nav" aria-label="Navegação principal">
          {menuItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav-link ${
                activeSection === item.id ? "nav-active" : ""
              }`}
              onClick={() => navegarPara(item.id)}
              aria-current={
                activeSection === item.id ? "location" : undefined
              }
            >
              {item.label}
            </button>
          ))}
        </nav>

      </div>
    </header>
  );
}

export default Header;
