import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService) {}

  private require(key: string): string {
    const value = this.config.get<string>(key);
    if (!value) {
      throw new Error(`Falta la variable de entorno requerida: ${key}`);
    }
    return value;
  }

  get databaseUrl() {
    return this.require('DATABASE_URL');
  }

  get jwtAccessSecret() {
    return this.require('JWT_ACCESS_SECRET');
  }

  get jwtRefreshSecret() {
    return this.require('JWT_REFRESH_SECRET');
  }

  get jwtAccessTtl() {
    return this.config.get<string>('JWT_ACCESS_TTL', '15m');
  }

  get jwtRefreshTtl() {
    return this.config.get<string>('JWT_REFRESH_TTL', '7d');
  }

  /** Ventana de gracia (segundos) tras expirar el access token en la que aún se permite renovarlo. */
  get jwtRenewalGraceSeconds(): number {
    return Number(this.config.get<string>('JWT_RENEWAL_GRACE_SECONDS', '300'));
  }

  get aesEncryptionKey() {
    return this.require('AES_ENCRYPTION_KEY');
  }

  get emailHashSecret() {
    return this.require('EMAIL_HASH_SECRET');
  }

  get authorizationServiceUrl() {
    return this.config.get<string>('AUTHORIZATION_SERVICE_URL', 'http://localhost:4001');
  }

  get authorizationRetryMaxAttempts(): number {
    return Number(this.config.get<string>('AUTHORIZATION_RETRY_MAX_ATTEMPTS', '4'));
  }

  get authorizationRetryBaseDelayMs(): number {
    return Number(this.config.get<string>('AUTHORIZATION_RETRY_BASE_DELAY_MS', '200'));
  }

  get authorizationRetryTimeoutMs(): number {
    return Number(this.config.get<string>('AUTHORIZATION_RETRY_TIMEOUT_MS', '2000'));
  }

  get port(): number {
    return Number(this.config.get<string>('PORT', '3000'));
  }

  get frontendOrigin() {
    return this.config.get<string>('FRONTEND_ORIGIN', 'http://localhost:5173');
  }

  get cookieSecure(): boolean {
    return this.config.get<string>('COOKIE_SECURE', 'false') === 'true';
  }
}
