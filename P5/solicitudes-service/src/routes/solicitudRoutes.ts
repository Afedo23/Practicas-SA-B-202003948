import { Router } from "express";
import { SolicitudService } from "../application/SolicitudService";

export function buildSolicitudRoutes(service: SolicitudService): Router {
  const router = Router();

  router.get("/health", (_req, res) => res.json({ status: "ok", service: "solicitudes-service" }));

  router.post("/solicitudes", async (req, res) => {
    const { titulo, areaSolicitante, prioridad, costoEstimado, creadaPor } = req.body;
    if (!titulo || !areaSolicitante || !prioridad || costoEstimado == null || !creadaPor) {
      return res.status(400).json({ error: "Faltan campos requeridos" });
    }
    const solicitud = await service.crear({ titulo, areaSolicitante, prioridad, costoEstimado, creadaPor });
    res.status(201).json(solicitud);
  });

  router.get("/solicitudes", async (_req, res) => {
    res.json(await service.listar());
  });

  router.get("/solicitudes/:id", async (req, res) => {
    const solicitud = await service.obtener(Number(req.params.id));
    if (!solicitud) return res.status(404).json({ error: "Solicitud no encontrada" });
    res.json(solicitud);
  });

  router.patch("/solicitudes/:id/estado", async (req, res) => {
    const { estado } = req.body;
    if (!estado) return res.status(400).json({ error: "estado es requerido" });
    const solicitud = await service.cambiarEstado(Number(req.params.id), estado);
    if (!solicitud) return res.status(404).json({ error: "Solicitud no encontrada" });
    res.json(solicitud);
  });

  router.delete("/solicitudes/:id", async (req, res) => {
    const ok = await service.eliminar(Number(req.params.id));
    if (!ok) return res.status(404).json({ error: "Solicitud no encontrada" });
    res.status(204).send();
  });

  return router;
}
