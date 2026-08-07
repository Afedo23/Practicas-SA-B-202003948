import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '../role.enum';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  // Opcional: si se omite, el usuario se crea como CLIENTE.
  // En un sistema real, solo un Admin autenticado debería poder crear otros Admins;
  // aquí se deja abierto para poder sembrar el primer usuario Admin de pruebas.
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
