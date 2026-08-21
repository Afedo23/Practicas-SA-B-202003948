import axios from "axios";
import { IEventPublisher } from "../domain/IEventPublisher";

const NOTIFICACIONES_URL =
  process.env.NOTIFICACIONES_URL || "http://notificaciones-service:4004";

export class HttpNotificacionesPublisher implements IEventPublisher {
  async publish(evento: string, payload: Record<string, unknown>): Promise<void> {
    try {
      await axios.post(`${NOTIFICACIONES_URL}/notificaciones`, { evento, payload });
    } catch (err) {
      // Un fallo al notificar no debe romper la creación de la solicitud.
      console.warn("No se pudo publicar la notificación:", (err as Error).message);
    }
  }
}
