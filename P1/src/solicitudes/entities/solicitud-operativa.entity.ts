import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

/**
 * Estados válidos de una solicitud operativa.
 * Se usa un enum (en vez de un string libre) para que el principio
 * Open/Closed sea explícito: agregar un nuevo estado significa
 * extender este enum, no modificar la lógica de negocio existente.
 */
export enum EstadoSolicitud {
  REGISTRADA = 'registrada',
  EN_PROCESO = 'en_proceso',
  FINALIZADA = 'finalizada',
}

// Modelo de persistencia de una solicitud operativa (academia ficticia)
@Entity('solicitudes_operativas')
export class SolicitudOperativa {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 150 })
  titulo: string;

  @Column({ type: 'varchar', length: 100 })
  area_solicitante: string;

  @Column({ type: 'int' })
  prioridad: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  costo_estimado: number;

  @Column({
    type: 'enum',
    enum: EstadoSolicitud,
    default: EstadoSolicitud.REGISTRADA,
  })
  estado: EstadoSolicitud;
}
