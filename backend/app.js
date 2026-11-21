import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { sequelize } from "./models/index.js";
import authRoutes from "./routes/authRoutes.js";
import leadRoutes from "./routes/leadRoutes.js";
import userRoutes from "./routes/userRoutes.js";

const app = express();
app.get("/", (req, res) => {
  return res.redirect("/api/health");
});
app.get("/api/health", (req, res) => {
  return res.status(200).json({
    status: "ok",
    service: "IW Connect API",
  });
});

app.disable("x-powered-by");

app.use(helmet());
app.use(express.json());
app.use(cookieParser());
app.use("/api/auth", authRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/users", userRoutes);

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