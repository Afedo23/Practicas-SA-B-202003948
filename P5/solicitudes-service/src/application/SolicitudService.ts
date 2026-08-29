import { ISolicitudRepository } from "../domain/ISolicitudRepository";
import { IEventPublisher } from "../domain/IEventPublisher";
import { NuevaSolicitud } from "../domain/Solicitud";

/**
 * DIP: depende de ISolicitudRepository e IEventPublisher (abstracciones),
 * nunca de PostgresSolicitudRepository ni de HttpNotificacionesPublisher
 * directamente. El punto de composición (index.ts) decide qué
 * implementación concreta inyectar.
 */
export class SolicitudService {
  constructor(
    private readonly repository: ISolicitudRepository,
    private readonly eventPublisher: IEventPublisher
  ) {}

  async crear(data: NuevaSolicitud) {
    const solicitud = await this.repository.create(data);
    await this.eventPublisher.publish("solicitud.creada", { id: solicitud.id, titulo: solicitud.titulo });
    return solicitud;
  }

  listar() {
    return this.repository.findAll();
  }

  obtener(id: number) {
    return this.repository.findById(id);
  }

  async cambiarEstado(id: number, estado: string) {
    const actualizada = await this.repository.updateEstado(id, estado);
    if (actualizada) {
      await this.eventPublisher.publish("solicitud.estado_cambiado", { id, estado });
    }
    return actualizada;
  }

  eliminar(id: number) {
    return this.repository.delete(id);
  }
}
