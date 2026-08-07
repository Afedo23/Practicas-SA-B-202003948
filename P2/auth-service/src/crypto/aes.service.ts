import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'crypto';
import { AppConfigService } from '../config/app-config.service';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // recomendado para GCM

/**
 * Cifra/descifra información sensible (nombre, correo) con AES-256-GCM.
 * El resultado almacenado tiene el formato: iv:authTag:ciphertext (todo en hex),
 * de modo que cada campo lleva su propio IV aleatorio.
 */
@Injectable()
export class AesService {
  private readonly key: Buffer;

  constructor(private readonly config: AppConfigService) {
    const rawKey = this.config.aesEncryptionKey;
    const keyBuffer = Buffer.from(rawKey, 'hex');
    if (keyBuffer.length !== 32) {
      throw new Error(
        'AES_ENCRYPTION_KEY debe ser una clave de 32 bytes en hexadecimal (64 caracteres) para AES-256-GCM',
      );
    }
    this.key = keyBuffer;
  }

  encrypt(plainText: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return [iv.toString('hex'), authTag.toString('hex'), ciphertext.toString('hex')].join(':');
  }

  decrypt(payload: string): string {
    const [ivHex, authTagHex, ciphertextHex] = payload.split(':');
    if (!ivHex || !authTagHex || !ciphertextHex) {
      throw new Error('Formato de dato cifrado inválido');
    }
    const decipher = createDecipheriv(ALGORITHM, this.key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(ciphertextHex, 'hex')),
      decipher.final(),
    ]);
    return plaintext.toString('utf8');
  }

  /**
   * HMAC-SHA256 determinístico (no reversible) usado solo como índice de búsqueda
   * por correo, ya que el correo cifrado con AES no se puede indexar/buscar directamente.
   */
  hashEmail(email: string): string {
    return createHmac('sha256', this.config.emailHashSecret)
      .update(email.trim().toLowerCase())
      .digest('hex');
  }
}
