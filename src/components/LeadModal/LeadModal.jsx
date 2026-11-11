import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./LeadModal.css";

function formatarData(data) {
  if (!data) return "Não registrada";
  const valor = new Date(data);
  if (Number.isNaN(valor.getTime())) return "Data inválida";
  return valor.toLocaleString("pt-BR");
}

function LeadModal({ lead, onClose, onSaveObservation }) {
  const dialogRef = useRef(null);
  const [observacao, setObservacao] = useState(lead?.observacao || "");
  const [observacaoSalva, setObservacaoSalva] = useState(false);

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
  }, []);

  if (!lead) return null;

  function salvarObservacao(event) {
    event.preventDefault();

    onSaveObservation(lead.id, observacao);

    setObservacaoSalva(true);
  }

  return createPortal(
    <dialog
      ref={dialogRef}
      className="lead-modal"
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
          <h2>{lead.nome}</h2>
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
            <strong>{lead.cidade || "Não informada"}</strong>
          </div>
          <div>
            <span>Status</span>
            <strong>{lead.status || "Pendente"}</strong>
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

        <form onSubmit={salvarObservacao}>
          <label htmlFor="lead-observacao">Observações do atendimento</label>
          <textarea
            id="lead-observacao"
            value={observacao}
            onChange={(event) => {
              setObservacao(event.target.value);
              setObservacaoSalva(false);
            }}
            placeholder="Registre a tratativa comercial..."
            rows={5}
          />
          <button type="submit" className="lead-save-button">
            Salvar observação
          </button>

          {observacaoSalva && (
            <div className="lead-save-success" role="status">
              ✓ Observação salva com sucesso!
            </div>
          )}
        </form>

        <section className="lead-history">
          <h3>Histórico comercial</h3>
          <p>
            Em breve, cada atendimento ficará registrado aqui com data, hora e
            descrição.
          </p>
        </section>
      </div>
    </dialog>,
    document.body,
  );
}

export default LeadModal;
