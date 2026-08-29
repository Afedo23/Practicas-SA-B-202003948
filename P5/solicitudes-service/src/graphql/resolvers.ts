import { SolicitudService } from "../application/SolicitudService";

export function buildResolvers(service: SolicitudService) {
  return {
    Query: {
      solicitudes: () => service.listar(),
      solicitud: (_: unknown, { id }: { id: string }) => service.obtener(Number(id)),
    },
    Mutation: {
      crearSolicitud: (_: unknown, { input }: { input: any }) => service.crear(input),
      cambiarEstado: (_: unknown, { id, estado }: { id: string; estado: string }) =>
        service.cambiarEstado(Number(id), estado),
    },
  };
}
