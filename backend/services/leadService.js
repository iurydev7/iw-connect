import { randomUUID } from "node:crypto";
import { Op, UniqueConstraintError } from "sequelize";
import { Lead, User } from "../models/index.js";

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

function texto(valor) {
  return String(valor ?? "").trim();
}

function normalizarTelefone(valor) {
  const original = texto(valor);

  if (!/^[+\d\s().-]+$/.test(original)) return null;

  let numero = original.replace(/\D/g, "");

  if (
    numero.startsWith("55") &&
    [12, 13].includes(numero.length)
  ) {
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
export async function importar(leads) {
  if (
    !Array.isArray(leads) ||
    leads.length === 0 ||
    leads.length > 500
  ) {
    throw erro(400, "Envie entre 1 e 500 leads.");
  }

  let importados = 0;
  let duplicados = 0;
  let invalidos = 0;

  async function salvar(item) {
    const nome = texto(item?.nome);
    const telefone = normalizarTelefone(item?.telefone);
    const cidade = texto(item?.cidade) || "Não informada";
    const uf = texto(item?.uf).toUpperCase() || null;
    const bairro = texto(item?.bairro) || null;

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

export async function listar(filtros, userId) {
  const where = {};

  const busca = texto(filtros.busca);
  const cidade = texto(filtros.cidade);
  const uf = texto(filtros.uf).toUpperCase();
  const bairro = texto(filtros.bairro);
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

  if (filtros.responsavel === "meus") {
    where.responsavelId = userId;
  }

  if (filtros.responsavel === "livres") {
    where.responsavelId = null;
  }

  const page = Math.max(
    1,
    parseInt(filtros.page, 10) || 1
  );

  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(filtros.pageSize, 10) || 50)
  );

  const { count, rows } = await Lead.findAndCountAll({
    where,
    include: [includeResponsavel],
    order: [
      ["dataEntrada", "DESC"],
      ["id", "DESC"],
    ],
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
async function obterLead(id) {
  const lead = await Lead.findByPk(id, {
    include: [includeResponsavel],
  });

  if (!lead) {
    throw erro(404, "Lead não encontrado.");
  }

  return lead;
}

export async function reservar(id, userId) {
  await Lead.update(
    {
      responsavelId: userId,
    },
    {
      where: {
        id,
        responsavelId: null,
      },
    }
  );

  const lead = await obterLead(id);

  if (lead.responsavelId !== userId) {
    throw erro(
      409,
      "Este lead já está sendo atendido por outro usuário."
    );
  }

  return lead;
}

export async function liberar(id, userId) {
  await Lead.update(
    {
      responsavelId: null,
    },
    {
      where: {
        id,
        responsavelId: userId,
      },
    }
  );

  const lead = await obterLead(id);

  if (lead.responsavelId !== null) {
    throw erro(
      409,
      "Você não é o responsável por este atendimento."
    );
  }

  return lead;
}
export async function alterarStatus(id, userId, status) {
  if (!STATUS_VALIDOS.includes(status)) {
    throw erro(400, "Status inválido.");
  }

  const dados = { status };

  if (status !== "Pendente") {
    dados.dataContatado = new Date();
  }

  await Lead.update(dados, {
    where: {
      id,
      responsavelId: userId,
    },
  });

  const lead = await obterLead(id);

  if (lead.responsavelId !== userId) {
    throw erro(
      409,
      "Assuma o atendimento antes de alterar o status."
    );
  }

  return lead;
}