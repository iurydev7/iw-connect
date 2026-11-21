import bcrypt from "bcrypt";
import { randomUUID } from "node:crypto";
import { UniqueConstraintError } from "sequelize";
import { User } from "../models/index.js";

const atributos = ["id", "name", "email", "role"];

function erro(status, message) {
  return Object.assign(new Error(message), { status });
}

function validarDados(dados) {
  const name = String(dados?.name ?? "").trim();
  const email = String(dados?.email ?? "").toLowerCase().trim();

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

export async function listar() {
  return User.findAll({
    attributes: atributos,
    order: [["name", "ASC"]],
  });
}

export async function criar(dados) {
  const { name, email } = validarDados(dados);

  const password = dados?.password;

  if (
    typeof password !== "string" ||
    password.length < 12 ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    throw erro(400, "Informe uma senha válida com pelo menos 12 caracteres.");
  }

  try {
    const user = await User.create({
      id: randomUUID(),
      name,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: "consultor",
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      throw erro(409, "Este e-mail já está cadastrado.");
    }

    throw error;
  }
}

export async function editar(id, dados) {
  const { name, email } = validarDados(dados);

  const user = await User.findOne({
    where: {
      id,
      role: "consultor",
    },
  });

  if (!user) {
    throw erro(404, "Consultor não encontrado.");
  }

  try {
    await user.update({ name, email });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      throw erro(409, "Este e-mail já está cadastrado.");
    }

    throw error;
  }
}