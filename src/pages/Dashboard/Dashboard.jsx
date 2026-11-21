import { useEffect, useState } from "react";
import {
  Users,
  CircleCheck,
  Clock3,
  Upload,
  MessageCircle,
  Eye,
  RotateCcw,
  UserPlus,
  LockKeyhole,
} from "lucide-react";

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
];

const FILTROS_INICIAIS = {
  busca: "",
  cidade: "",
  uf: "",
  bairro: "",
  status: "",
  dataEntrada: "",
  dataContato: "",
  responsavel: "",
};

const PAGE_SIZE = 50;

function contatoDaPlanilha(linha, index) {
  const campos = Object.fromEntries(
    Object.entries(linha).map(([chave, valor]) => [
      chave.normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase(),
      valor,
    ])
  );

  return {
    nome: String(campos.nome || `Contato ${index + 1}`).trim(),
    telefone: String(campos.telefone || campos.celular || "").trim(),
    cidade: String(campos.cidade || campos.municipio || "").trim(),
    uf: String(campos.uf || "").trim(),
    bairro: String(campos.bairro || "").trim(),
  };
}

function Dashboard() {
  const { user } = useAuth();

  const [listaTexto, setListaTexto] = useState("");
  const [contatos, setContatos] = useState([]);
  const [leadSelecionadoId, setLeadSelecionadoId] = useState(null);
  const [importando, setImportando] = useState(false);

  const [filtros, setFiltros] = useState(FILTROS_INICIAIS);
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
    cidades: [],
  });

  const leadSelecionado = contatos.find(
    (contato) => contato.id === leadSelecionadoId
  );

  const totalPaginas = Math.max(
    1,
    Math.ceil(totalFiltrado / PAGE_SIZE)
  );

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
          leadService.obterIndicadores(),
        ]);

        if (!ativo) return;

        setContatos(resultado.leads);
        setTotalFiltrado(resultado.total);
        setIndicadores(stats);
        setErroConsulta("");

        const ultimaPagina = Math.max(
          1,
          Math.ceil(resultado.total / PAGE_SIZE)
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
  }, [filtros, pagina, versao]);

  function atualizarLista() {
    setVersao((anterior) => anterior + 1);
  }

  function alterarFiltro(chave, valor) {
    setFiltros((anteriores) => ({
      ...anteriores,
      [chave]: valor,
    }));

    setPagina(1);
    setCarregando(true);
  }

  function limparFiltros() {
    setFiltros(FILTROS_INICIAIS);
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

    const linhas = listaTexto
      .split(/\r?\n/)
      .filter((linha) => linha.trim());

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
        const [
          nome = "",
          telefone = "",
          cidade = "",
          uf = "",
          bairro = "",
        ] = linha.split(";");

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

  async function executarAcao(id, operacao) {
    if (acaoId) return;

    setAcaoId(id);

    try {
      const leadAtualizado = await operacao();

      setContatos((anteriores) =>
        anteriores.map((lead) =>
          lead.id === id ? leadAtualizado : lead
        )
      );
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

  function assumirLead(id) {
    return executarAcao(
      id,
      () => leadService.reservar(id)
    );
  }

  function alterarStatus(id, status) {
    return executarAcao(
      id,
      () => leadService.alterarStatus(id, status)
    );
  }

  return (
    <main className="dashboard" id="dashboard">
      <div className="dashboard-container">

        <section className="dashboard-heading">
          <span className="dashboard-label">
            PAINEL DE CONTROLE
          </span>
          <h1>Gestão de leads</h1>
          <p>Organize e acompanhe sua operação comercial.</p>
        </section>

        <section className="dashboard-stats">

          <div className="stat-card stat-total">
            <div className="stat-icon"><Users /></div>
            <span>Total de contatos</span>
            <strong>{indicadores.total}</strong>
          </div>

          <div className="stat-card stat-contacted">
            <div className="stat-icon"><CircleCheck /></div>
            <span>Contatados</span>
            <strong>{indicadores.contatados}</strong>
          </div>

          <div className="stat-card stat-pending">
            <div className="stat-icon"><Clock3 /></div>
            <span>Pendentes</span>
            <strong>{indicadores.pendentes}</strong>
          </div>

        </section>

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

            <label
              className="btn-upload"
              htmlFor="arquivo-contatos"
            >
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

        <section className="contacts-section" id="contatos">

          <div className="contacts-header">
            <div>
              <h2>Carteira de leads</h2>
              <p className="contacts-subtitle">
                Consulte e acompanhe os atendimentos.
              </p>
            </div>
          </div>

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
                onChange={(e) => alterarFiltro("uf", e.target.value.toUpperCase())}
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
                <option value="">Todos os leads</option>
                <option value="meus">Meus atendimentos</option>
                <option value="livres">Disponíveis</option>
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
            <p className="filter-result">
              {totalFiltrado} leads encontrados
            </p>

            <button
              className="btn-reset-filters"
              onClick={limparFiltros}
            >
              <RotateCcw size={15} />
              Limpar filtros
            </button>
          </div>

          {carregando && <p>Carregando leads...</p>}

          {erroConsulta && (
            <p role="alert">{erroConsulta}</p>
          )}

          <div className="contacts-list">

            {!carregando && !erroConsulta &&
              contatos.map((contato) => {
                const meuLead =
                  contato.responsavelId === user?.id;

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

                      <span className="lead-status"
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

                      {disponivel && (
                        <button
                          className="btn-claim"
                          disabled={Boolean(acaoId)}
                          onClick={() => assumirLead(contato.id)}
                        >
                          <UserPlus size={16} />
                          Assumir atendimento
                        </button>
                      )}

                      {meuLead && (
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
                            onClick={() =>
                              setLeadSelecionadoId(contato.id)
                            }
                          >
                            <Eye size={16} />
                            Ver ficha
                          </button>

                          {validarTelefone(contato.telefone) && (
                            <a
                              className="btn-whatsapp"
                              href={gerarLinkWhatsApp(
                                contato.telefone,
                                contato.nome
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
                        <span className="lead-locked">
                          <LockKeyhole size={16} />
                          Em atendimento
                        </span>
                      )}

                    </div>
                  </article>
                );
              })}

            {!carregando && !erroConsulta && !contatos.length && (
              <p className="empty-filter">
                Nenhum lead encontrado.
              </p>
            )}

          </div>

          <div className="lead-pagination">
            <button
              disabled={pagina <= 1}
              onClick={() => setPagina((p) => p - 1)}
            >
              Anterior
            </button>

            <span>Página {pagina} de {totalPaginas}</span>

            <button
              disabled={pagina >= totalPaginas}
              onClick={() => setPagina((p) => p + 1)}
            >
              Próxima
            </button>
          </div>

        </section>
      </div>

      {leadSelecionado && leadSelecionado.responsavelId === user?.id && (
        <LeadModal
          key={leadSelecionado.id}
          lead={leadSelecionado}
          onClose={() => setLeadSelecionadoId(null)}
          onSaveObservation={leadService.salvarObservacao}
        />
      )}

    </main>
  );
}

export default Dashboard;