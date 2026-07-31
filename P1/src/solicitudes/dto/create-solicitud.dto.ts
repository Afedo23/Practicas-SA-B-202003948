import {
  IsString,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsNumber,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';
import { EstadoSolicitud } from '../entities/solicitud-operativa.entity';

// Valida y sanea los datos de entrada al crear una solicitud operativa.
// La responsabilidad única de esta clase es garantizar que los datos
// que llegan del cliente cumplan el formato esperado antes de tocar
// cualquier lógica de negocio o la base de datos.
export class CreateSolicitudDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  titulo: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  area_solicitante: string;

  @IsInt()
  @Min(1)
  @Max(5)
  prioridad: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costo_estimado: number;

  @IsEnum(EstadoSolicitud)
  estado: EstadoSolicitud;
}
