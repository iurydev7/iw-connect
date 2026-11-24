import bcrypt from "bcrypt";
import { randomUUID } from "node:crypto";
import { UniqueConstraintError } from "sequelize";
import {
  sequelize,
  User,
  Session,
  Lead,
  Atendimento,
  Lembrete,
} from "../models/index.js";

const atributos = ["id", "name", "email", "role"];

function erro(status, message) {
  return Object.assign(new Error(message), { status });
}

function validarDados(dados) {
  const name = String(dados?.name ?? "").trim();
  const email = String(dados?.email ?? "")
    .toLowerCase()
    .trim();

  if (
    !name ||
    name.length > 100 ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw erro(400, "Informe nome e e-mail válidos.");
  }

  return { name, email };
}

function validarSenha(password) {
  if (
    typeof password !== "string" ||
    password.length < 12 ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    throw erro(
      400,
      "A senha deve ter pelo menos 12 caracteres e até 72 bytes.",
    );
  }

  return password;
}

// Define quem pode administrar cada usuário.
function podeGerenciar(ator, alvo) {
  if (!ator || !alvo || ator.id === alvo.id) {
    return false;
  }

  if (alvo.role === "consultor") {
    return ["admin", "master"].includes(ator.role);
  }

  return ator.role === "master" && alvo.role === "admin";
}

export async function listar() {
  return User.findAll({
    attributes: atributos,
    order: [["name", "ASC"]],
  });
}

export async function criar(dados, ator) {
  const { name, email } = validarDados(dados);
  const password = validarSenha(dados?.password);
  const role = dados?.role ?? "consultor";

  if (!["consultor", "admin"].includes(role)) {
    throw erro(400, "Perfil de acesso inválido.");
  }

  if (role === "admin" && ator?.role !== "master") {
    throw erro(403, "Somente o Master pode criar administradores.");
  }

  const existente = await User.findOne({
    where: { email },
    paranoid: false,
  });

  if (existente?.deletedAt) {
    return sequelize.transaction(async (transaction) => {
      await existente.update(
        {
          name,
          email,
          passwordHash: await bcrypt.hash(password, 12),
          role,
        },
        { transaction },
      );
      await existente.restore({ transaction });

      return {
        id: existente.id,
        name: existente.name,
        email: existente.email,
        role: existente.role,
        reativado: true,
        message: "Usuário reativado com sucesso!",
      };
    });
  }

  if (existente) {
    throw erro(409, "Este e-mail já está cadastrado.");
  }

  try {
    const user = await User.create({
      id: randomUUID(),
      name,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role,
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      reativado: false,
      message: "Usuário cadastrado com sucesso!",
    };
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      throw erro(409, "Este e-mail já está cadastrado.");
    }

    throw error;
  }
}

export async function editar(id, dados, ator) {
  const { name, email } = validarDados(dados);
  const alvo = await User.findByPk(id);

  if (!alvo) {
    throw erro(404, "Usuário não encontrado.");
  }

  if (!podeGerenciar(ator, alvo)) {
    throw erro(403, "Sem permissão para editar este usuário.");
  }

  try {
    await alvo.update({ name, email });

    return {
      id: alvo.id,
      name: alvo.name,
      email: alvo.email,
      role: alvo.role,
    };
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      throw erro(409, "Este e-mail já está cadastrado.");
    }

    throw error;
  }
}

export async function redefinirSenha(id, novaSenha, ator) {
  const password = validarSenha(novaSenha);
  const alvo = await User.findByPk(id);

  if (!alvo) {
    throw erro(404, "Usuário não encontrado.");
  }

  if (!podeGerenciar(ator, alvo)) {
    throw erro(403, "Sem permissão para redefinir a senha deste usuário.");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await sequelize.transaction(async (transaction) => {
    await alvo.update({ passwordHash }, { transaction });

    // Encerra as sessões existentes do usuário.
    await Session.destroy({
      where: { userId: alvo.id },
      transaction,
    });
  });

  return {
    message: "Senha atualizada. Sessões anteriores encerradas.",
  };
}
export async function remover(id, ator) {
  return sequelize.transaction(async (transaction) => {
    const usuario = await User.findByPk(id, {
      transaction,
    });

    if (!usuario) {
      throw erro(404, "Usuário não encontrado.");
    }

    if (!podeGerenciar(ator, usuario)) {
      throw erro(403, "Você não possui permissão para remover este usuário.");
    }

    // Localiza leads atualmente atribuídos.
    const leads = await Lead.findAll({
      attributes: ["id"],
      where: {
        responsavelId: usuario.id,
      },
      transaction,
    });

    // Libera os leads para redistribuição.
    if (leads.length > 0) {
      await Lead.update(
        {
          responsavelId: null,
        },
        {
          where: {
            responsavelId: usuario.id,
          },
          transaction,
        },
      );

      // Registra a liberação no histórico.
      await Atendimento.bulkCreate(
        leads.map((lead) => ({
          leadId: lead.id,
          userId: ator.id,
          type: "reserva",
          description: `Lead liberado após remoção do usuário ${usuario.name}.`,
        })),
        { transaction },
      );
    }

    // Cancela lembretes pendentes do usuário.
    await Lembrete.update(
      {
        status: "cancelado",
        resolvedAt: new Date(),
      },
      {
        where: {
          userId: usuario.id,
          status: "pendente",
        },
        transaction,
      },
    );

    // Encerra sessões.
    await Session.destroy({
      where: {
        userId: usuario.id,
      },
      transaction,
    });

    // Remoção lógica: preserva histórico e relacionamentos.
    await usuario.destroy({ transaction });

    return {
      message: "Usuário removido da equipe com sucesso.",
      leadsLiberados: leads.length,
    };
  });
}
