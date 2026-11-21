import { useEffect, useState } from "react";
import {
  Users,
  UserPlus,
  ShieldCheck,
  UserRound,
  Pencil,
  Search,
  X,
} from "lucide-react";

import * as userService from "../../services/userService.js";
import { useAuth } from "../../context/AuthContext.js";
import "./AdminUsers.css";

const FORM_INICIAL = {
  name: "",
  email: "",
  password: "",
};

function AdminUsers() {
  const { user } = useAuth();

  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [busca, setBusca] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const [formAberto, setFormAberto] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);

  useEffect(() => {
    if (user?.role !== "admin") return;

    let ativo = true;

    async function carregarUsuarios() {
      try {
        const dados = await userService.listar();

        if (ativo) setUsuarios(dados);
      } catch (error) {
        if (ativo) setErro(error.message);
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    carregarUsuarios();

    return () => {
      ativo = false;
    };
  }, [user?.role]);

  function abrirCadastro() {
    setUsuarioEditando(null);
    setForm(FORM_INICIAL);
    setErro("");
    setSucesso("");
    setFormAberto(true);
  }

  function abrirEdicao(usuario) {
    setUsuarioEditando(usuario);

    setForm({
      name: usuario.name,
      email: usuario.email,
      password: "",
    });

    setErro("");
    setSucesso("");
    setFormAberto(true);
  }

  function fecharFormulario() {
    if (salvando) return;

    setFormAberto(false);
    setUsuarioEditando(null);
    setForm(FORM_INICIAL);
    setErro("");
  }

  function alterarCampo(event) {
    const { name, value } = event.target;

    setForm((anterior) => ({
      ...anterior,
      [name]: value,
    }));
  }

  async function salvarUsuario(event) {
    event.preventDefault();

    setSalvando(true);
    setErro("");
    setSucesso("");

    try {
      const dados = {
        name: form.name.trim(),
        email: form.email.trim(),
      };

      if (usuarioEditando) {
        await userService.editar(
          usuarioEditando.id,
          dados
        );
      } else {
        await userService.criar({
          ...dados,
          password: form.password,
        });
      }
    } catch (error) {
      setErro(error.message);
      setSalvando(false);
      return;
    }

    setSucesso(
      usuarioEditando
        ? "Consultor atualizado com sucesso!"
        : "Consultor cadastrado com sucesso!"
    );

    setFormAberto(false);
    setUsuarioEditando(null);
    setForm(FORM_INICIAL);

    try {
      const atualizados = await userService.listar();

      setUsuarios(atualizados);
    } catch {
      setErro(
        "Cadastro salvo, mas não foi possível atualizar a lista."
      );
    } finally {
      setSalvando(false);
    }
  }

  const administradores = usuarios.filter(
    (usuario) => usuario.role === "admin"
  ).length;

  const consultores = usuarios.filter(
    (usuario) => usuario.role === "consultor"
  ).length;

  const termo = busca.trim().toLowerCase();

  const usuariosFiltrados = usuarios.filter(
    (usuario) =>
      usuario.name.toLowerCase().includes(termo) ||
      usuario.email.toLowerCase().includes(termo)
  );

  if (user?.role !== "admin") {
    return (
      <main className="admin-users">
        <p>Você não possui permissão para acessar esta área.</p>
      </main>
    );
  }

  return (
    <main className="admin-users">
      <div className="admin-users-container">

        <section className="team-heading">
          <div>
            <span className="team-label">
              ADMINISTRAÇÃO
            </span>

            <h1>Gerenciamento de equipe</h1>

            <p>
              Gerencie os usuários e consultores da IW Connect.
            </p>
          </div>

          <button
            type="button"
            className="team-primary-button"
            onClick={abrirCadastro}
            disabled={salvando}
          >
            <UserPlus size={18} />
            Novo consultor
          </button>
        </section>

        {/* Indicadores */}

        <section className="team-stats">
          <article className="team-stat-card">
            <Users size={22} />
            <span>Total de usuários</span>
            <strong>{usuarios.length}</strong>
          </article>

          <article className="team-stat-card">
            <ShieldCheck size={22} />
            <span>Administradores</span>
            <strong>{administradores}</strong>
          </article>

          <article className="team-stat-card">
            <UserRound size={22} />
            <span>Consultores</span>
            <strong>{consultores}</strong>
          </article>
        </section>

        {erro && (
          <div className="team-feedback team-error" role="alert">
            {erro}
          </div>
        )}

        {sucesso && (
          <div className="team-feedback team-success" role="status">
            {sucesso}
          </div>
        )}

        {/* Formulário */}

        {formAberto && (
          <section className="team-panel">

            <div className="team-panel-header">
              <h2>
                {usuarioEditando
                  ? "Editar consultor"
                  : "Cadastrar consultor"}
              </h2>

              <button
                type="button"
                className="team-icon-button"
                onClick={fecharFormulario}
                aria-label="Fechar formulário"
                disabled={salvando}
              >
                <X size={20} />
              </button>
            </div>

            <form
              className="team-form"
              onSubmit={salvarUsuario}
            >
              <div className="team-field">
                <label htmlFor="team-name">Nome completo</label>

                <input
                  id="team-name"
                  name="name"
                  value={form.name}
                  onChange={alterarCampo}
                  placeholder="Nome do consultor"
                  autoComplete="name"
                  maxLength={100}
                  required
                />
              </div>

              <div className="team-field">
                <label htmlFor="team-email">E-mail</label>

                <input
                  id="team-email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={alterarCampo}
                  placeholder="consultor@exemplo.com"
                  autoComplete="email"
                  maxLength={254}
                  required
                />
              </div>

              {!usuarioEditando && (
                <div className="team-field">
                  <label htmlFor="team-password">
                    Senha de acesso
                  </label>

                  <input
                    id="team-password"
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={alterarCampo}
                    placeholder="Mínimo de 12 caracteres"
                    autoComplete="new-password"
                    minLength={12}
                    maxLength={72}
                    required
                  />

                  <small>
                    O consultor utilizará esta senha para entrar no sistema.
                  </small>
                </div>
              )}

              <div className="team-form-actions">
                <button
                  type="button"
                  className="team-secondary-button"
                  onClick={fecharFormulario}
                  disabled={salvando}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="team-primary-button"
                  disabled={salvando}
                >
                  {salvando
                    ? "Salvando..."
                    : usuarioEditando
                      ? "Salvar alterações"
                      : "Cadastrar consultor"}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Listagem */}

        <section className="team-panel">
          <div className="team-panel-header">
            <h2>Usuários cadastrados</h2>
          </div>

          <div className="team-search">
            <Search size={18} />

            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Pesquisar nome ou e-mail"
              aria-label="Pesquisar usuários"
            />
          </div>

          {carregando ? (
            <p className="team-empty">
              Carregando usuários...
            </p>
          ) : usuariosFiltrados.length === 0 ? (
            <p className="team-empty">
              Nenhum usuário encontrado.
            </p>
          ) : (
            <div className="team-list">

              {usuariosFiltrados.map((usuario) => (
                <article
                  className="team-user"
                  key={usuario.id}
                >
                  <div className="team-user-avatar">
                    {usuario.role === "admin"
                      ? <ShieldCheck size={23} />
                      : <UserRound size={23} />}
                  </div>

                  <div className="team-user-info">
                    <strong>{usuario.name}</strong>
                    <span>{usuario.email}</span>

                    <span
                      className={`team-role ${
                        usuario.role === "admin"
                          ? "team-role-admin"
                          : "team-role-consultor"
                      }`}
                    >
                      {usuario.role === "admin"
                        ? "Administrador"
                        : "Consultor"}
                    </span>
                  </div>

                  {usuario.role === "consultor" && (
                    <button
                      type="button"
                      className="team-secondary-button"
                      onClick={() => abrirEdicao(usuario)}
                      disabled={salvando}
                    >
                      <Pencil size={15} />
                      Editar
                    </button>
                  )}
                </article>
              ))}

            </div>
          )}
        </section>

      </div>
    </main>
  );
}

export default AdminUsers;