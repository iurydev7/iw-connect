import { useState } from "react";
import {
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  Users,
  BarChart3,
  TrendingUp,
  LogIn,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext.js";
import iconIW from "../../assets/branding/icone-branco.svg";
import officeBackground from "../../assets/branding/login-office.png";

import "./Login.css";

function LoginBrand() {
  return (
    <div className="login-brand">
      <img src={iconIW} alt="IW" />
      <span>Connect</span>
      <small>CRM</small>
    </div>
  );
}

export default function Login() {
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setNotice("");
    setLoading(true);

    try {
      await login(email, password, remember);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="login-page"
      style={{
        "--login-office": `url("${officeBackground}")`,
      }}
    >
      <img className="login-wall-logo" src={iconIW} alt="" />

      <div className="login-layout">
        <section className="login-intro">
          <LoginBrand />

          <h1>
            Gestão de
            <strong>Leads e Atendimentos</strong>
          </h1>

          <p>
            Organize seus contatos, acompanhe oportunidades e aumente suas
            vendas.
          </p>

          <ul className="login-benefits">
            <li>
              <div>
                <Users />
              </div>
              Controle de leads
            </li>

            <li>
              <div>
                <BarChart3 />
              </div>
              Histórico de atendimentos
            </li>

            <li>
              <div>
                <TrendingUp />
              </div>
              Mais resultados
            </li>
          </ul>
        </section>

        <section className="login-card">
          <LoginBrand />

          <div className="login-heading">
            <h2>Acesse sua conta</h2>
            <p>Entre no IW Connect e gerencie seus leads.</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-field">
              <Mail size={23} />

              <input
                type="email"
                placeholder="E-mail"
                aria-label="E-mail"
                value={email}
                autoComplete="email"
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="login-field">
              <LockKeyhole size={23} />

              <input
                type={showPassword ? "text" : "password"}
                placeholder="Senha"
                aria-label="Senha"
                value={password}
                autoComplete="current-password"
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <button
                type="button"
                className="login-password-toggle"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <Eye /> : <EyeOff />}
              </button>
            </div>

            <div className="login-options">
              <label>
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                Lembrar meu acesso
              </label>

              <button
                type="button"
                className="login-link"
                onClick={() =>
                  setNotice("Solicite a recuperação ao administrador.")
                }
              >
                Esqueceu sua senha?
              </button>
            </div>

            {error && (
              <p className="login-error" role="alert">
                {error}
              </p>
            )}

            {notice && (
              <p className="login-notice" role="status">
                {notice}
              </p>
            )}

            <button type="submit" className="login-submit" disabled={loading}>
              <LogIn size={25} />
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <p className="login-register">
            Ainda não tem uma conta?{" "}
            <button
              type="button"
              className="login-link"
              onClick={() => setNotice("Solicite seu acesso ao administrador.")}
            >
              Criar conta
            </button>
          </p>
        </section>
      </div>
    </main>
  );
}
