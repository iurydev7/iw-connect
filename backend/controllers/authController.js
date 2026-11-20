import * as authService from "../services/authService.js";

export async function login(req, res) {
  try {
    const { email, password, remember } = req.body || {};

    const session = await authService.login(
      email,
      password,
      remember === true
    );

    if (!session) {
      return res.status(401).json({
        message: "E-mail ou senha inválidos.",
      });
    }

    res.cookie("iw_session", session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      ...(remember === true
        ? { maxAge: session.maxAge }
        : {}),
    });

    res.set("Cache-Control", "no-store");

    return res.status(200).json(session.user);

  } catch (error) {
    console.error("Erro no login:", error.name);

    return res.status(500).json({
      message: "Erro interno do servidor.",
    });
  }
}
export function me(req, res) {
  res.set("Cache-Control", "no-store");

  return res.status(200).json(req.user);
}