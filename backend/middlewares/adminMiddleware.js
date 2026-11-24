export function adminMiddleware(req, res, next) {
  if (!["admin", "master"].includes(req.user?.role)) {
    return res.status(403).json({
      message: "Acesso exclusivo para administradores.",
    });
  }

  next();
}