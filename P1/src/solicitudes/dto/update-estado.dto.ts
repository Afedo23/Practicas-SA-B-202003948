import { IsEnum } from 'class-validator';
import { EstadoSolicitud } from '../entities/solicitud-operativa.entity';

// DTO independiente para el endpoint de cambio de estado.
// Existe como su propia clase (y no como PartialType del DTO completo)
// para que sea imposible enviar accidentalmente otros campos: solo
// "estado" es aceptado, cumpliendo el requisito 3.2 del enunciado
// ("Actualizar exclusivamente el estado... sin modificar el resto").
export class UpdateEstadoDto {
  @IsEnum(EstadoSolicitud)
  estado: EstadoSolicitud;
}
