import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SolicitudOperativa } from './entities/solicitud-operativa.entity';
import {
  CreateSolicitudData,
  ISolicitudRepository,
} from './interfaces/solicitud-repository.interface';

// Única responsabilidad de esta clase: hablar con la base de datos.
// No valida reglas de negocio ni conoce nada de HTTP; solo traduce
// llamadas del dominio a operaciones de TypeORM.
// TypeORM parametriza las consultas internamente, por lo que estos
// métodos ya están protegidos contra inyección SQL siempre que no se
// construyan queries con concatenación de strings (algo que aquí se evita).
@Injectable()
export class TypeOrmSolicitudRepository implements ISolicitudRepository {
  constructor(
    @InjectRepository(SolicitudOperativa)
    private readonly repo: Repository<SolicitudOperativa>,
  ) {}

  findAll(): Promise<SolicitudOperativa[]> {
    return this.repo.find();
  }

  findById(id: number): Promise<SolicitudOperativa | null> {
    return this.repo.findOneBy({ id });
  }

  async create(data: CreateSolicitudData): Promise<SolicitudOperativa> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  async update(
    id: number,
    data: Partial<SolicitudOperativa>,
  ): Promise<SolicitudOperativa> {
    await this.repo.update(id, data);
    // findOneByOrFail es seguro aquí porque el service ya validó
    // previamente que el registro existe antes de llamar a update().
    return this.repo.findOneByOrFail({ id });
  }

  async delete(id: number): Promise<void> {
    await this.repo.delete(id);
  }
}
