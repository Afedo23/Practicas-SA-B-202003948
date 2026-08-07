import 'dotenv/config';
import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { isRoleAllowed } from './permissions';

const app = express();
app.use(express.json());

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
if (!JWT_ACCESS_SECRET) {
  throw new Error('Falta la variable de entorno JWT_ACCESS_SECRET');
}

interface AccessTokenPayload {
  sub: string;
  role: string;
  type: string;
}

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Único endpoint del microservicio: recibe el token a validar y la ruta/permiso
// solicitado, y responde si el acceso está permitido o denegado.
app.post('/authorize', (req: Request, res: Response) => {
  const { token, route } = req.body ?? {};

  if (!token || !route) {
    return res.status(400).json({ allowed: false, reason: 'token y route son requeridos' });
  }

  let payload: AccessTokenPayload;
  try {
    payload = jwt.verify(token, JWT_ACCESS_SECRET as string) as AccessTokenPayload;
  } catch {
    return res.status(401).json({ allowed: false, reason: 'Token inválido o expirado' });
  }

  if (payload.type !== 'access') {
    return res.status(401).json({ allowed: false, reason: 'Tipo de token inválido' });
  }

  const allowed = isRoleAllowed(route, payload.role);
  return res.status(200).json({ allowed });
});

const PORT = Number(process.env.PORT ?? 4001);
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`authorization-service escuchando en http://localhost:${PORT}`);
});
