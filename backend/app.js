import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { sequelize } from "./models/index.js";

const app = express();

app.disable("x-powered-by");

app.use(helmet());
app.use(express.json());
app.use(cookieParser());

app.get("/api/health", async (req, res) => {
  try {
    await sequelize.authenticate();

    return res.json({
      ok: true,
      message: "IW Connect API online",
      database: "connected",
    });
  } catch {
    return res.status(503).json({
      ok: false,
      database: "disconnected",
    });
  }
});

export default app;