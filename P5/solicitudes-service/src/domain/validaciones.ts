import { NuevaSolicitud, Prioridad } from "./Solicitud";

const PRIORIDADES_VALIDAS: Prioridad[] = ["baja", "media", "alta", "critica"];

/**
 * Valida los campos de una nueva solicitud antes de persistirla.
 * Funcion pura (sin efectos secundarios) para poder probarla de forma
 * aislada, sin necesidad de una base de datos.
 */
export function esPrioridadValida(prioridad: string): prioridad is Prioridad {
  return PRIORIDADES_VALIDAS.includes(prioridad as Prioridad);
}

export function validarNuevaSolicitud(datos: NuevaSolicitud): string[] {
  const errores: string[] = [];

  if (!datos.titulo || datos.titulo.trim().length === 0) {
    errores.push("El titulo es obligatorio");
  }
  if (!datos.areaSolicitante || datos.areaSolicitante.trim().length === 0) {
    errores.push("El area solicitante es obligatoria");
  }
  if (!esPrioridadValida(datos.prioridad)) {
    errores.push(`Prioridad invalida: ${datos.prioridad}`);
  }
  if (typeof datos.costoEstimado !== "number" || datos.costoEstimado < 0) {
    errores.push("El costo estimado debe ser un numero mayor o igual a 0");
  }

  return errores;
}
