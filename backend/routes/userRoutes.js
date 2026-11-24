import { Router } from "express";
import * as userController from "../controllers/userController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { adminMiddleware } from "../middlewares/adminMiddleware.js";

const router = Router();

router.use(authMiddleware);
router.use(adminMiddleware);

router.get("/", userController.listar);
router.post("/", userController.criar);
router.patch("/:id", userController.editar);
router.patch("/:id/password", userController.redefinirSenha);
router.delete("/:id", userController.remover);

export default router;