import {
  sequelize,
  User,
  Session,
} from "../models/index.js";

const email = process.argv[2]?.trim().toLowerCase();

async function executar() {
  try {
    if (
      !email ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      throw new Error(
        "Informe o e-mail de um administrador existente."
      );
    }

    await sequelize.transaction(async (transaction) => {
      const masterExistente = await User.findOne({
        where: { role: "master" },
        transaction,
      });

      if (masterExistente) {
        throw new Error(
          "Já existe um Master. Nenhuma alteração foi realizada."
        );
      }

      const administrador = await User.findOne({
        where: {
          email,
          role: "admin",
        },
        transaction,
      });

      if (!administrador) {
        throw new Error(
          "Administrador não encontrado."
        );
      }

      await administrador.update(
        { role: "master" },
        { transaction }
      );

      await Session.destroy({
        where: {
          userId: administrador.id,
        },
        transaction,
      });
    });

    console.log(
      "Master configurado. Faça login novamente."
    );
  } catch (error) {
    console.error("Erro:", error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

executar();