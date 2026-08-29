// Practica 5 - Software Avanzado
// Cronjob 2: se ejecuta cada 10 minutos (definido en el CronJob de k8s).
// 1) Consulta los registros generados por el Cronjob 1 en auditoriadb.
// 2) Calcula un resumen: cantidad de ejecuciones por hora (ultimas 24h).
// 3) Publica ese resumen como mensaje DURABLE en el broker (RabbitMQ).
//    Este es el flujo de negocio asincrono: este script publica y retorna
//    de inmediato; el consumidor (notificaciones-service) lo procesa y
//    confirma (ack) por separado, de forma independiente.
const { Client } = require("pg");
const amqp = require("amqplib");

const QUEUE_NAME = "cronjobs.resumen";

async function main() {
  const carne = process.env.CARNE;
  if (!carne) throw new Error("CARNE no definido");

  const pg = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "auditoriadb",
  });
  await pg.connect();

  let resumen;
  try {
    const { rows } = await pg.query(
      `SELECT date_trunc('hour', fecha_hora) AS hora_bucket, COUNT(*) AS cantidad
       FROM cronjob_ejecuciones
       WHERE carne = $1 AND fecha_hora >= NOW() - INTERVAL '24 hours'
       GROUP BY hora_bucket
       ORDER BY hora_bucket`,
      [carne]
    );
    resumen = rows;
  } finally {
    await pg.end();
  }

  if (resumen.length === 0) {
    console.log("[cronjob2] no hay ejecuciones registradas todavia, nada que publicar.");
    return;
  }

  const url = `amqp://${process.env.BROKER_USER}:${process.env.BROKER_PASSWORD}@${process.env.BROKER_HOST}:${process.env.BROKER_PORT || 5672}`;
  const conn = await amqp.connect(url);
  const channel = await conn.createChannel();
  // Cola durable: sobrevive a un reinicio del broker. Los mensajes se marcan
  // persistent:true para que tampoco se pierdan si el broker se reinicia.
  await channel.assertQueue(QUEUE_NAME, { durable: true });

  for (const fila of resumen) {
    const mensaje = {
      hora_bucket: fila.hora_bucket,
      cantidad_ejecuciones: Number(fila.cantidad),
      carne,
      publicado_en: new Date().toISOString(),
    };
    channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(mensaje)), {
      persistent: true,
      contentType: "application/json",
    });
    console.log(`[cronjob2] publicado resumen para ${fila.hora_bucket}: ${fila.cantidad} ejecuciones`);
  }

  await channel.close();
  await conn.close();
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[cronjob2] error:", err);
    process.exit(1);
  });
