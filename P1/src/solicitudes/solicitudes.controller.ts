import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SolicitudesService } from './solicitudes.service';
import { CreateSolicitudDto } from './dto/create-solicitud.dto';
import { UpdateEstadoDto } from './dto/update-estado.dto';

// Única responsabilidad: traducir peticiones HTTP a llamadas del service
// y devolver la respuesta. No contiene lógica de negocio ni de acceso a
// datos (Single Responsibility Principle).
// ParseIntPipe rechaza automáticamente ids que no sean enteros antes de que
// lleguen a la base de datos (defensa adicional además de la validación
// de los DTO).
@Controller('solicitudes')
export class SolicitudesController {
  constructor(private readonly service: SolicitudesService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  create(@Body() dto: CreateSolicitudDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateSolicitudDto,
  ) {
    return this.service.update(id, dto);
  }

  @Patch(':id/estado')
  updateEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEstadoDto,
  ) {
    return this.service.updateEstado(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
  }
}
