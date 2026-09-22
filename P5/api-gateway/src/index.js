const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();

const AUTH_URL = process.env.AUTH_SERVICE_URL || "http://auth-service:4001";
const SOLICITUDES_URL = process.env.SOLICITUDES_SERVICE_URL || "http://solicitudes-service:4002";
const APROBACIONES_URL = process.env.APROBACIONES_SERVICE_URL || "http://aprobaciones-service:4003";
const NOTIFICACIONES_URL = process.env.NOTIFICACIONES_SERVICE_URL || "http://notificaciones-service:4004";

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "api-gateway" });
});

// --- Auth service (REST + GraphQL) ---
app.use(
  "/api/auth",
  createProxyMiddleware({ target: AUTH_URL, changeOrigin: true, pathRewrite: { "^/api/auth": "" } })
);
app.use(
  "/graphql/auth",
  createProxyMiddleware({
    target: AUTH_URL,
    changeOrigin: true,
    // Express ya recorta "/graphql/auth" del req.url antes de llegar aquí,
    // así que el pathRewrite basado en regex nunca coincide. Como este
    // proxy siempre apunta al mismo endpoint único, forzamos el destino.
    pathRewrite: () => "/graphql",
  })
);

// --- Solicitudes service (REST + GraphQL) ---
app.use(
  "/api/solicitudes",
  createProxyMiddleware({
    target: SOLICITUDES_URL,
    changeOrigin: true,
    pathRewrite: { "^/api/solicitudes": "/solicitudes" },
  })
);
app.use(
  "/graphql/solicitudes",
  createProxyMiddleware({
    target: SOLICITUDES_URL,
    changeOrigin: true,
    // Mismo motivo que /graphql/auth: el req.url ya llega recortado.
    pathRewrite: () => "/graphql",
  })
);

// --- Aprobaciones service (REST) ---
app.use(
  "/api/aprobaciones",
  createProxyMiddleware({
    target: APROBACIONES_URL,
    changeOrigin: true,
    // aprobaciones-service expone sus rutas SIN prefijo (ej. /{id}/iniciar,
    // no /aprobaciones/{id}/iniciar), así que hay que recortar el prefijo
    // por completo, no reescribirlo a "/aprobaciones".
    pathRewrite: { "^/api/aprobaciones": "" },
  })
);

// --- Notificaciones service (REST) ---
app.use(
  "/api/notificaciones",
  createProxyMiddleware({
    target: NOTIFICACIONES_URL,
    changeOrigin: true,
    pathRewrite: { "^/api/notificaciones": "/notificaciones" },
  })
);

// Solo levanta el servidor si el archivo se ejecuta directamente
// (node src/index.js). Cuando se hace require("./index.js") desde un
// test, exportamos "app" sin abrir el puerto, para poder probar las
// rutas con supertest sin necesidad de un servidor real.
if (require.main === module) {
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    console.log(`api-gateway escuchando en puerto ${PORT}`);
    console.log(`Rutas: /api/auth, /api/solicitudes, /api/aprobaciones, /api/notificaciones`);
    console.log(`GraphQL: /graphql/auth, /graphql/solicitudes`);
  });
}

module.exports = app;