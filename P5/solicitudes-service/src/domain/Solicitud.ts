export type Prioridad = "baja" | "media" | "alta" | "critica";
export type EstadoSolicitud = "creada" | "en_revision" | "aprobada" | "rechazada";

export interface Solicitud {
  id: number;
  titulo: string;
  areaSolicitante: string;
  prioridad: Prioridad;
  costoEstimado: number;
  estado: EstadoSolicitud;
  creadaPor: string;
}

export type NuevaSolicitud = Omit<Solicitud, "id" | "estado">;
