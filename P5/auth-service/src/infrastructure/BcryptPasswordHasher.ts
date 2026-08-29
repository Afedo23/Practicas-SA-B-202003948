import bcrypt from "bcryptjs";
import { IPasswordHasher } from "../domain/IPasswordHasher";

export class BcryptPasswordHasher implements IPasswordHasher {
  async compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
