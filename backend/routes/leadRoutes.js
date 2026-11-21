import { Router } from "express";
import * as leadController from "../controllers/leadController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = Router();

router.use(authMiddleware);

router.get("/", leadController.listar);

router.post("/import", leadController.importar);

router.patch("/:id/claim", leadController.reservar);

router.patch("/:id/status", leadController.alterarStatus);

router.get("/metadata", leadController.obterIndicadores);

router.get("/:id/history", leadController.listarHistorico);

router.post("/:id/observations", leadController.salvarObservacao);

export default router;