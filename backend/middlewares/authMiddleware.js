import { getSession } from "../services/authService.js";


export async function authMiddleware(req, res, next) {
  try {
    const token = req.cookies?.iw_session;

    if (!token || typeof token !== "string") {
      return res.status(401).json({
        message: "Usuário não autenticado."
      });
    }

    const session = await getSession(token);

    if (!session) {
      return res.status(401).json({
        message: "Sessão inválida ou expirada."
      });
    }

    req.user = session.user;
    req.sessionTokenHash = session.tokenHash;

    next();

  } catch (error) {
    console.error("Erro na autenticação:", error);

    return res.status(500).json({
      message: "Erro interno do servidor."
    });
  }
}
