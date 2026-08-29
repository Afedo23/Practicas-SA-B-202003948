import { Router } from "express";
import { AuthService } from "../application/AuthService";

export function buildAuthRoutes(authService: AuthService): Router {
  const router = Router();

  router.post("/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "username y password son requeridos" });
    }
    const result = await authService.login(username, password);
    if (!result) return res.status(401).json({ error: "Credenciales inválidas" });
    res.json(result);
  });

  router.get("/me", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Token no provisto" });
    const token = authHeader.replace("Bearer ", "");
    const payload = authService.verifyToken(token);
    if (!payload) return res.status(401).json({ error: "Token inválido o expirado" });
    const user = await authService.me(payload.id);
    res.json(user);
  });

  router.get("/health", (_req, res) => res.json({ status: "ok", service: "auth-service" }));

  return router;
}
