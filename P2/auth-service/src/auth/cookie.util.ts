import { Response } from 'express';
import { AppConfigService } from '../config/app-config.service';

export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';

// Convierte strings tipo "15m", "7d", "3600" a milisegundos.
export function ttlToMs(ttl: string): number {
  const match = /^(\d+)(ms|s|m|h|d)?$/.exec(ttl.trim());
  if (!match) return Number(ttl) * 1000 || 15 * 60 * 1000;
  const value = Number(match[1]);
  const unit = match[2] ?? 's';
  const multipliers: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return value * multipliers[unit];
}

export function setAuthCookies(
  res: Response,
  config: AppConfigService,
  tokens: { accessToken: string; refreshToken?: string },
) {
  const baseOptions = {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: 'lax' as const,
    path: '/',
  };

  res.cookie(ACCESS_COOKIE, tokens.accessToken, {
    ...baseOptions,
    maxAge: ttlToMs(config.jwtAccessTtl),
  });

  if (tokens.refreshToken) {
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
      ...baseOptions,
      maxAge: ttlToMs(config.jwtRefreshTtl),
    });
  }
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE, { path: '/' });
  res.clearCookie(REFRESH_COOKIE, { path: '/' });
}
