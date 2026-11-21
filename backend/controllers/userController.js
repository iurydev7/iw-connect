import * as userService from "../services/userService.js";

async function executar(res, operacao, status = 200) {
  try {
    const resultado = await operacao();

    return res.status(status).json(resultado);
  } catch (error) {
    return res.status(error.status || 500).json({
      message: error.status
        ? error.message
        : "Erro interno do servidor.",
    });
  }
}

export function listar(req, res) {
  return executar(res, () => userService.listar());
}

export function criar(req, res) {
  return executar(
    res,
    () => userService.criar(req.body),
    201
  );
}

export function editar(req, res) {
  return executar(
    res,
    () => userService.editar(req.params.id, req.body)
  );
}