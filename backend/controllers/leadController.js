import * as leadService from "../services/leadService.js";

async function executar(res, operacao, status = 200) {
  try {
    const resultado = await operacao();

    return res.status(status).json(resultado);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        message: error.message,
      });
    }

    console.error("Erro no módulo de leads:", error.name);

    return res.status(500).json({
      message: "Erro interno do servidor.",
    });
  }
}

export function importar(req, res) {
  return executar(
    res,
    () => leadService.importar(req.body?.leads)
  );
}

export function listar(req, res) {
  return executar(
    res,
    () => leadService.listar(req.query, req.user.id)
  );
}

export function reservar(req, res) {
  return executar(
    res,
    () => leadService.reservar(req.params.id, req.user.id)
  );
}

export function liberar(req, res) {
  return executar(
    res,
    () => leadService.liberar(req.params.id, req.user.id)
  );
}

export function alterarStatus(req, res) {
  return executar(
    res,
    () =>
      leadService.alterarStatus(
        req.params.id,
        req.user.id,
        req.body?.status
      )
  );
}