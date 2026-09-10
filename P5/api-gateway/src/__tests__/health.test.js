const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const app = require("../index");

test("GET /health responde 200 con status ok", async () => {
  const res = await request(app).get("/health");
  assert.equal(res.status, 200);
  assert.equal(res.body.status, "ok");
  assert.equal(res.body.service, "api-gateway");
});
