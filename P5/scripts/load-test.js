// Practica 5 - Software Avanzado
// Prueba de carga con k6 contra el API Gateway (unico punto de entrada).
// Uso:
//   k6 run --env BASE_URL=http://sa-platform.local scripts/load-test.js
//
// Concurrencia creciente por etapas para evidenciar el escalado del HPA
// (2 -> 5 replicas al superar 70% de CPU) y su posterior descenso al
// terminar la carga.
import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://sa-platform.local";

export const options = {
  scenarios: {
    carga_creciente: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: "1m", target: 10 },   // calentamiento
        { duration: "2m", target: 50 },   // deberia disparar el HPA
        { duration: "2m", target: 100 },  // sostiene la carga alta
        { duration: "1m", target: 0 },    // cese de carga -> HPA debe bajar replicas
      ],
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<1500"], // latencia p95 objetivo
    http_req_failed: ["rate<0.05"],    // tasa de error objetivo
  },
};

export default function () {
  // Login (auth-service via gateway) y listado de solicitudes
  // (solicitudes-service via gateway) son los endpoints mas representativos
  // del trafico real del sistema.
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ username: "mgarcia", password: "admin123" }),
    { headers: { "Content-Type": "application/json" } }
  );
  check(loginRes, { "login status 200": (r) => r.status === 200 });

  const listRes = http.get(`${BASE_URL}/api/solicitudes/solicitudes`);
  check(listRes, { "listado status 200": (r) => r.status === 200 });

  sleep(1);
}

// Reporte minimo requerido (RPS, latencia p95, % error): k6 lo imprime
// automaticamente al finalizar (http_reqs, http_req_duration p(95),
// http_req_failed). Guardar la salida completa como evidencia:
//   k6 run --env BASE_URL=... scripts/load-test.js | tee docs/evidencia-carga.txt
