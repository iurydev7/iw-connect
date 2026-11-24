import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Users,
  CircleCheck,
  Clock3,
  Upload,
  MessageCircle,
  Eye,
  RotateCcw,
  UserPlus,
  LockKeyhole,
  Trash2,
} from "lucide-react";
import * as userService from "../../services/userService.js";
import { useAuth } from "../../context/AuthContext";
import * as leadService from "../../services/leadService";
import { importarPlanilha } from "../../utils/importarPlanilha";
import { gerarLinkWhatsApp, validarTelefone } from "../../utils/whatsapp";
import { alertaIW } from "../../utils/alertas";
import LeadModal from "../../components/LeadModal/LeadModal";
import "./Dashboard.css";

const STATUS = [
  "Pendente",
  "Contatado",
  "Em negociação",
  "Aguardando retorno",
  "Sem resposta",
  "Contato inexistente",
  "Sem interesse",
  "Convertido",
  "Tratado",
];

const STATUS_ATIVOS = [
  "Pendente",
  "Em negociação",
  "Aguardando retorno",
];

const FILTROS_INICIAIS = {
  busca: "",
  cidade: "",
  uf: "",
  bairro: "",
  status: "",
  dataEntrada: "",
  dataContato: "",
  responsavel: "livres",
};

const PAGE_SIZE = 50;

function contatoDaPlanilha(linha, index) {
  const campos = Object.fromEntries(
    Object.entries(linha).map(([chave, valor]) => [
      chave
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase(),
      valor,
    ]),
  );

  return {
    nome: String(campos.nome || `Contato ${index + 1}`).trim(),
    telefone: String(campos.telefone || campos.celular || "").trim(),
    cidade: String(campos.cidade || campos.municipio || "").trim(),
    uf: String(campos.uf || "").trim(),
    bairro: String(campos.bairro || "").trim(),
  };
}

function Dashboard({ responsavelInicial = null, onReturnHome }) {
  const { user } = useAuth();

  const isMaster = user?.role === "master";
  const isAdmin = ["admin", "master"].includes(user?.role);

  const [listaTexto, setListaTexto] = useState("");
  const [contatos, setContatos] = useState([]);
  const [leadSelecionadoId, setLeadSelecionadoId] = useState(null);
  const [importando, setImportando] = useState(false);

  const [consultores, setConsultores] = useState([]);
  const [consultorId, setConsultorId] = useState("");
  const [acaoEmMassa, setAcaoEmMassa] = useState("distribuir");
  const [leadsSelecionados, setLeadsSelecionados] = useState([]);
  const [distribuindo, setDistribuindo] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  const [filtros, setFiltros] = useState({
    ...FILTROS_INICIAIS,
    responsavel:
      isMaster && responsavelInicial
        ? responsavelInicial
        : isAdmin
          ? "livres"
          : "meus",
  });
  const modoSupervisao =
    isMaster &&
    (Boolean(responsavelInicial) ||
      Boolean(
        filtros.responsavel &&
          !["livres", "meus"].includes(filtros.responsavel),
      ));
  const [pagina, setPagina] = useState(1);
  const [totalFiltrado, setTotalFiltrado] = useState(0);
  const [versao, setVersao] = useState(0);

  const [carregando, setCarregando] = useState(true);
  const [erroConsulta, setErroConsulta] = useState("");
  const [acaoId, setAcaoId] = useState(null);

  const [indicadores, setIndicadores] = useState({
    total: 0,
    contatados: 0,
    pendentes: 0,
    emNegociacao: 0,
    disponiveis: 0,
    cidades: [],
    consultoresSemLeads: [],
  });

  const leadSelecionado = contatos.find(
    (contato) => contato.id === leadSelecionadoId,
  );

  const totalPaginas = Math.max(1, Math.ceil(totalFiltrado / PAGE_SIZE));
  const consultorSupervisionado = consultores.find(
    (consultor) => consultor.id === filtros.responsavel,
  );
  const podeDistribuirMassa =
    isAdmin && !modoSupervisao && filtros.responsavel === "livres";
  const podeExcluirMassa = isMaster && !modoSupervisao;
  const modoAcaoEmMassa =
    podeDistribuirMassa && acaoEmMassa === "distribuir"
      ? "distribuir"
      : "excluir";

  useEffect(() => {
    if (!isAdmin) return;

    let ativo = true;

    async function carregarConsultores() {
      try {
        const usuarios = await userService.listar();

        if (ativo) {
          const responsaveis = usuarios.filter(
            (usuario) =>
              usuario.role === "consultor" || usuario.id === user?.id,
          );

          setConsultores(responsaveis);
        }
      } catch (error) {
        if (ativo) {
          alertaIW.fire({
            icon: "error",
            title: "Erro ao carregar responsáveis",
            text: error.message,
          });
        }
      }
    }

    carregarConsultores();

    return () => {
      ativo = false;
    };
  }, [isAdmin, user?.id]);

  useEffect(() => {
    let ativo = true;
    let ocupado = false;

    async function carregarLeads() {
      if (ocupado) return;

      ocupado = true;

      try {
        const [resultado, stats] = await Promise.all([
          leadService.listar({
            ...filtros,
            page: pagina,
            pageSize: PAGE_SIZE,
          }),
          leadService.obterIndicadores(isAdmin ? filtros.responsavel : ""),
        ]);

        if (!ativo) return;

        setContatos(resultado.leads);
        setTotalFiltrado(resultado.total);
        setIndicadores(stats);
        setErroConsulta("");

        const ultimaPagina = Math.max(
          1,
          Math.ceil(resultado.total / PAGE_SIZE),
        );

        if (pagina > ultimaPagina) {
          setPagina(ultimaPagina);
        }
      } catch (error) {
        if (ativo) setErroConsulta(error.message);
      } finally {
        ocupado = false;
        if (ativo) setCarregando(false);
      }
    }

    const timer = setTimeout(carregarLeads, 300);
    const intervalo = setInterval(carregarLeads, 15000);

    return () => {
      ativo = false;
      clearTimeout(timer);
      clearInterval(intervalo);
    };
  }, [filtros, pagina, versao, isAdmin]);

  function atualizarLista() {
    setVersao((anterior) => anterior + 1);
  }

  function alterarFiltro(chave, valor) {
    setFiltros((anteriores) => ({
      ...anteriores,
      [chave]: valor,
    }));

    setLeadsSelecionados([]);
    setPagina(1);
    setCarregando(true);
  }

  function limparFiltros() {
    setFiltros((anteriores) => ({
      ...FILTROS_INICIAIS,
      responsavel: anteriores.responsavel,
    }));

    setLeadsSelecionados([]);
    setPagina(1);
  }

  async function enviarLeads(leads) {
    const resultado = await leadService.importar(leads);

    atualizarLista();

    await alertaIW.fire({
      icon: "success",
      title: "Importação concluída",
      text: `${resultado.importados} importados • ${resultado.duplicados} duplicados • ${resultado.invalidos} inválidos`,
    });
  }

  async function processarContatos() {
    if (importando) return;

    const linhas = listaTexto.split(/\r?\n/).filter((linha) => linha.trim());

    if (!linhas.length) {
      return alertaIW.fire({
        icon: "info",
        title: "Lista vazia",
        text: "Insira pelo menos um contato.",
      });
    }

    setImportando(true);

    try {
      const leads = linhas.map((linha) => {
        const [nome = "", telefone = "", cidade = "", uf = "", bairro = ""] =
          linha.split(";");

        return { nome, telefone, cidade, uf, bairro };
      });

      await enviarLeads(leads);
      setListaTexto("");
    } catch (error) {
      await alertaIW.fire({
        icon: "error",
        title: "Falha na importação",
        text: error.message,
      });
    } finally {
      setImportando(false);
    }
  }

  async function handleImportarArquivo(event) {
    const arquivo = event.target.files?.[0];

    if (!arquivo || importando) return;

    setImportando(true);

    try {
      const linhas = await importarPlanilha(arquivo);

      await enviarLeads(linhas.map(contatoDaPlanilha));
    } catch (error) {
      await alertaIW.fire({
        icon: "error",
        title: "Erro ao importar",
        text: error.message,
      });
    } finally {
      event.target.value = "";
      setImportando(false);
    }
  }

  function alterarAcaoEmMassa(acao) {
    if (
      (acao === "distribuir" && !podeDistribuirMassa) ||
      (acao === "excluir" && !podeExcluirMassa)
    ) {
      return;
    }

    setAcaoEmMassa(acao);
    setLeadsSelecionados([]);
  }

  function selecionarLeadEmMassa(id) {
    if (excluindo || distribuindo) return;

    if (leadsSelecionados.includes(id)) {
      setLeadsSelecionados((anteriores) =>
        anteriores.filter((selecionado) => selecionado !== id),
      );
      return;
    }

    if (leadsSelecionados.length >= 100) {
      alertaIW.fire({
        icon: "warning",
        title: "Limite de seleção atingido",
        text: "É possível selecionar até 100 leads por operação.",
      });
      return;
    }

    setLeadsSelecionados((anteriores) => [...anteriores, id]);
  }

  function selecionarPaginaEmMassa() {
    if (excluindo || distribuindo) return;

    const leadsDaPagina =
      modoAcaoEmMassa === "distribuir"
        ? contatos.filter((lead) => !lead.responsavelId)
        : contatos;

    const ids = [
      ...new Set([
        ...leadsSelecionados,
        ...leadsDaPagina.map((lead) => lead.id),
      ]),
    ];

    if (ids.length > 100) {
      alertaIW.fire({
        icon: "warning",
        title: "Limite de seleção excedido",
        text: "Selecione no máximo 100 leads por operação.",
      });
      return;
    }

    setLeadsSelecionados(ids);
  }

  async function excluirLeadIndividual(lead) {
    if (!isMaster || modoSupervisao || excluindo) return;

    const confirmacao = await alertaIW.fire({
      icon: "warning",
      title: "Excluir lead?",
      text: `${lead.nome} será arquivado e removido das listas ativas.`,
      showCancelButton: true,
      confirmButtonText: "Sim, excluir",
      cancelButtonText: "Cancelar",
      reverseButtons: true,
      focusCancel: true,
    });

    if (!confirmacao.isConfirmed) return;

    setExcluindo(true);

    try {
      await leadService.remover(lead.id);
      setLeadsSelecionados((anteriores) =>
        anteriores.filter((id) => id !== lead.id),
      );
      setContatos((anteriores) =>
        anteriores.filter((item) => item.id !== lead.id),
      );
      setTotalFiltrado((anterior) => Math.max(0, anterior - 1));
      atualizarLista();

      await alertaIW.fire({
        icon: "success",
        title: "Lead excluído",
        text: `${lead.nome} foi removido das listas ativas.`,
      });
    } catch (error) {
      await alertaIW.fire({
        icon: "error",
        title: "Não foi possível excluir o lead",
        text: error.message,
      });
    } finally {
      setExcluindo(false);
    }
  }

  async function excluirLeadsSelecionados() {
    if (
      !isMaster ||
      modoSupervisao ||
      excluindo ||
      modoAcaoEmMassa !== "excluir" ||
      leadsSelecionados.length === 0
    ) {
      return;
    }

    const ids = [...new Set(leadsSelecionados)];
    const confirmacao = await alertaIW.fire({
      icon: "warning",
      title: `Excluir ${ids.length} leads?`,
      text: "Os leads selecionados serão arquivados e removidos das listas ativas.",
      showCancelButton: true,
      confirmButtonText: "Sim, excluir selecionados",
      cancelButtonText: "Cancelar",
      reverseButtons: true,
      focusCancel: true,
    });

    if (!confirmacao.isConfirmed) return;

    setExcluindo(true);

    try {
      const resultado = await leadService.removerEmMassa(ids);
      setLeadsSelecionados([]);
      setContatos((anteriores) =>
        anteriores.filter((lead) => !ids.includes(lead.id)),
      );
      setTotalFiltrado((anterior) =>
        Math.max(0, anterior - resultado.removidos),
      );
      atualizarLista();

      await alertaIW.fire({
        icon: "success",
        title: "Leads excluídos",
        text: `${resultado.removidos} leads foram removidos das listas ativas.`,
      });
    } catch (error) {
      await alertaIW.fire({
        icon: "error",
        title: "Não foi possível excluir os leads",
        text: error.message,
      });
    } finally {
      setExcluindo(false);
    }
  }

  async function executarAcao(id, operacao) {
    if (modoSupervisao || acaoId) return;

    setAcaoId(id);

    try {
      const leadAtualizado = await operacao();

      setContatos((anteriores) =>
        anteriores
          .map((lead) => (lead.id === id ? leadAtualizado : lead))
          .filter((lead) => {
            if (filtros.responsavel === "livres" && lead.responsavelId) {
              return false;
            }

            if (!STATUS_ATIVOS.includes(leadAtualizado.status) &&
              filtros.responsavel !== "tratados") {
              return false;
            }

            if (filtros.responsavel === "tratados" &&
              STATUS_ATIVOS.includes(leadAtualizado.status)) {
              return false;
            }

            return true;
          }),
      );

      if (
        leadAtualizado.carteiraRestante === 0 &&
        ["admin", "master"].includes(user?.role)
      ) {
        await alertaIW.fire({
          icon: "warning",
          title: "Carteira do consultor finalizada",
          text: `${leadAtualizado.responsavelName || "O consultor"} concluiu a listagem ativa. Direcione mais leads para continuar os atendimentos.`,
          confirmButtonText: "Entendi",
        });
      } else if (
        leadAtualizado.carteiraRestante === 0 &&
        user?.role === "consultor"
      ) {
        await alertaIW.fire({
          icon: "info",
          title: "Sua carteira foi finalizada",
          text: "Você concluiu a listagem atual. Aguarde a administração direcionar novos leads.",
          confirmButtonText: "Entendi",
        });
      }
    } catch (error) {
      await alertaIW.fire({
        icon: "warning",
        title: "Não foi possível concluir",
        text: error.message,
      });
    } finally {
      setAcaoId(null);
      atualizarLista();
    }
  }

  async function distribuirLeads() {
    if (
      !isAdmin ||
      modoSupervisao ||
      distribuindo ||
      !consultorId ||
      modoAcaoEmMassa !== "distribuir" ||
      !leadsSelecionados.length
    ) {
      return;
    }

    setDistribuindo(true);

    try {
      const resultado = await leadService.distribuir(
        leadsSelecionados,
        consultorId,
      );

      setContatos((anteriores) =>
        anteriores.filter((lead) => !resultado.leadIds.includes(lead.id)),
      );

      setLeadsSelecionados([]);
      atualizarLista();

      await alertaIW.fire({
        icon: "success",
        title: "Distribuição concluída",
        text: `${resultado.distribuidos} leads distribuídos e ${resultado.ignorados} ignorados.`,
      });
    } catch (error) {
      await alertaIW.fire({
        icon: "error",
        title: "Falha na distribuição",
        text: error.message,
      });
    } finally {
      setDistribuindo(false);
    }
  }

  function alterarStatus(id, status) {
    return executarAcao(id, () => leadService.alterarStatus(id, status));
  }

  function abrirCarteira(responsavel, status = "") {
    setFiltros({
      ...FILTROS_INICIAIS,
      responsavel: modoSupervisao ? filtros.responsavel : responsavel,
      status,
    });

    setLeadsSelecionados([]);
    setPagina(1);
    setCarregando(true);

    document.getElementById("contatos")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function voltarAoPainelPrincipal() {
    setFiltros({
      ...FILTROS_INICIAIS,
      responsavel: isAdmin ? "livres" : "meus",
    });
    setPagina(1);
    setCarregando(true);
    onReturnHome?.();
  }

  return (
    <main className="dashboard" id="dashboard">
      <div className="dashboard-container">
        <section className="dashboard-heading">
          <span className="dashboard-label">PAINEL DE CONTROLE</span>
          <h1>Gestão de leads</h1>
          <p>Organize e acompanhe sua operação comercial.</p>
        </section>

        {modoSupervisao && (
          <div className="supervision-banner" role="status">
            <strong>Modo supervisão — somente leitura</strong>
            {consultorSupervisionado ? (
              <>
                <span>
                  Perfil: {consultorSupervisionado.name}
                  {consultorSupervisionado.email
                    ? ` • ${consultorSupervisionado.email}`
                    : ""}
                </span>
                <span>
                  Carteira e atendimentos em consulta, sem possibilidade de
                  alteração.
                </span>
              </>
            ) : (
              <span>
                Selecione um consultor no filtro Responsável para consultar a
                carteira sem alterar os atendimentos.
              </span>
            )}
            <button
              type="button"
              className="btn-details supervision-home-button"
              onClick={voltarAoPainelPrincipal}
            >
              <ArrowLeft size={16} />
              Voltar ao painel principal
            </button>
          </div>
        )}

        {isAdmin &&
          indicadores.consultoresSemLeads?.length > 0 && (
            <div className="supervision-banner" role="alert">
              <strong>Carteiras que precisam de novos leads</strong>
              <span>
                {indicadores.consultoresSemLeads
                  .map((consultor) => consultor.name)
                  .join(", ")}{" "}
                não possuem leads ativos. Direcione mais leads.
              </span>
            </div>
          )}

        <section className="dashboard-stats">
          <button
            type="button"
            className="stat-card stat-total"
            onClick={() => abrirCarteira(isAdmin ? "" : "meus")}
          >
            <div className="stat-icon">
              <Users />
            </div>

            <span>
              {modoSupervisao
                ? "Leads do consultor"
                : isAdmin
                  ? "Total de contatos"
                  : "Minha carteira"}
            </span>

            <strong>{indicadores.total}</strong>
          </button>

          <button
            type="button"
            className="stat-card stat-contacted"
            onClick={() => abrirCarteira(isAdmin ? "" : "meus", "Contatado")}
          >
            <div className="stat-icon">
              <CircleCheck />
            </div>
            <span>Contatados</span>
            <strong>{indicadores.contatados}</strong>
          </button>

          <button
            type="button"
            className="stat-card stat-pending"
            onClick={() => abrirCarteira(isAdmin ? "" : "meus", "Pendente")}
          >
            <div className="stat-icon">
              <Clock3 />
            </div>
            <span>Pendentes</span>
            <strong>{indicadores.pendentes}</strong>
          </button>

          <button
            type="button"
            className="stat-card stat-negotiation"
            onClick={() =>
              abrirCarteira(isAdmin ? "" : "meus", "Em negociação")
            }
          >
            <div className="stat-icon">
              <CircleCheck />
            </div>
            <span>Em negociação</span>
            <strong>{indicadores.emNegociacao}</strong>
          </button>

          <button
            type="button"
            className="stat-card stat-available"
            onClick={() => abrirCarteira("livres")}
            disabled={modoSupervisao}
            title={
              modoSupervisao
                ? "Uma carteira de consultor não possui leads disponíveis"
                : undefined
            }
          >
            <div className="stat-icon">
              <UserPlus />
            </div>
            <span>Disponíveis</span>
            <strong>{indicadores.disponiveis}</strong>
          </button>
        </section>

        {isAdmin && !modoSupervisao && (
          <section className="dashboard-import" id="importar">
            <h2>Importar contatos</h2>
            <p>Adicione novos leads à carteira comercial.</p>

            <div className="import-area">
              <h3>Cole sua lista de contatos</h3>
              <p>Nome;Telefone;Cidade;UF;Bairro</p>

              <textarea
                className="contacts-textarea"
                placeholder="Maria;85999990001;Fortaleza;CE;Centro"
                value={listaTexto}
                onChange={(e) => setListaTexto(e.target.value)}
                rows={5}
              />

              <button
                type="button"
                className="btn-process"
                disabled={importando}
                onClick={processarContatos}
              >
                Importar contatos digitados
              </button>

              <div className="upload-divider">
                <span>OU</span>
              </div>

              <label className="btn-upload" htmlFor="arquivo-contatos">
                <Upload size={17} />
                {importando ? "Importando..." : "Importar Excel ou CSV"}
              </label>

              <input
                id="arquivo-contatos"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleImportarArquivo}
                className="file-input"
                disabled={importando}
              />
            </div>
          </section>
        )}

        <section className="contacts-section" id="contatos">
          <div className="contacts-header">
            <div>
              <h2>Carteira de leads</h2>
              <p className="contacts-subtitle">
                Consulte e acompanhe os atendimentos.
              </p>
            </div>
          </div>
          {!modoSupervisao && (
            <div className="wallet-tabs">
              {isAdmin && (
                <button
                  type="button"
                  className={
                    filtros.responsavel === "livres" ? "wallet-active" : ""
                  }
                  onClick={() => abrirCarteira("livres")}
                >
                  Não distribuídos
                </button>
              )}

              <button
                type="button"
                className={
                  filtros.responsavel === "meus" ? "wallet-active" : ""
                }
                onClick={() => abrirCarteira("meus")}
              >
                Minha carteira
              </button>

              {isAdmin && (
                <button
                  type="button"
                  className={filtros.responsavel === "" ? "wallet-active" : ""}
                  onClick={() => abrirCarteira("")}
                >
                  Todos os leads
                </button>
              )}

              <button
                type="button"
                className={
                  filtros.responsavel === "tratados" ? "wallet-active" : ""
                }
                onClick={() => abrirCarteira("tratados")}
              >
                Leads gerais
              </button>
            </div>
          )}

          <div className="contacts-filters">
            <div className="filter-group">
              <label htmlFor="busca">Pesquisar lead</label>
              <input
                id="busca"
                type="search"
                placeholder="Nome, telefone ou cidade"
                value={filtros.busca}
                onChange={(e) => alterarFiltro("busca", e.target.value)}
              />
            </div>

            <div className="filter-group">
              <label htmlFor="cidade">Cidade</label>
              <select
                id="cidade"
                value={filtros.cidade}
                onChange={(e) => alterarFiltro("cidade", e.target.value)}
              >
                <option value="">Todas as cidades</option>

                {indicadores.cidades.map((cidade) => (
                  <option key={cidade} value={cidade}>
                    {cidade}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="uf">Estado (UF)</label>
              <input
                id="uf"
                maxLength={2}
                placeholder="Ex.: CE"
                value={filtros.uf}
                onChange={(e) =>
                  alterarFiltro("uf", e.target.value.toUpperCase())
                }
              />
            </div>

            <div className="filter-group">
              <label htmlFor="bairro">Bairro</label>
              <input
                id="bairro"
                placeholder="Pesquisar bairro"
                value={filtros.bairro}
                onChange={(e) => alterarFiltro("bairro", e.target.value)}
              />
            </div>

            <div className="filter-group">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                value={filtros.status}
                onChange={(e) => alterarFiltro("status", e.target.value)}
              >
                <option value="">Todos os status</option>

                {STATUS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="responsavel">Responsável</label>

              <select
                id="responsavel"
                value={filtros.responsavel}
                onChange={(e) => alterarFiltro("responsavel", e.target.value)}
              >
                {isAdmin && !modoSupervisao && (
                  <>
                    <option value="">Todos os leads</option>
                    <option value="livres">Não distribuídos</option>
                  </>
                )}

                {!modoSupervisao && (
                  <option value="meus">Minha carteira</option>
                )}
                {!modoSupervisao && (
                  <option value="tratados">Leads gerais</option>
                )}
                {isMaster &&
                  consultores
                    .filter((consultor) => consultor.role === "consultor")
                    .map((consultor) => (
                      <option key={consultor.id} value={consultor.id}>
                        Carteira de {consultor.name}
                      </option>
                    ))}
              </select>
            </div>

            <div className="filter-group filter-date-group">
              <label htmlFor="dataEntrada">Data de entrada</label>
              <input
                id="dataEntrada"
                type="date"
                value={filtros.dataEntrada}
                onChange={(e) => alterarFiltro("dataEntrada", e.target.value)}
              />
            </div>

            <div className="filter-group filter-date-group">
              <label htmlFor="dataContato">Data do contato</label>
              <input
                id="dataContato"
                type="date"
                value={filtros.dataContato}
                onChange={(e) => alterarFiltro("dataContato", e.target.value)}
              />
            </div>
          </div>

          <div className="filter-footer">
            <p className="filter-result">{totalFiltrado} leads encontrados</p>

            <button className="btn-reset-filters" onClick={limparFiltros}>
              <RotateCcw size={15} />
              Limpar filtros
            </button>
          </div>

          {carregando && <p>Carregando leads...</p>}

          {erroConsulta && <p role="alert">{erroConsulta}</p>}

          {(podeDistribuirMassa || podeExcluirMassa) && (
            <section
              className={`distribution-panel mass-action-panel ${
                modoAcaoEmMassa === "excluir" ? "bulk-delete-panel" : ""
              }`}
            >
              <div className="mass-action-header">
                <div>
                  <h3>
                    {modoAcaoEmMassa === "distribuir"
                      ? "Distribuir leads"
                      : "Excluir leads"}
                  </h3>
                  <p>
                    {leadsSelecionados.length} selecionados (máximo de 100 por
                    operação)
                  </p>
                </div>

                {podeDistribuirMassa && podeExcluirMassa && (
                  <div
                    className="mass-action-tabs"
                    role="group"
                    aria-label="Ação em massa"
                  >
                    <button
                      type="button"
                      className={
                        modoAcaoEmMassa === "distribuir" ? "active" : ""
                      }
                      onClick={() => alterarAcaoEmMassa("distribuir")}
                      disabled={excluindo || distribuindo}
                    >
                      Distribuir
                    </button>
                    <button
                      type="button"
                      className={
                        modoAcaoEmMassa === "excluir" ? "active" : ""
                      }
                      onClick={() => alterarAcaoEmMassa("excluir")}
                      disabled={excluindo || distribuindo}
                    >
                      Excluir
                    </button>
                  </div>
                )}
              </div>

              <div className="distribution-actions">
                <button
                  type="button"
                  className="btn-status"
                  onClick={selecionarPaginaEmMassa}
                  disabled={
                    excluindo || distribuindo || carregando || !contatos.length
                  }
                >
                  Selecionar página
                </button>

                <button
                  type="button"
                  className="btn-status"
                  onClick={() => setLeadsSelecionados([])}
                  disabled={
                    excluindo || distribuindo || !leadsSelecionados.length
                  }
                >
                  Limpar seleção
                </button>

                {modoAcaoEmMassa === "distribuir" ? (
                  <>
                    <select
                      className="lead-status-select"
                      aria-label="Responsável pelo atendimento"
                      value={consultorId}
                      onChange={(e) => setConsultorId(e.target.value)}
                    >
                      <option value="">Selecione o responsável</option>

                      {consultores.map((consultor) => (
                        <option key={consultor.id} value={consultor.id}>
                          {consultor.id === user?.id
                            ? "Minha carteira (Administrador)"
                            : consultor.name}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      className="btn-claim"
                      onClick={distribuirLeads}
                      disabled={
                        distribuindo ||
                        !consultorId ||
                        !leadsSelecionados.length
                      }
                    >
                      {distribuindo ? "Distribuindo..." : "Distribuir leads"}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="btn-delete"
                    onClick={excluirLeadsSelecionados}
                    disabled={excluindo || !leadsSelecionados.length}
                  >
                    <Trash2 size={16} />
                    {excluindo ? "Excluindo..." : "Excluir selecionados"}
                  </button>
                )}
              </div>
            </section>
          )}

          <div className="contacts-list">
            {!carregando &&
              !erroConsulta &&
              contatos.map((contato) => {
              const meuLead =
                !modoSupervisao && contato.responsavelId === user?.id;
              const possoTratarLead =
                !modoSupervisao &&
                (meuLead || (isAdmin && Boolean(contato.responsavelId)));

                const disponivel = !contato.responsavelId;

                return (
                  <article className="contact-item" key={contato.id}>
                    <div className="contact-info">
                      <strong>{contato.nome}</strong>
                      <span>{contato.telefone}</span>

                      <span className="contact-city">
                        {contato.cidade}
                        {contato.uf ? ` - ${contato.uf}` : ""}
                      </span>

                      <span
                        className="lead-status"
                        data-status={contato.status}
                      >
                        {contato.status}
                      </span>

                      <span className="lead-owner">
                        {disponivel
                          ? "Disponível para atendimento"
                          : `Responsável: ${contato.responsavel?.name || "Colaborador"}`}
                      </span>
                    </div>

                    <div className="contact-actions">
                      {((modoAcaoEmMassa === "excluir" &&
                        podeExcluirMassa) ||
                        (modoAcaoEmMassa === "distribuir" &&
                          podeDistribuirMassa &&
                          disponivel)) && (
                        <label className="lead-select-checkbox">
                          <input
                            type="checkbox"
                            checked={leadsSelecionados.includes(contato.id)}
                            onChange={() =>
                              selecionarLeadEmMassa(contato.id)
                            }
                            disabled={excluindo || distribuindo}
                          />
                          {modoAcaoEmMassa === "excluir"
                            ? "Selecionar para excluir"
                            : "Selecionar para distribuir"}
                        </label>
                      )}

                      {possoTratarLead && (
                        <>
                          <select
                            className="lead-status-select"
                            aria-label="Status do atendimento"
                            value={contato.status}
                            disabled={Boolean(acaoId)}
                            onChange={(e) =>
                              alterarStatus(contato.id, e.target.value)
                            }
                          >
                            {STATUS.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>

                          <button
                            className="btn-details"
                            onClick={() => setLeadSelecionadoId(contato.id)}
                          >
                            <Eye size={16} />
                            Ver ficha
                          </button>

                          {validarTelefone(contato.telefone) && (
                            <a
                              className="btn-whatsapp"
                              href={gerarLinkWhatsApp(
                                contato.telefone,
                                contato.nome,
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <MessageCircle size={16} />
                              WhatsApp
                            </a>
                          )}
                        </>
                      )}

                      {!disponivel && !meuLead && (
                        <>
                          {isMaster && (
                            <button
                              type="button"
                              className="btn-details"
                              onClick={() => setLeadSelecionadoId(contato.id)}
                            >
                              <Eye size={16} />
                              Ver acompanhamento
                            </button>
                          )}

                          <span className="lead-locked">
                            <LockKeyhole size={16} />
                            Em atendimento
                          </span>
                        </>
                      )}

                      {modoAcaoEmMassa === "excluir" && podeExcluirMassa && (
                        <button
                          type="button"
                          className="btn-delete"
                          onClick={() => excluirLeadIndividual(contato)}
                          disabled={excluindo}
                          aria-label={`Excluir lead ${contato.nome}`}
                        >
                          <Trash2 size={16} />
                          Excluir
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}

            {!carregando && !erroConsulta && !contatos.length && (
              <p className="empty-filter">Nenhum lead encontrado.</p>
            )}
          </div>

          <div className="lead-pagination">
            <button
              disabled={pagina <= 1}
              onClick={() => setPagina((p) => p - 1)}
            >
              Anterior
            </button>

            <span>
              Página {pagina} de {totalPaginas}
            </span>

            <button
              disabled={pagina >= totalPaginas}
              onClick={() => setPagina((p) => p + 1)}
            >
              Próxima
            </button>
          </div>
        </section>
      </div>

      {leadSelecionado &&
        (leadSelecionado.responsavelId === user?.id ||
          (isMaster && Boolean(leadSelecionado.responsavelId)) ||
          filtros.responsavel === "tratados") && (
          <LeadModal
            key={leadSelecionado.id}
            lead={leadSelecionado}
            onClose={() => setLeadSelecionadoId(null)}
            onSaveObservation={leadService.salvarObservacao}
            somenteLeitura={
              modoSupervisao ||
              leadSelecionado.responsavelId !== user?.id
            }
          />
        )}
    </main>
  );
}
export default Dashboard;
