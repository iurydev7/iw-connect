import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { listarHistorico } from "../../services/leadService.js";
import "./LeadModal.css";

function formatarData(data) {
  if (!data) return "Não registrada";

  const valor = new Date(data);

  if (Number.isNaN(valor.getTime())) {
    return "Data inválida";
  }

  return valor.toLocaleString("pt-BR");
}

function LeadModal({
  lead,
  onClose,
  onSaveObservation,
  somenteLeitura = false,
}) {
  const dialogRef = useRef(null);

  const [observacao, setObservacao] = useState("");
  const [observacaoSalva, setObservacaoSalva] = useState(false);
  const [historico, setHistorico] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [carregandoHistorico, setCarregandoHistorico] = useState(true);
  const [erro, setErro] = useState("");

  const leadId = lead?.id;

  // Consultar histórico no banco
  useEffect(() => {
    if (!leadId) return;

    let ativo = true;

    async function carregar() {
      try {
        const dados = await listarHistorico(leadId);

        if (ativo) setHistorico(dados);
      } catch (error) {
        if (ativo) setErro(error.message);
      } finally {
        if (ativo) setCarregandoHistorico(false);
      }
    }

    carregar();

    return () => {
      ativo = false;
    };
  }, [leadId]);

  // Controlar abertura do modal
  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) return;

    if (!dialog.open) {
      dialog.showModal();
    }

    return () => {
      if (dialog.open) {
        dialog.close();
      }
    };
  }, [leadId]);

  if (!lead) return null;

  // Registrar nova observação
  async function salvarObservacao(event) {
    event.preventDefault();
    if (somenteLeitura) return;

    if (!observacao.trim() || salvando) return;

    setSalvando(true);
    setErro("");
    setObservacaoSalva(false);

    try {
      const registro = await onSaveObservation(lead.id, observacao.trim());

      setHistorico((anteriores) => [registro, ...anteriores]);

      setObservacao("");
      setObservacaoSalva(true);
    } catch (error) {
      setErro(error.message);
    } finally {
      setSalvando(false);
    }
  }

  return createPortal(
    <dialog
      ref={dialogRef}
      className="lead-modal"
      aria-labelledby="lead-modal-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="lead-modal-header">
        <div>
          <span className="lead-modal-label">FICHA COMERCIAL</span>

          <h2 id="lead-modal-title">{lead.nome}</h2>
          <p>{lead.telefone}</p>
        </div>

        <button
          type="button"
          className="lead-modal-close"
          aria-label="Fechar ficha"
          onClick={onClose}
        >
          ×
        </button>
      </div>

      <div className="lead-modal-body">
        <div className="lead-modal-grid">
          <div>
            <span>Cidade</span>

            <strong>
              {lead.cidade || "Não informada"}
              {lead.uf ? ` - ${lead.uf}` : ""}
            </strong>
          </div>

          <div>
            <span>Bairro</span>
            <strong>{lead.bairro || "Não informado"}</strong>
          </div>

          <div>
            <span>Status</span>
            <strong>{lead.status || "Pendente"}</strong>
          </div>

          <div>
            <span>Responsável</span>

            <strong>{lead.responsavel?.name || "Não atribuído"}</strong>
          </div>

          <div>
            <span>Data de entrada</span>

            <strong>{formatarData(lead.dataEntrada)}</strong>
          </div>

          <div>
            <span>Último contato registrado</span>

            <strong>{formatarData(lead.dataContatado)}</strong>
          </div>
        </div>
        {somenteLeitura && (
          <p className="lead-readonly-notice">
            Modo supervisão: você pode consultar, mas não alterar este
            atendimento.
          </p>
        )}
        {!somenteLeitura && (
          <form onSubmit={salvarObservacao}>
            <label htmlFor="lead-observacao">
              Nova observação do atendimento
            </label>

            <textarea
              id="lead-observacao"
              value={observacao}
              onChange={(event) => {
                setObservacao(event.target.value);
                setObservacaoSalva(false);
              }}
              placeholder="Registre a tratativa comercial..."
              rows={5}
              maxLength={2000}
              required
            />

            <button
              type="submit"
              className="lead-save-button"
              disabled={salvando || carregandoHistorico || !observacao.trim()}
            >
              {salvando ? "Salvando..." : "Salvar observação"}
            </button>

            {observacaoSalva && (
              <div className="lead-save-success" role="status">
                ✓ Observação salva com sucesso!
              </div>
            )}

            {erro && (
              <div className="lead-save-error" role="alert">
                {erro}
              </div>
            )}
          </form>
        )}

        {somenteLeitura && erro && (
          <div className="lead-save-error" role="alert">
            {erro}
          </div>
        )}

        <section className="lead-history">
          <h3>Histórico comercial</h3>

          {carregandoHistorico && <p>Carregando histórico...</p>}

          {!carregandoHistorico && !erro && historico.length === 0 && (
            <p>Nenhum atendimento registrado.</p>
          )}

          {historico.map((registro) => (
            <div className="history-item" key={registro.id}>
              <span className="history-date">
                {formatarData(registro.createdAt)}
              </span>
              {registro.autor?.name && (
                <span className="history-author">
                  Registrado por {registro.autor.name}
                </span>
              )}

              <p>{registro.description}</p>
            </div>
          ))}
        </section>
      </div>
    </dialog>,
    document.body,
  );
}

export default LeadModal;
