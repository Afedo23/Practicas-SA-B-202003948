import { ISolicitudRepository } from "../domain/ISolicitudRepository";
import { Solicitud, NuevaSolicitud } from "../domain/Solicitud";
import { pool } from "./db";

function mapRow(row: any): Solicitud {
  return {
    id: row.id,
    titulo: row.titulo,
    areaSolicitante: row.area_solicitante,
    prioridad: row.prioridad,
    costoEstimado: Number(row.costo_estimado),
    estado: row.estado,
    creadaPor: row.creada_por,
  };
}

/** SRP: únicamente traduce entre el modelo de dominio Solicitud y Postgres. */
export class PostgresSolicitudRepository implements ISolicitudRepository {
  async create(data: NuevaSolicitud): Promise<Solicitud> {
    const result = await pool.query(
      `INSERT INTO solicitudes (titulo, area_solicitante, prioridad, costo_estimado, creada_por)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [data.titulo, data.areaSolicitante, data.prioridad, data.costoEstimado, data.creadaPor]
    );
    return mapRow(result.rows[0]);
  }

  async findAll(): Promise<Solicitud[]> {
    const result = await pool.query("SELECT * FROM solicitudes ORDER BY id DESC");
    return result.rows.map(mapRow);
  }

  async findById(id: number): Promise<Solicitud | null> {
    const result = await pool.query("SELECT * FROM solicitudes WHERE id = $1", [id]);
    return result.rows.length ? mapRow(result.rows[0]) : null;
  }

  async updateEstado(id: number, estado: string): Promise<Solicitud | null> {
    const result = await pool.query(
      "UPDATE solicitudes SET estado = $1 WHERE id = $2 RETURNING *",
      [estado, id]
    );
    return result.rows.length ? mapRow(result.rows[0]) : null;
  }

  async delete(id: number): Promise<boolean> {
    const result = await pool.query("DELETE FROM solicitudes WHERE id = $1", [id]);
    return (result.rowCount ?? 0) > 0;
  }
}
