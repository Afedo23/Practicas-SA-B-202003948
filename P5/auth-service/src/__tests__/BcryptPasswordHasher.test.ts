import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { BcryptPasswordHasher } from "../infrastructure/BcryptPasswordHasher";

test("BcryptPasswordHasher: compara correctamente password correcto e incorrecto", async () => {
  const hasher = new BcryptPasswordHasher();
  const hash = bcrypt.hashSync("clave-correcta", 10);

  const ok = await hasher.compare("clave-correcta", hash);
  assert.equal(ok, true);

  const fail = await hasher.compare("clave-incorrecta", hash);
  assert.equal(fail, false);
});
