
import "./Header.css";

function Header() {
  return (
    <header className="header">
      <div className="header-container">
        <div className="header-brand">
          <span className="brand-name">IW Connect</span>
          <span className="brand-description">
            Gestão de contatos
          </span>
        </div>

        <div className="header-user">
          <span>IW Corretora</span>
        </div>
      </div>
    </header>
  );
}

export default Header;
