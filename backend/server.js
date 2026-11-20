import "dotenv/config";
import app from "./app.js";
import { sequelize } from "./models/index.js";

const PORT = process.env.PORT || 4000;

async function startServer() {
  try {
    await sequelize.authenticate();

    console.log("TiDB conectado com sucesso!");

    app.listen(PORT, () => {
      console.log(`IW Connect API na porta ${PORT}`);
    });
  } catch (error) {
    console.error("Erro ao iniciar servidor:", error.message);
    process.exit(1);
  }
}

startServer();