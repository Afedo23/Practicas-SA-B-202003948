import { Solicitud, NuevaSolicitud } from "./Solicitud";

export interface ISolicitudRepository {
  create(data: NuevaSolicitud): Promise<Solicitud>;
  findAll(): Promise<Solicitud[]>;
  findById(id: number): Promise<Solicitud | null>;
  updateEstado(id: number, estado: string): Promise<Solicitud | null>;
  delete(id: number): Promise<boolean>;
}
