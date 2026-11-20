import { createHash } from "node:crypto";
import { Op } from "sequelize";
import { User, Session } from "../models/index.js";


export async function authMiddleware(req, res, next) {
  try {
    const token = req.cookies?.iw_session;

    if (!token || typeof token !== "string") {
      return res.status(401).json({
        message: "Usuário não autenticado."
      });
    }

    const tokenHash = createHash("sha256")
      .update(token)
      .digest("hex");

    const session = await Session.findOne({
      where: {
        tokenHash,
        expiresAt: {
          [Op.gt]: new Date()
        }
      },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email", "role"],
          required: true
        }
      ]
    });

    if (!session) {
      return res.status(401).json({
        message: "Sessão inválida ou expirada."
      });
    }

    req.user = session.user.toJSON();
    req.sessionTokenHash = tokenHash;

    next();

  } catch (error) {
    console.error("Erro na autenticação:", error);

    return res.status(500).json({
      message: "Erro interno do servidor."
    });
  }
}