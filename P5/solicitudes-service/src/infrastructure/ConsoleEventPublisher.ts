import { IEventPublisher } from "../domain/IEventPublisher";

/**
 * LSP: implementa el mismo contrato que HttpNotificacionesPublisher.
 * SolicitudService puede recibir cualquiera de las dos implementaciones
 * (por ejemplo, esta en pruebas locales o modo debug) sin que el
 * resultado observable de crear una solicitud cambie.
 */
export class ConsoleEventPublisher implements IEventPublisher {
  async publish(evento: string, payload: Record<string, unknown>): Promise<void> {
    console.log(`[evento] ${evento}`, payload);
  }
}
