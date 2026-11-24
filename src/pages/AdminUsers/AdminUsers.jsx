import { useEffect, useState } from "react";
import {
  Users,
  UserPlus,
  ShieldCheck,
  UserRound,
  Pencil,
  KeyRound,
  Search,
  Eye,
  X,
  Trash2,
} from "lucide-react";
import { alertaIW } from "../../utils/alertas";
import * as userService from "../../services/userService.js";
import { useAuth } from "../../context/AuthContext.js";
import "./AdminUsers.css";

const FORM_INICIAL = {
  name: "",
  email: "",
  password: "",
  role: "consultor",
};

function AdminUsers({ onViewPortfolio }) {
  const { user } = useAuth();

  const isMaster = user?.role === "master";
  const isGestor = ["admin", "master"].includes(user?.role);

  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [busca, setBusca] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const [formAberto, setFormAberto] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);

  const [usuarioSenha, setUsuarioSenha] = useState(null);
  const [novaSenha, setNovaSenha] = useState("");

  // =====================================
  // CARREGAMENTO DOS USUÁRIOS
  // =====================================

  useEffect(() => {
    if (!isGestor) {
      setCarregando(false);
      return;
    }

    let ativo = true;

    async function carregarUsuarios() {
      try {
        const dados = await userService.listar();

        if (ativo) {
          setUsuarios(dados);
          setErro("");
        }
      } catch (error) {
        if (ativo) {
          setErro(error.message);
        }
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    }

    carregarUsuarios();

    return () => {
      ativo = false;
    };
  }, [isGestor]);

  async function atualizarLista() {
    const dados = await userService.listar();
    setUsuarios(dados);
  }

  async function removerUsuario(usuario) {
    if (!podeGerenciarUsuario(usuario) || salvando) {
      return;
    }

    const confirmacao = await alertaIW.fire({
      icon: "warning",
      title: "Remover usuário?",
      text:
        `${usuario.name} perderá o acesso ao sistema. ` +
        "Os leads atribuídos serão liberados para redistribuição.",
      showCancelButton: true,
      confirmButtonText: "Sim, remover",
      cancelButtonText: "Cancelar",
      reverseButtons: true,
      focusCancel: true,
    });

    if (!confirmacao.isConfirmed) return;

    setSalvando(true);
    setErro("");
    setSucesso("");

    try {
      const resultado = await userService.remover(usuario.id);

      await atualizarLista();

      setSucesso(
        `Usuário removido com sucesso! ` +
          `${resultado.leadsLiberados ?? 0} leads liberados.`,
      );
    } catch (error) {
      console.error("Erro ao remover usuário:", error);

      setErro(error.message || "Não foi possível remover o usuário.");
    } finally {
      setSalvando(false);
    }
  }

  // =====================================
  // CONTROLE DOS FORMULÁRIOS
  // =====================================

  function abrirCadastro() {
    setUsuarioSenha(null);
    setNovaSenha("");

    setUsuarioEditando(null);
    setForm(FORM_INICIAL);

    setErro("");
    setSucesso("");
    setFormAberto(true);
  }

  function abrirEdicao(usuario) {
    setUsuarioSenha(null);
    setNovaSenha("");

    setUsuarioEditando(usuario);

    setForm({
      name: usuario.name,
      email: usuario.email,
      password: "",
      role: usuario.role,
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

  // =====================================
  // CADASTRO E EDIÇÃO
  // =====================================

  async function salvarUsuario(event) {
    event.preventDefault();

    if (salvando) return;

    setSalvando(true);
    setErro("");
    setSucesso("");

    const editando = Boolean(usuarioEditando);
    const tipoUsuario = form.role === "admin" ? "Administrador" : "Consultor";

    try {
      const dados = {
        name: form.name.trim(),
        email: form.email.trim(),
      };

      if (editando) {
        await userService.editar(usuarioEditando.id, dados);
      } else {
        await userService.criar({
          ...dados,
          password: form.password,
          role: isMaster ? form.role : "consultor",
        });
      }

      setSucesso(
        editando
          ? "Usuário atualizado com sucesso!"
          : `${isMaster ? tipoUsuario : "Consultor"} cadastrado com sucesso!`,
      );

      setFormAberto(false);
      setUsuarioEditando(null);
      setForm(FORM_INICIAL);

      try {
        await atualizarLista();
      } catch {
        setErro("Alteração salva, mas não foi possível atualizar a lista.");
      }
    } catch (error) {
      setErro(error.message);
    } finally {
      setSalvando(false);
    }
  }

  // =====================================
  // REDEFINIÇÃO DE SENHA
  // =====================================

  function abrirRedefinicao(usuario) {
    setFormAberto(false);
    setUsuarioEditando(null);

    setUsuarioSenha(usuario);
    setNovaSenha("");

    setErro("");
    setSucesso("");
  }

  function fecharRedefinicao() {
    if (salvando) return;

    setUsuarioSenha(null);
    setNovaSenha("");
    setErro("");
  }

  async function salvarNovaSenha(event) {
    event.preventDefault();

    if (!usuarioSenha || salvando) return;

    if (novaSenha.length < 12) {
      setErro("A senha deve ter pelo menos 12 caracteres.");
      return;
    }

    setSalvando(true);
    setErro("");
    setSucesso("");

    try {
      await userService.redefinirSenha(usuarioSenha.id, novaSenha);

      setSucesso(
        `Senha de ${usuarioSenha.name} redefinida com sucesso! As sessões anteriores foram encerradas.`,
      );

      setUsuarioSenha(null);
      setNovaSenha("");
    } catch (error) {
      setErro(error.message);
    } finally {
      setSalvando(false);
    }
  }

  // =====================================
  // PERMISSÕES
  // =====================================

  function podeGerenciarUsuario(usuario) {
    if (usuario.id === user?.id) return false;

    if (usuario.role === "consultor") {
      return isGestor;
    }

    if (usuario.role === "admin") {
      return isMaster;
    }

    return false;
  }

  // =====================================
  // INDICADORES E FILTROS
  // =====================================

  const administradores = usuarios.filter(
    (usuario) => usuario.role === "admin" || usuario.role === "master",
  ).length;

  const consultores = usuarios.filter(
    (usuario) => usuario.role === "consultor",
  ).length;

  const termo = busca.trim().toLocaleLowerCase("pt-BR");

  const usuariosFiltrados = usuarios.filter((usuario) => {
    const nome = String(usuario.name || "").toLocaleLowerCase("pt-BR");

    const email = String(usuario.email || "").toLocaleLowerCase("pt-BR");

    return nome.includes(termo) || email.includes(termo);
  });

  function nomePerfil(role) {
    if (role === "master") return "Master";
    if (role === "admin") return "Administrador";
    return "Consultor";
  }

  // =====================================
  // PROTEÇÃO DE ACESSO
  // =====================================

  if (!isGestor) {
    return (
      <main className="admin-users">
        <p>Você não possui permissão para acessar esta área.</p>
      </main>
    );
  }

  // =====================================
  // INTERFACE
  // =====================================

  return (
    <main className="admin-users">
      <div className="admin-users-container">
        {/* CABEÇALHO */}

        <section className="team-heading">
          <div>
            <span className="team-label">ADMINISTRAÇÃO</span>

            <h1>Gerenciamento de equipe</h1>

            <p>Gerencie usuários, permissões e acessos da IW Connect.</p>
          </div>

          <button
            type="button"
            className="team-primary-button"
            onClick={abrirCadastro}
            disabled={salvando}
          >
            <UserPlus size={18} />
            Novo usuário
          </button>
        </section>

        {/* INDICADORES */}

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

        {/* MENSAGENS */}

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

        {/* FORMULÁRIO DE CADASTRO E EDIÇÃO */}

        {formAberto && (
          <section className="team-panel">
            <div className="team-panel-header">
              <h2>
                {usuarioEditando
                  ? `Editar ${nomePerfil(usuarioEditando.role)}`
                  : "Cadastrar usuário"}
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

            <form className="team-form" onSubmit={salvarUsuario}>
              <div className="team-field">
                <label htmlFor="team-name">Nome completo</label>

                <input
                  id="team-name"
                  name="name"
                  value={form.name}
                  onChange={alterarCampo}
                  placeholder="Nome completo"
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
                  placeholder="usuario@exemplo.com"
                  autoComplete="email"
                  maxLength={254}
                  required
                />
              </div>

              {/* PERFIL: APENAS MASTER */}

              {!usuarioEditando && isMaster && (
                <div className="team-field">
                  <label htmlFor="team-role">Perfil de acesso</label>

                  <select
                    id="team-role"
                    name="role"
                    value={form.role}
                    onChange={alterarCampo}
                  >
                    <option value="consultor">Consultor</option>

                    <option value="admin">Administrador</option>
                  </select>

                  <small>
                    Administradores possuem acesso à gestão de leads e
                    consultores.
                  </small>
                </div>
              )}

              {/* SENHA INICIAL */}

              {!usuarioEditando && (
                <div className="team-field">
                  <label htmlFor="team-password">Senha de acesso</label>

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
                    Defina uma senha inicial segura para o novo usuário.
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
                      : "Cadastrar usuário"}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* FORMULÁRIO DE REDEFINIÇÃO DE SENHA */}

        {usuarioSenha && (
          <section className="team-panel">
            <div className="team-panel-header">
              <h2>Redefinir senha</h2>

              <button
                type="button"
                className="team-icon-button"
                onClick={fecharRedefinicao}
                aria-label="Fechar redefinição de senha"
                disabled={salvando}
              >
                <X size={20} />
              </button>
            </div>

            <form className="team-form" onSubmit={salvarNovaSenha}>
              <div className="team-field">
                <label>Usuário</label>

                <input type="text" value={usuarioSenha.name} readOnly />
              </div>

              <div className="team-field">
                <label>E-mail</label>

                <input
                  type="email"
                  value={usuarioSenha.email}
                  autoComplete="username"
                  readOnly
                />
              </div>

              <div className="team-field">
                <label htmlFor="team-new-password">Nova senha</label>

                <input
                  id="team-new-password"
                  type="password"
                  value={novaSenha}
                  onChange={(event) => setNovaSenha(event.target.value)}
                  placeholder="Mínimo de 12 caracteres"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={72}
                  required
                />

                <small>
                  Ao redefinir a senha, todas as sessões atuais deste usuário
                  serão encerradas.
                </small>
              </div>

              <div className="team-form-actions">
                <button
                  type="button"
                  className="team-secondary-button"
                  onClick={fecharRedefinicao}
                  disabled={salvando}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="team-primary-button"
                  disabled={salvando}
                >
                  <KeyRound size={16} />

                  {salvando ? "Salvando..." : "Redefinir senha"}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* LISTAGEM DOS USUÁRIOS */}

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
            <p className="team-empty">Carregando usuários...</p>
          ) : usuariosFiltrados.length === 0 ? (
            <p className="team-empty">Nenhum usuário encontrado.</p>
          ) : (
            <div className="team-list">
              {usuariosFiltrados.map((usuario) => (
                <article className="team-user" key={usuario.id}>
                  <div className="team-user-avatar">
                    {["admin", "master"].includes(usuario.role) ? (
                      <ShieldCheck size={23} />
                    ) : (
                      <UserRound size={23} />
                    )}
                  </div>

                  <div className="team-user-info">
                    {isMaster && usuario.role === "consultor" ? (
                      <button
                        type="button"
                        className="team-user-profile-link"
                        aria-label={`Ver perfil e carteira de ${usuario.name}`}
                        onClick={() => onViewPortfolio(usuario.id)}
                        disabled={salvando}
                      >
                        {usuario.name}
                      </button>
                    ) : (
                      <strong>{usuario.name}</strong>
                    )}

                    <span>{usuario.email}</span>

                    <span
                      className={`team-role ${
                        ["admin", "master"].includes(usuario.role)
                          ? "team-role-admin"
                          : "team-role-consultor"
                      }`}
                    >
                      {nomePerfil(usuario.role)}
                    </span>
                  </div>

                  {/* AÇÕES PERMITIDAS */}

                  {podeGerenciarUsuario(usuario) && (
                    <div className="team-user-actions">
                      {isMaster && usuario.role === "consultor" && (
                        <button
                          type="button"
                          className="team-secondary-button"
                          onClick={() => onViewPortfolio(usuario.id)}
                          disabled={salvando}
                        >
                          <Eye size={15} />
                          Ver carteira
                        </button>
                      )}

                      <button
                        type="button"
                        className="team-secondary-button"
                        onClick={() => abrirEdicao(usuario)}
                        disabled={salvando}
                      >
                        <Pencil size={15} />
                        Editar
                      </button>

                      <button
                        type="button"
                        className="team-secondary-button"
                        onClick={() => abrirRedefinicao(usuario)}
                        disabled={salvando}
                      >
                        <KeyRound size={15} />
                        Redefinir senha
                      </button>
                      <button
                        type="button"
                        className="team-danger-button"
                        onClick={() => removerUsuario(usuario)}
                        disabled={salvando}
                      >
                        <Trash2 size={15} />
                        Remover
                      </button>
                    </div>
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
