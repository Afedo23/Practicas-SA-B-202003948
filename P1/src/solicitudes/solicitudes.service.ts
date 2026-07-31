import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateSolicitudDto } from './dto/create-solicitud.dto';
import { UpdateEstadoDto } from './dto/update-estado.dto';
import { SolicitudOperativa } from './entities/solicitud-operativa.entity';
import type { ISolicitudRepository } from './interfaces/solicitud-repository.interface';
import { SOLICITUD_REPOSITORY } from './interfaces/solicitud-repository.interface';

// Orquesta los casos de uso del dominio "solicitudes operativas".
// Depende únicamente de la abstracción ISolicitudRepository (Dependency
// Inversion Principle): no sabe si los datos vienen de PostgreSQL, de
// memoria en pruebas, o de cualquier otra fuente futura.
@Injectable()
export class SolicitudesService {
  constructor(
    @Inject(SOLICITUD_REPOSITORY)
    private readonly repository: ISolicitudRepository,
  ) {}

  findAll(): Promise<SolicitudOperativa[]> {
    return this.repository.findAll();
  }

  create(dto: CreateSolicitudDto): Promise<SolicitudOperativa> {
    return this.repository.create(dto);
  }

  async update(
    id: number,
    dto: CreateSolicitudDto,
  ): Promise<SolicitudOperativa> {
    await this.assertExists(id);
    return this.repository.update(id, dto);
  }

  async updateEstado(
    id: number,
    dto: UpdateEstadoDto,
  ): Promise<SolicitudOperativa> {
    await this.assertExists(id);
    // Solo se envía el campo "estado" al repositorio: el resto de
    // atributos de la solicitud queda intacto, tal como pide el enunciado.
    return this.repository.update(id, { estado: dto.estado });
  }

  async remove(id: number): Promise<void> {
    await this.assertExists(id);
    await this.repository.delete(id);
  }

  private async assertExists(id: number): Promise<void> {
    const existente = await this.repository.findById(id);
    if (!existente) {
      throw new NotFoundException(
        `No existe una solicitud operativa con id ${id}`,
      );
    }
  }
}
