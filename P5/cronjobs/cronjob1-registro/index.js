// Practica 5 - Software Avanzado
// Cronjob 1: se ejecuta cada 2 minutos (definido en el CronJob de k8s).
// Inserta en auditoriadb.cronjob_ejecuciones la fecha/hora de ejecucion
// (zona horaria GMT-6, America/Guatemala) y el numero de carne del estudiante.
const { Client } = require("pg");

async function main() {
  const carne = process.env.CARNE;
  if (!carne) {
    throw new Error("CARNE no definido (inyectado via ConfigMap sa-platform-cronjobs)");
  }

  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "auditoriadb",
  });

  await client.connect();
  try {
    // Guardamos siempre en UTC en la columna TIMESTAMPTZ; la conversion a
    // GMT-6 se hace al momento de leer/mostrar (AT TIME ZONE 'America/Guatemala').
    const nowUtc = new Date();
    const result = await client.query(
      "INSERT INTO cronjob_ejecuciones (fecha_hora, carne) VALUES ($1, $2) RETURNING id, fecha_hora AT TIME ZONE 'America/Guatemala' AS hora_local",
      [nowUtc.toISOString(), carne]
    );
    console.log(
      `[cronjob1] registro #${result.rows[0].id} insertado. Hora GMT-6: ${result.rows[0].hora_local}, carne: ${carne}`
    );
  } finally {
    await client.end();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[cronjob1] error:", err);
    process.exit(1);
  });
