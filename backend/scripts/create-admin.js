import bcrypt from "bcrypt";
import { sequelize, User } from "../models/index.js";

const [, , name, rawEmail] = process.argv;
const email = rawEmail?.trim().toLowerCase();
const password = process.env.IW_ADMIN_PASSWORD;

async function createAdmin() {
  try {
    if (!name || !email || !password) {
      throw new Error("Informe nome, e-mail e senha.");
    }

    if (password.length < 12 || Buffer.byteLength(password) > 72) {
      throw new Error("Utilize uma senha de pelo menos 12 caracteres e até 72 bytes.");
    }

    const existingUser = await User.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new Error("Este e-mail já está cadastrado.");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await User.create({
      name,
      email,
      passwordHash,
      role: "admin",
    });

    console.log("Administrador criado com sucesso!");
  } catch (error) {
    console.error("Erro:", error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

createAdmin();