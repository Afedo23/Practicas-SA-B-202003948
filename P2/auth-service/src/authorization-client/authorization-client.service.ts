import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { AppConfigService } from '../config/app-config.service';

export interface AuthorizationResult {
  allowed: boolean;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Cliente del microservicio de autorización (Requerimiento 9).
 * El servicio de autorización es un proceso independiente que recibe el token
 * y la ruta/permiso a validar, y responde si el acceso está permitido.
 * Ante fallas temporales o timeouts se reintenta con backoff exponencial,
 * hasta un número máximo de intentos configurable; si todos fallan, se deniega
 * el acceso por error de comunicación (fail-closed).
 */
@Injectable()
export class AuthorizationClientService {
  private readonly logger = new Logger(AuthorizationClientService.name);

  constructor(
    private readonly http: HttpService,
    private readonly config: AppConfigService,
  ) {}

  async checkAccess(token: string, route: string): Promise<boolean> {
    const maxAttempts = this.config.authorizationRetryMaxAttempts;
    const baseDelay = this.config.authorizationRetryBaseDelayMs;
    const timeout = this.config.authorizationRetryTimeoutMs;

    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await firstValueFrom(
          this.http.post<AuthorizationResult>(
            `${this.config.authorizationServiceUrl}/authorize`,
            { token, route },
            { timeout },
          ),
        );
        return response.data.allowed;
      } catch (err) {
        lastError = err;
        const status = (err as AxiosError)?.response?.status;
        // Si el microservicio respondió explícitamente (p.ej. 401/403 por token/permiso
        // inválido) no es una falla de comunicación: no reintentar, denegar directamente.
        if (status !== undefined) {
          this.logger.warn(
            `Authorization service denegó el acceso (status ${status}) en el intento ${attempt}`,
          );
          return false;
        }

        const isLastAttempt = attempt === maxAttempts;
        this.logger.warn(
          `Fallo de comunicación con authorization-service (intento ${attempt}/${maxAttempts}): ${
            (err as Error).message
          }`,
        );
        if (!isLastAttempt) {
          const delay = baseDelay * 2 ** (attempt - 1);
          await sleep(delay);
        }
      }
    }

    this.logger.error(
      `Se agotaron los ${maxAttempts} reintentos contra authorization-service, se deniega el acceso`,
    );
    throw new ServiceUnavailableException(
      'No fue posible validar la autorización en este momento',
      { cause: lastError as Error },
    );
  }
}
