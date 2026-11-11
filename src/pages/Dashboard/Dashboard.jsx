import { useState, useEffect } from "react";
import { importarPlanilha } from "../../utils/importarPlanilha";
import {
  gerarLinkWhatsApp,
  normalizarTelefone,
  validarTelefone,
} from "../../utils/whatsapp";
import { alertaIW } from "../../utils/alertas";
import "./Dashboard.css";

function Dashboard() {
  const [listaTexto, setListaTexto] = useState("");
  const [contatos, setContatos] = useState(() => {
    try {
      const contatosSalvos = localStorage.getItem("iw-connect-contatos");

      if (!contatosSalvos) {
        return [];
      }

      const dados = JSON.parse(contatosSalvos);

      return Array.isArray(dados) ? dados : [];
    } catch (error) {
      console.error("Erro ao recuperar contatos:", error);
      return [];
    }
  });

  const [busca, setBusca] = useState("");
  const [filtroCidade, setFiltroCidade] = useState("Todas");
  const [filtroStatus, setFiltroStatus] = useState("Todos");

  useEffect(() => {
    try {
      localStorage.setItem("iw-connect-contatos", JSON.stringify(contatos));
    } catch (error) {
      console.error("Erro ao salvar contatos:", error);
    }
  }, [contatos]);

  function processarContatos() {
    const linhas = listaTexto.split("\n");

    const novosContatos = linhas
      .filter((linha) => linha.trim() !== "")
      .map((linha, index) => {
        const [nome, telefone, cidade] = linha.split(";");

        return {
          id: crypto.randomUUID(),
          nome: nome?.trim() || `Contato ${index + 1}`,
          telefone: telefone?.trim() || "",
          cidade: cidade?.trim() || "Não informada",
          status: "Pendente",
        };
      })
      .filter((contato) => validarTelefone(contato.telefone));

    setContatos(novosContatos);
  }

  function alterarStatus(id) {
    setContatos((contatosAnteriores) =>
      contatosAnteriores.map((contato) => {
        if (contato.id === id) {
          return {
            ...contato,
            status: contato.status === "Pendente" ? "Contatado" : "Pendente",
          };
        }

        return contato;
      }),
    );
  }

  async function excluirContato(id) {
    const resultado = await alertaIW.fire({
      title: "Excluir contato?",
      text: "O contato será removido permanentemente da lista.",
      icon: "warning",
      iconColor: "#C9A24B",
      showCancelButton: true,
      confirmButtonText: "Sim, excluir",
      cancelButtonText: "Cancelar",
      reverseButtons: true,
      focusCancel: true,
    });

    if (!resultado.isConfirmed) return;

    setContatos((anteriores) =>
      anteriores.filter((contato) => contato.id !== id),
    );

    alertaIW.fire({
      icon: "success",
      title: "Contato excluído!",
      text: "O contato foi removido com sucesso.",
      showConfirmButton: false,
      timer: 1500,
      timerProgressBar: true,
    });
  }

  async function limparContatos() {
    if (contatos.length === 0) return;

    const resultado = await alertaIW.fire({
      title: "Limpar lista de contatos?",
      html: `
      <p>
        Você está prestes a excluir
        <strong>${contatos.length} contatos</strong>.
      </p>
      <p>Essa ação não poderá ser desfeita.</p>
    `,
      icon: "warning",
      iconColor: "#C9A24B",
      showCancelButton: true,
      confirmButtonText: "Sim, limpar lista",
      cancelButtonText: "Cancelar",
      reverseButtons: true,
      focusCancel: true,
    });

    if (!resultado.isConfirmed) return;

    setContatos([]);

    await alertaIW.fire({
      icon: "success",
      title: "Lista limpa!",
      text: "Todos os contatos foram removidos.",
      showConfirmButton: false,
      timer: 1500,
      timerProgressBar: true,
    });
  }

  async function handleImportarArquivo(event) {
    const arquivo = event.target.files?.[0];

    if (!arquivo) return;

    try {
      const linhas = await importarPlanilha(arquivo);

      const novosContatos = linhas.map((linha, index) => {
        const nome =
          linha.Nome || linha.nome || linha.NOME || `Contato ${index + 1}`;

        const telefone =
          linha.Telefone ||
          linha.telefone ||
          linha.TELEFONE ||
          linha.Celular ||
          linha.celular ||
          "";

        const cidade =
          linha.Cidade ||
          linha.cidade ||
          linha.CIDADE ||
          linha.Municipio ||
          linha.Município ||
          linha.municipio ||
          linha.município ||
          "";

        return {
          id: crypto.randomUUID(),
          nome: String(nome).trim(),
          telefone: String(telefone).trim(),
          cidade: String(cidade).trim() || "Não informada",
          status: "Pendente",
        };
      });

      const contatosValidos = novosContatos.filter((contato) =>
        validarTelefone(contato.telefone),
      );

      const numerosExistentes = new Set(
        contatos.map((contato) => normalizarTelefone(contato.telefone)),
      );

      const contatosUnicos = contatosValidos.filter((contato) => {
        const numero = normalizarTelefone(contato.telefone);

        if (numerosExistentes.has(numero)) {
          return false;
        }

        numerosExistentes.add(numero);

        return true;
      });

      setContatos((anteriores) => [...anteriores, ...contatosUnicos]);

      alert(`${contatosUnicos.length} contatos importados com sucesso!`);
    } catch (error) {
      console.error("Erro na importação:", error);
      alert("Não foi possível importar a planilha.");
    } finally {
      event.target.value = "";
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
    const termoBusca = busca.trim().toLocaleLowerCase("pt-BR");

    const correspondeBusca =
      contato.nome.toLocaleLowerCase("pt-BR").includes(termoBusca) ||
      contato.telefone.includes(termoBusca) ||
      (contato.cidade || "").toLocaleLowerCase("pt-BR").includes(termoBusca);

    const correspondeCidade =
      filtroCidade === "Todas" ||
      (contato.cidade || "Não informada") === filtroCidade;

    const correspondeStatus =
      filtroStatus === "Todos" || contato.status === filtroStatus;

    return correspondeBusca && correspondeCidade && correspondeStatus;
  });

  return (
    <main className="dashboard">
      <div className="dashboard-container">
        <section className="dashboard-heading">
          <div>
            <span className="dashboard-label">PAINEL DE CONTROLE</span>

            <h1>Gerenciamento de contatos</h1>

            <p>
              Organize seus contatos e inicie conversas no WhatsApp sem precisar
              salvar os números.
            </p>
          </div>
        </section>

        <section className="dashboard-stats">
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

        <section className="dashboard-import">
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
              placeholder={"Caroline;85992821874;Fortaleza\nBianca;85991806975;Eusebio"}
              value={listaTexto}
              onChange={(event) => setListaTexto(event.target.value)}
              rows={6}
            />

            <button className="btn-process" onClick={processarContatos}>
              Gerar links do WhatsApp
            </button>

            <div className="upload-divider">
              <span>OU</span>
            </div>

            <label className="btn-upload" htmlFor="arquivo-contatos">
              Importar planilha Excel ou CSV
            </label>

            <input
              id="arquivo-contatos"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleImportarArquivo}
              className="file-input"
            />
          </div>
        </section>

        {contatos.length > 0 && (
          <section className="contacts-section">
            <div className="contacts-header">
              <h2>Contatos encontrados</h2>

              <button
                type="button"
                className="btn-clear"
                onClick={limparContatos}
              >
                Limpar lista
              </button>
            </div>

            <div className="contacts-filters">
              <input
                type="text"
                placeholder="Buscar por nome, telefone ou cidade..."
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                className="filter-search"
              />

              <select
                value={filtroCidade}
                onChange={(event) => setFiltroCidade(event.target.value)}
                className="filter-select"
              >
                <option value="Todas">Todas as cidades</option>

                {cidades.map((cidade) => (
                  <option key={cidade} value={cidade}>
                    {cidade}
                  </option>
                ))}
              </select>

              <select
                value={filtroStatus}
                onChange={(event) => setFiltroStatus(event.target.value)}
                className="filter-select"
              >
                <option value="Todos">Todos os status</option>
                <option value="Pendente">Pendentes</option>
                <option value="Contatado">Contatados</option>
              </select>
            </div>

            <p className="filter-result">
              Exibindo {contatosFiltrados.length} de {contatos.length} contatos
            </p>

            <div className="contacts-list">
              {contatosFiltrados.map((contato) => (
                <div className="contact-item" key={contato.id}>
                  <div className="contact-info">
                    <strong>{contato.nome}</strong>

                    <span>{contato.telefone}</span>

                    <span className="contact-city">📍 {contato.cidade}</span>

                    <span
                      className={
                        contato.status === "Contatado"
                          ? "status-contatado"
                          : "status-pendente"
                      }
                    >
                      {contato.status}
                    </span>
                  </div>

                  <div className="contact-actions">
                    <button
                      className="btn-status"
                      onClick={() => alterarStatus(contato.id)}
                    >
                      {contato.status === "Pendente"
                        ? "Marcar como contatado"
                        : "Marcar como pendente"}
                    </button>

                    <a
                      href={gerarLinkWhatsApp(contato.telefone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-whatsapp"
                    >
                      Abrir WhatsApp
                    </a>
                    <button
                      type="button"
                      className="btn-delete"
                      onClick={() => excluirContato(contato.id)}
                      title="Excluir contato"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))}

              {contatosFiltrados.length === 0 && (
                <p className="empty-filter">
                  Nenhum contato encontrado para os filtros selecionados.
                </p>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

export default Dashboard;
