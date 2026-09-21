// Prueba de carga del api-gateway (Practica 8).
// Ejecucion:  k6 run -e BASE_URL=http://<host>:8080 P8/tests/k6/k6-load.js
// Si algun umbral se incumple, k6 termina con codigo != 0 (apto para pipelines).
import http from "k6/http";
import { check, sleep, fail } from "k6";

export const options = {
  stages: [
    { duration: "20s", target: 10 }, // subida
    { duration: "40s", target: 10 }, // carga sostenida
    { duration: "10s", target: 0 },  // bajada
  ],
  thresholds: {
    http_req_failed: ["rate<0.01"],    // menos de 1 % de errores
    http_req_duration: ["p(95)<500"],  // p95 de latencia bajo 500 ms
    checks: ["rate>0.99"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:8080";

// Comprobacion previa: si el servicio no responde, se aborta de inmediato con un mensaje claro
// (en vez de generar decenas de segundos de errores).
export function setup() {
  const res = http.get(`${BASE_URL}/health`);
  if (res.status !== 200) {
    fail(`El api-gateway no responde en ${BASE_URL}/health (status ${res.status}). Revise la URL o el port-forward.`);
  }
}

export default function () {
  const res = http.get(`${BASE_URL}/health`);
  check(res, {
    "status 200": (r) => r.status === 200,
    "cuerpo ok": (r) => typeof r.body === "string" && r.body.indexOf('"status":"ok"') !== -1,
  });
  sleep(1);
}