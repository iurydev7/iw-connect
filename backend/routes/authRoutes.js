import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import {
  login,
  me,
  logout
} from "../controllers/authController.js";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Muitas tentativas. Tente novamente mais tarde.",
  },
});

router.post("/login", loginLimiter, login);
router.get("/me", authMiddleware, me);
router.post("/logout", logout);

export default router;