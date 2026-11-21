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
    () => leadService.listar(req.query, req.user)
  );
}

export function reservar(req, res) {
  return executar(
    res,
    () => leadService.reservar(req.params.id, req.user.id)
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
export function obterIndicadores(req, res) {
  return executar(
    res,
    () => leadService.obterIndicadores(req.user)
  );
}

export function listarHistorico(req, res) {
  return executar(
    res,
    () => leadService.listarHistorico(
      req.params.id,
      req.user.id
    )
  );
}

export function salvarObservacao(req, res) {
  return executar(
    res,
    () => leadService.salvarObservacao(
      req.params.id,
      req.user.id,
      req.body?.observacao
    ),
    201
  );
}
export function distribuir(req, res) {
  return executar(
    res,
    () => leadService.distribuir(
      req.body?.leadIds,
      req.body?.consultorId,
      req.user.id
    )
  );
}