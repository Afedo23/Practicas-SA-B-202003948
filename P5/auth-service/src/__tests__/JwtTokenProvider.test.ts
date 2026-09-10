import test from "node:test";
import assert from "node:assert/strict";
import { JwtTokenProvider } from "../infrastructure/JwtTokenProvider";
import { User } from "../domain/User";

const usuario: User = {
  id: 1,
  username: "mgarcia",
  email: "mgarcia@example.com",
  passwordHash: "no-se-usa-en-este-test",
  rol: "maker",
};

test("JwtTokenProvider: firma y verifica correctamente un token valido", () => {
  const provider = new JwtTokenProvider();
  const token = provider.sign(usuario);

  assert.equal(typeof token, "string");
  assert.ok(token.length > 0);

  const payload = provider.verify(token);
  assert.ok(payload !== null);
  assert.equal(payload?.id, usuario.id);
  assert.equal(payload?.username, usuario.username);
  assert.equal(payload?.rol, usuario.rol);
});

test("JwtTokenProvider: rechaza un token invalido devolviendo null", () => {
  const provider = new JwtTokenProvider();
  const resultado = provider.verify("esto-no-es-un-jwt-valido");
  assert.equal(resultado, null);
});
