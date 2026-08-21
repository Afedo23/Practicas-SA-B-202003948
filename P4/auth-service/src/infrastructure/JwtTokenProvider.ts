import jwt from "jsonwebtoken";
import { ITokenProvider } from "../domain/ITokenProvider";
import { User } from "../domain/User";

const SECRET = process.env.JWT_SECRET || "practica4-secreto-dev";

export class JwtTokenProvider implements ITokenProvider {
  sign(user: User): string {
    return jwt.sign({ id: user.id, username: user.username, rol: user.rol }, SECRET, {
      expiresIn: "2h",
    });
  }

  verify(token: string) {
    try {
      return jwt.verify(token, SECRET) as { id: number; username: string; rol: string };
    } catch {
      return null;
    }
  }
}
