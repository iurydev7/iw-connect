import { randomUUID } from "node:crypto";
import { Op, UniqueConstraintError } from "sequelize";
import {
  sequelize,
  Lead,
  User,
  Atendimento,
  Lembrete,
} from "../models/index.js";
import {
  normalizarNome,
  normalizarLocalidade,
} from "../utils/normalizarDados.js";

const STATUS_VALIDOS = [
  "Pendente",
  "Contatado",
  "Em negociação",
  "Aguardando retorno",
  "Sem resposta",
  "Contato inexistente",
  "Sem interesse",
  "Convertido",
];

function erro(status, message) {
  return Object.assign(new Error(message), { status });
}

function exigirMaster(user) {
  if (user?.role !== "master") {
    throw erro(403, "Somente o Master pode excluir leads.");
  }
}

function cancelarLembretes(leadIds, transaction) {
  return Lembrete.update(
    {
      status: "cancelado",
      resolvedAt: new Date(),
    },
    {
      where: {
        leadId: leadIds,
        status: "pendente",
      },
      transaction,
    },
  );
}

function texto(valor) {
  return String(valor ?? "").trim();
}

function normalizarTelefone(valor) {
  const original = texto(valor);

  if (!/^[+\d\s().-]+$/.test(original)) return null;

  let numero = original.replace(/\D/g, "");

  if (numero.startsWith("55") && [12, 13].includes(numero.length)) {
    numero = numero.slice(2);
  }

  if (!/^[1-9]\d{9,10}$/.test(numero)) return null;

  return `55${numero}`;
}

const includeResponsavel = {
  model: User,
  as: "responsavel",
  attributes: ["id", "name"],
};

// IMPORTAÇÃO DE LEADS

export async function importar(leads) {
  if (!Array.isArray(leads) || leads.length === 0 || leads.length > 500) {
    throw erro(400, "Envie entre 1 e 500 leads.");
  }

  let importados = 0;
  let duplicados = 0;
  let invalidos = 0;

  async function salvar(item) {
    const nome = normalizarNome(item?.nome);

    const telefone = normalizarTelefone(item?.telefone);

    const cidade = normalizarLocalidade(item?.cidade) || "NÃO INFORMADA";

    const uf = normalizarLocalidade(item?.uf) || null;

    const bairro = normalizarLocalidade(item?.bairro) || null;
    if (
      !nome ||
      !telefone ||
      nome.length > 150 ||
      cidade.length > 120 ||
      (bairro && bairro.length > 120) ||
      (uf && !/^[A-Z]{2}$/.test(uf))
    ) {
      return "invalido";
    }

    try {
      await Lead.create({
        id: randomUUID(),
        nome,
        telefone,
        cidade,
        uf,
        bairro,
        status: "Pendente",
        responsavelId: null,
      });

      return "importado";
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        return "duplicado";
      }

      throw error;
    }
  }

  for (let i = 0; i < leads.length; i += 10) {
    const lote = leads.slice(i, i + 10);
    const resultados = await Promise.all(lote.map(salvar));

    for (const resultado of resultados) {
      if (resultado === "importado") importados++;
      if (resultado === "duplicado") duplicados++;
      if (resultado === "invalido") invalidos++;
    }
  }

  return {
    importados,
    duplicados,
    invalidos,
  };
}

// TRATAMENTO DOS FILTROS DE DATA

function intervaloData(valor) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    throw erro(400, "Data inválida.");
  }

  const inicio = new Date(`${valor}T00:00:00-03:00`);

  if (
    Number.isNaN(inicio.getTime()) ||
    inicio.toISOString().slice(0, 10) !== valor
  ) {
    throw erro(400, "Data inválida.");
  }

  const fim = new Date(inicio.getTime() + 86400000);

  return {
    [Op.gte]: inicio,
    [Op.lt]: fim,
  };
}

// LISTAGEM DE LEADS

export async function listar(filtros, user) {
  const where = {};

  const busca = texto(filtros.busca);
  const cidade = normalizarLocalidade(filtros.cidade);
  const uf = normalizarLocalidade(filtros.uf);
  const bairro = normalizarLocalidade(filtros.bairro);
  const status = texto(filtros.status);

  if (busca) {
    where[Op.or] = [
      { nome: { [Op.like]: `%${busca}%` } },
      { telefone: { [Op.like]: `%${busca}%` } },
      { cidade: { [Op.like]: `%${busca}%` } },
    ];
  }

  if (cidade) where.cidade = cidade;
  if (uf) where.uf = uf;
  if (bairro) where.bairro = bairro;

  if (status) {
    if (!STATUS_VALIDOS.includes(status)) {
      throw erro(400, "Status inválido.");
    }

    where.status = status;
  }

  if (filtros.dataEntrada) {
    where.dataEntrada = intervaloData(filtros.dataEntrada);
  }

  if (filtros.dataContato) {
    where.dataContatado = intervaloData(filtros.dataContato);
  }

  // Controle de acesso à carteira comercial

  const isGestor = ["admin", "master"].includes(user.role);

  // Controle de acesso à carteira comercial

  if (user.role === "consultor") {
    where.responsavelId = user.id;
  } else if (["admin", "master"].includes(user.role)) {
    if (filtros.responsavel === "meus") {
      where.responsavelId = user.id;
    } else if (filtros.responsavel === "livres") {
      where.responsavelId = null;
    } else if (filtros.responsavel) {
      if (user.role !== "master") {
        throw erro(403, "Apenas o Master pode supervisionar outras carteiras.");
      }

      const consultor = await User.findOne({
        where: {
          id: filtros.responsavel,
          role: "consultor",
        },
      });

      if (!consultor) {
        throw erro(404, "Consultor não encontrado.");
      }

      where.responsavelId = consultor.id;
    }
  } else {
    throw erro(403, "Perfil sem permissão de acesso.");
  }
  const page = Math.max(1, parseInt(filtros.page, 10) || 1);

  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(filtros.pageSize, 10) || 50),
  );

  const order =
    filtros.responsavel === "livres"
      ? [
          ["updatedAt", "DESC"],
          ["dataEntrada", "DESC"],
          ["id", "DESC"],
        ]
      : [
          ["dataEntrada", "DESC"],
          ["id", "DESC"],
        ];

  const { count, rows } = await Lead.findAndCountAll({
    where,
    include: [includeResponsavel],
    order,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  return {
    leads: rows,
    total: count,
    page,
    pageSize,
  };
}

// LOCALIZAÇÃO INDIVIDUAL DO LEAD

async function obterLead(id) {
  const lead = await Lead.findByPk(id, {
    include: [includeResponsavel],
  });

  if (!lead) {
    throw erro(404, "Lead não encontrado.");
  }

  return lead;
}

export async function distribuir(leadIds, consultorId, adminId) {
  if (
    !Array.isArray(leadIds) ||
    leadIds.length === 0 ||
    leadIds.length > 100 ||
    leadIds.some((id) => typeof id !== "string" || !id.trim())
  ) {
    throw erro(400, "Selecione entre 1 e 100 leads válidos.");
  }

  if (typeof consultorId !== "string" || !consultorId.trim()) {
    throw erro(400, "Selecione um responsável.");
  }

  // Permite consultores ou o próprio administrador
  const responsavel = await User.findOne({
    where: {
      id: consultorId,
      [Op.or]: [
        { role: "consultor" },
        {
          id: adminId,
          role: { [Op.in]: ["admin", "master"] },
        },
      ],
    },
  });

  if (!responsavel) {
    throw erro(404, "Responsável não encontrado.");
  }

  const ids = [...new Set(leadIds)].sort();

  return sequelize.transaction(async (transaction) => {
    const atribuidos = [];

    for (const id of ids) {
      const [alterados] = await Lead.update(
        {
          responsavelId: responsavel.id,
        },
        {
          where: {
            id,
            responsavelId: null,
          },
          transaction,
        },
      );

      if (alterados === 1) {
        atribuidos.push(id);
      }
    }

    if (atribuidos.length > 0) {
      await Atendimento.bulkCreate(
        atribuidos.map((id) => ({
          leadId: id,
          userId: adminId,
          type: "reserva",
          description:
            responsavel.id === adminId
              ? "Lead atribuído à própria carteira do administrador."
              : `Lead distribuído para ${responsavel.name}.`,
        })),
        { transaction },
      );
    }

    return {
      distribuidos: atribuidos.length,
      ignorados: ids.length - atribuidos.length,
      leadIds: atribuidos,
    };
  });
}

export async function alterarStatus(id, userId, status) {
  if (!STATUS_VALIDOS.includes(status)) {
    throw erro(400, "Status inválido.");
  }

  await sequelize.transaction(async (transaction) => {
    const lead = await Lead.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!lead) {
      throw erro(404, "Lead não encontrado.");
    }

    if (lead.responsavelId !== userId) {
      throw erro(403, "Você não é o responsável por este lead.");
    }

    const statusAnterior = lead.status;
    const dados = { status };

    if (status !== "Pendente") {
      dados.dataContatado = new Date();
    }

    await lead.update(dados, { transaction });

    if (statusAnterior !== status) {
      await Atendimento.create(
        {
          leadId: lead.id,
          userId,
          type: "status",
          description: `Status alterado de ${statusAnterior} para ${status}.`,
        },
        { transaction },
      );
    }
  });

  return obterLead(id);
}

// INDICADORES DO DASHBOARD

export async function obterIndicadores(user, responsavelFiltro) {
  const admin = ["admin", "master"].includes(user.role);

  let carteira;

  if (user.role === "consultor") {
    carteira = { responsavelId: user.id };
  } else if (admin) {
    if (responsavelFiltro === "meus") {
      carteira = { responsavelId: user.id };
    } else if (responsavelFiltro === "livres") {
      carteira = { responsavelId: null };
    } else if (responsavelFiltro) {
      if (user.role !== "master") {
        throw erro(403, "Apenas o Master pode supervisionar outras carteiras.");
      }

      const consultor = await User.findOne({
        where: {
          id: responsavelFiltro,
          role: "consultor",
        },
      });

      if (!consultor) {
        throw erro(404, "Consultor não encontrado.");
      }

      carteira = { responsavelId: consultor.id };
    } else {
      carteira = {};
    }
  } else {
    throw erro(403, "Perfil sem permissão de acesso.");
  }

  const contarDisponiveis =
    admin && (!responsavelFiltro || responsavelFiltro === "livres");

  const [total, contatados, pendentes, disponiveis, cidades] =
    await Promise.all([
      Lead.count({
        where: carteira,
      }),

      Lead.count({
        where: {
          ...carteira,
          status: "Contatado",
        },
      }),

      Lead.count({
        where: {
          ...carteira,
          status: "Pendente",
        },
      }),

      contarDisponiveis
        ? Lead.count({
            where: { responsavelId: null },
          })
        : Promise.resolve(0),

      Lead.findAll({
        attributes: ["cidade"],
        where: carteira,
        group: ["cidade"],
        order: [["cidade", "ASC"]],
        raw: true,
      }),
    ]);

  return {
    total,
    contatados,
    pendentes,
    disponiveis,
    cidades: cidades.map((item) => item.cidade).filter(Boolean),
  };
}

// HISTÓRICO COMERCIAL

export async function listarHistorico(id, user) {
  const lead = await obterLead(id);

  const ehResponsavel = lead.responsavelId === user.id;
  const ehMaster = user.role === "master";

  if (!ehResponsavel && !ehMaster) {
    throw erro(403, "Sem permissão para consultar este histórico.");
  }

  return Atendimento.findAll({
    where: { leadId: id },
    include: [
      {
        model: User,
        as: "autor",
        attributes: ["id", "name"],
      },
    ],
    order: [["createdAt", "DESC"]],
    limit: 100,
  });
}

// REGISTRO DE OBSERVAÇÕES

export async function salvarObservacao(id, userId, observacao) {
  const lead = await obterLead(id);

  if (lead.responsavelId !== userId) {
    throw erro(403, "Você não é o responsável por este lead.");
  }

  const description = texto(observacao);

  if (!description || description.length > 2000) {
    throw erro(400, "Informe uma observação de até 2000 caracteres.");
  }

  return Atendimento.create({
    leadId: id,
    userId,
    type: "observacao",
    description,
  });
}

export async function remover(id, user) {
  exigirMaster(user);

  if (typeof id !== "string" || !id.trim()) {
    throw erro(400, "Lead inválido.");
  }

  return sequelize.transaction(async (transaction) => {
    const lead = await Lead.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!lead) {
      throw erro(404, "Lead não encontrado.");
    }

    await cancelarLembretes([lead.id], transaction);
    await lead.destroy({ transaction });

    return {
      message: "Lead removido com sucesso.",
      removidos: 1,
    };
  });
}

export async function removerEmMassa(leadIds, user) {
  exigirMaster(user);

  if (
    !Array.isArray(leadIds) ||
    leadIds.length === 0 ||
    leadIds.length > 100 ||
    leadIds.some((id) => typeof id !== "string" || !id.trim())
  ) {
    throw erro(400, "Selecione entre 1 e 100 leads válidos.");
  }

  const ids = [...new Set(leadIds.map((id) => id.trim()))];

  return sequelize.transaction(async (transaction) => {
    const leads = await Lead.findAll({
      attributes: ["id"],
      where: { id: ids },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (leads.length !== ids.length) {
      throw erro(404, "Um ou mais leads não foram encontrados.");
    }

    await cancelarLembretes(ids, transaction);

    const removidos = await Lead.destroy({
      where: { id: ids },
      transaction,
    });

    if (removidos !== ids.length) {
      throw erro(409, "Não foi possível excluir todos os leads selecionados.");
    }

    return {
      message: `${removidos} leads removidos com sucesso.`,
      removidos,
    };
  });
}
