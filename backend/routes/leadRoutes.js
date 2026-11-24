import { Router } from "express";
import * as leadController from "../controllers/leadController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { adminMiddleware } from "../middlewares/adminMiddleware.js";

const router = Router();

router.use(authMiddleware);

router.get("/", leadController.listar);

router.post("/import", adminMiddleware, leadController.importar);

router.post("/distribute", adminMiddleware, leadController.distribuir);

router.patch("/:id/status", leadController.alterarStatus);

router.get("/metadata", leadController.obterIndicadores);

router.delete("/bulk", leadController.removerEmMassa);
router.delete("/:id", leadController.remover);

router.get("/:id/history", leadController.listarHistorico);

router.post("/:id/observations", leadController.salvarObservacao);

export default router;
