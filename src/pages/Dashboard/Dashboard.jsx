import { useEffect, useState } from "react";
import { importarPlanilha } from "../../utils/importarPlanilha";
import {
  gerarLinkWhatsApp,
  normalizarTelefone,
  validarTelefone,
} from "../../utils/whatsapp";
import { alertaIW } from "../../utils/alertas";
import LeadModal from "../../components/LeadModal/LeadModal";
import "./Dashboard.css";

const STORAGE_KEY = "iw-connect-contatos";

function obterDataLocal(data) {
  if (!data) return "";
  const valor = new Date(data);
  if (Number.isNaN(valor.getTime())) return "";
  const ano = valor.getFullYear();
  const mes = String(valor.getMonth() + 1).padStart(2, "0");
  const dia = String(valor.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function lerContatosSalvos() {
  try {
    const dados = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(dados) ? dados : [];
  } catch (error) {
    console.error("Erro ao recuperar contatos:", error);
    return [];
  }
}

function contatoDaPlanilha(linha, index) {
  // Reconhece cabeçalhos comuns, inclusive variações de capitalização.
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
    id: crypto.randomUUID(),
    nome: String(campos.nome || `Contato ${index + 1}`).trim(),
    telefone: String(campos.telefone || campos.celular || "").trim(),
    cidade:
      String(campos.cidade || campos.municipio || "").trim() || "Não informada",
    status: "Pendente",
    observacao: "",
    dataEntrada: new Date().toISOString(),
    dataContatado: null,
  };
}

function separarContatos(novos, existentes) {
  const numeros = new Set(
    existentes.map((item) => normalizarTelefone(item.telefone)).filter(Boolean),
  );
  const unicos = [];
  let duplicados = 0;
  let invalidos = 0;

  for (const contato of novos) {
    if (!validarTelefone(contato.telefone)) {
      invalidos++;
      continue;
    }
    const numero = normalizarTelefone(contato.telefone);
    if (numeros.has(numero)) {
      duplicados++;
      continue;
    }
    numeros.add(numero);
    unicos.push(contato);
  }

  return { unicos, duplicados, invalidos };
}

function Dashboard() {
  const [listaTexto, setListaTexto] = useState("");
  const [contatos, setContatos] = useState(lerContatosSalvos);
  const [leadSelecionadoId, setLeadSelecionadoId] = useState(null);
  const [importando, setImportando] = useState(false);

  const [busca, setBusca] = useState("");
  const [filtroCidade, setFiltroCidade] = useState("Todas");
  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [filtroDataEntrada, setFiltroDataEntrada] = useState("");
  const [filtroDataContato, setFiltroDataContato] = useState("");

  const leadSelecionado = contatos.find(
    (contato) => contato.id === leadSelecionadoId,
  );

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(contatos));
    } catch (error) {
      console.error("Erro ao salvar contatos:", error);
    }
  }, [contatos]);

  function processarContatos() {
    const linhas = listaTexto.split(/\r?\n/).filter((linha) => linha.trim());
    if (linhas.length === 0) {
      alertaIW.fire({
        icon: "info",
        title: "Lista vazia",
        text: "Cole pelo menos um contato para continuar.",
      });
      return;
    }

    const novos = linhas.map((linha, index) => {
      const [nome = "", telefone = "", cidade = ""] = linha.split(";");
      return {
        id: crypto.randomUUID(),
        nome: nome.trim() || `Contato ${index + 1}`,
        telefone: telefone.trim(),
        cidade: cidade.trim() || "Não informada",
        status: "Pendente",
        observacao: "",
        dataEntrada: new Date().toISOString(),
        dataContatado: null,
      };
    });

    const { unicos, duplicados, invalidos } = separarContatos(novos, contatos);
    if (unicos.length) setContatos((anteriores) => [...anteriores, ...unicos]);
    if (unicos.length) setListaTexto("");

    alertaIW.fire({
      icon: unicos.length ? "success" : "info",
      title: "Lista processada",
      text: `${unicos.length} importados • ${duplicados} duplicados • ${invalidos} inválidos`,
      confirmButtonText: "Entendi",
    });
  }

  function alterarStatus(id) {
    setContatos((anteriores) =>
      anteriores.map((contato) => {
        if (contato.id !== id) return contato;
        const novoStatus =
          contato.status === "Contatado" ? "Pendente" : "Contatado";
        return {
          ...contato,
          status: novoStatus,
          dataContatado:
            novoStatus === "Contatado"
              ? new Date().toISOString()
              : contato.dataContatado || null,
        };
      }),
    );
  }

  function salvarObservacao(id, texto) {
    setContatos((anteriores) =>
      anteriores.map((contato) =>
        contato.id === id
          ? {
              ...contato,
              observacao: texto,
            }
          : contato,
      ),
    );
  }

  async function limparContatos() {
    if (!contatos.length) return;
    const resultado = await alertaIW.fire({
      title: "Limpar lista de contatos?",
      text: `Você está prestes a excluir ${contatos.length} contatos. Essa ação não poderá ser desfeita.`,
      icon: "warning",
      iconColor: "#C9A24B",
      showCancelButton: true,
      confirmButtonText: "Sim, limpar lista",
      cancelButtonText: "Cancelar",
      reverseButtons: true,
      focusCancel: true,
    });
    if (!resultado.isConfirmed) return;
    setLeadSelecionadoId(null);
    setContatos([]);
    await alertaIW.fire({
      icon: "success",
      title: "Lista limpa!",
      showConfirmButton: false,
      timer: 1500,
    });
  }

  async function handleImportarArquivo(event) {
    const arquivo = event.target.files?.[0];
    if (!arquivo || importando) return;
    setImportando(true);

    try {
      const linhas = await importarPlanilha(arquivo);
      const novos = linhas.map(contatoDaPlanilha);
      const { unicos, duplicados, invalidos } = separarContatos(
        novos,
        contatos,
      );
      if (unicos.length)
        setContatos((anteriores) => [...anteriores, ...unicos]);

      await alertaIW.fire({
        icon: unicos.length ? "success" : "info",
        title: "Importação concluída!",
        iconColor: unicos.length ? "#16A34A" : "#C9A24B",
        html: `
          <p>Sua planilha foi processada.</p>
          <div class="iw-import-summary">
            <div class="iw-import-stat imported"><strong>${unicos.length}</strong><span>Importados</span></div>
            <div class="iw-import-stat duplicated"><strong>${duplicados}</strong><span>Duplicados</span></div>
            <div class="iw-import-stat invalid"><strong>${invalidos}</strong><span>Inválidos</span></div>
          </div>
        `,
        confirmButtonText: "Entendi",
      });
    } catch (error) {
      console.error("Erro na importação:", error);
      await alertaIW.fire({
        icon: "error",
        title: "Erro ao importar",
        text: "Não foi possível ler a planilha. Verifique o arquivo e tente novamente.",
        confirmButtonText: "Entendi",
      });
    } finally {
      event.target.value = "";
      setImportando(false);
    }
  }

  const totalContatos = contatos.length;
  const totalContatados = contatos.filter(
    (contato) => contato.status === "Contatado",
  ).length;
  const totalPendentes = contatos.filter(
    (contato) => contato.status === "Pendente",
  ).length;
  const cidades = [
    ...new Set(contatos.map((contato) => contato.cidade || "Não informada")),
  ].sort((a, b) => a.localeCompare(b, "pt-BR"));

  const contatosFiltrados = contatos.filter((contato) => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    const correspondeBusca =
      String(contato.nome || "")
        .toLocaleLowerCase("pt-BR")
        .includes(termo) ||
      String(contato.telefone || "").includes(termo) ||
      String(contato.cidade || "")
        .toLocaleLowerCase("pt-BR")
        .includes(termo);

    return (
      correspondeBusca &&
      (filtroCidade === "Todas" ||
        (contato.cidade || "Não informada") === filtroCidade) &&
      (filtroStatus === "Todos" || contato.status === filtroStatus) &&
      (!filtroDataEntrada ||
        obterDataLocal(contato.dataEntrada) === filtroDataEntrada) &&
      (!filtroDataContato ||
        obterDataLocal(contato.dataContatado) === filtroDataContato)
    );
  });

  function limparFiltros() {
    setBusca("");
    setFiltroCidade("Todas");
    setFiltroStatus("Todos");
    setFiltroDataEntrada("");
    setFiltroDataContato("");
  }

  return (
    <main className="dashboard" id="dashboard">
      <div className="dashboard-container">
        <section className="dashboard-heading">
          <span className="dashboard-label">PAINEL DE CONTROLE</span>
          <h1>Gerenciamento de contatos</h1>
          <p>
            Organize seus leads e inicie conversas no WhatsApp sem precisar
            salvar os números.
          </p>
        </section>

        <section
          className="dashboard-stats"
          aria-label="Indicadores comerciais"
        >
          <div className="stat-card">
            <span>Total de contatos</span>
            <strong>{totalContatos}</strong>
          </div>
          <div className="stat-card">
            <span>Contatados</span>
            <strong>{totalContatados}</strong>
          </div>
          <div className="stat-card">
            <span>Pendentes</span>
            <strong>{totalPendentes}</strong>
          </div>
        </section>

        <section className="dashboard-import" id="importar">
          <h2>Importar contatos</h2>
          <p>
            Adicione uma lista de contatos para gerar links diretos para o
            WhatsApp.
          </p>
          <div className="import-area">
            <h3>Cole sua lista de contatos</h3>
            <p>Insira um contato por linha, no formato: Nome;Telefone;Cidade</p>
            <textarea
              className="contacts-textarea"
              placeholder={
                "Caroline;85992821874;Fortaleza\nBianca;85991806975;Eusebio"
              }
              value={listaTexto}
              onChange={(event) => setListaTexto(event.target.value)}
              rows={5}
            />
            <button
              type="button"
              className="btn-process"
              onClick={processarContatos}
            >
              Gerar links do WhatsApp
            </button>
            <div className="upload-divider">
              <span>OU</span>
            </div>
            <label className="btn-upload" htmlFor="arquivo-contatos">
              {importando ? "Importando..." : "Importar planilha Excel ou CSV"}
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
              <h2>Contatos encontrados</h2>
              <p className="contacts-subtitle">
                Consulte, filtre e acompanhe seus leads.
              </p>
            </div>
            <button
              type="button"
              className="btn-clear"
              onClick={limparContatos}
              disabled={!totalContatos}
            >
              Limpar lista
            </button>
          </div>

          <div className="contacts-filters">
            <div className="filter-group">
              <label htmlFor="busca-lead">Pesquisar lead</label>
              <input
                id="busca-lead"
                type="search"
                placeholder="Nome, telefone ou cidade..."
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
              />
            </div>
            <div className="filter-group">
              <label htmlFor="filtro-cidade">Cidade</label>
              <select
                id="filtro-cidade"
                value={filtroCidade}
                onChange={(event) => setFiltroCidade(event.target.value)}
              >
                <option value="Todas">Todas as cidades</option>
                {cidades.map((cidade) => (
                  <option key={cidade} value={cidade}>
                    {cidade}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label htmlFor="filtro-status">Status</label>
              <select
                id="filtro-status"
                value={filtroStatus}
                onChange={(event) => setFiltroStatus(event.target.value)}
              >
                <option value="Todos">Todos os status</option>
                <option value="Pendente">Pendentes</option>
                <option value="Contatado">Contatados</option>
              </select>
            </div>
            <div className="filter-group filter-date-group">
              <label htmlFor="filtro-entrada">Data de entrada</label>
              <input
                id="filtro-entrada"
                type="date"
                value={filtroDataEntrada}
                onChange={(event) => setFiltroDataEntrada(event.target.value)}
              />
            </div>
            <div className="filter-group filter-date-group">
              <label htmlFor="filtro-contato">Data do contato</label>
              <input
                id="filtro-contato"
                type="date"
                value={filtroDataContato}
                onChange={(event) => setFiltroDataContato(event.target.value)}
              />
            </div>
          </div>

          <div className="filter-footer">
            <p className="filter-result">
              Exibindo {contatosFiltrados.length} de {contatos.length} contatos
            </p>
            <button
              type="button"
              className="btn-reset-filters"
              onClick={limparFiltros}
            >
              Limpar filtros
            </button>
          </div>

          <div className="contacts-list">
            {contatosFiltrados.map((contato) => (
              <article className="contact-item" key={contato.id}>
                <div className="contact-info">
                  <strong>{contato.nome}</strong>
                  <span>{contato.telefone}</span>
                  <span className="contact-city">
                    {contato.cidade || "Não informada"}
                  </span>
                  <span
                    className={
                      contato.status === "Contatado"
                        ? "status-contatado"
                        : "status-pendente"
                    }
                  >
                    {contato.status || "Pendente"}
                  </span>
                </div>
                <div className="contact-actions">
                  <button
                    type="button"
                    className="btn-status"
                    onClick={() => alterarStatus(contato.id)}
                  >
                    {contato.status === "Contatado"
                      ? "Marcar como pendente"
                      : "Marcar como contatado"}
                  </button>
                  <button
                    type="button"
                    className="btn-details"
                    onClick={() => setLeadSelecionadoId(contato.id)}
                  >
                    Ver ficha
                  </button>
                  {validarTelefone(contato.telefone) ? (
                    <a
                      href={gerarLinkWhatsApp(contato.telefone, contato.nome)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-whatsapp"
                    >
                      WhatsApp
                    </a>
                  ) : (
                    <span className="contact-invalid">Número inválido</span>
                  )}
                </div>
              </article>
            ))}
            {contatosFiltrados.length === 0 && (
              <p className="empty-filter">
                Nenhum contato encontrado para os filtros selecionados.
              </p>
            )}
          </div>
        </section>
      </div>

      {leadSelecionado && (
        <LeadModal
          key={leadSelecionado.id}
          lead={leadSelecionado}
          onClose={() => setLeadSelecionadoId(null)}
          onSaveObservation={salvarObservacao}
        />
      )}
    </main>
  );
}

export default Dashboard;
