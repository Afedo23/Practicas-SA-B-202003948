/**
 * LSP: cualquier implementación de esta interfaz debe poder sustituir
 * a otra sin alterar el comportamiento esperado por SolicitudService:
 * recibir (evento, payload) y no lanzar excepciones que rompan el flujo
 * de creación de la solicitud. Tanto HttpNotificacionesPublisher como
 * ConsoleEventPublisher cumplen ese mismo contrato.
 */
export interface IEventPublisher {
  publish(evento: string, payload: Record<string, unknown>): Promise<void>;
}
