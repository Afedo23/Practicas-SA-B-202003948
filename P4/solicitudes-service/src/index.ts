import express from "express";
import cors from "cors";
import { ApolloServer } from "apollo-server-express";
import { PostgresSolicitudRepository } from "./infrastructure/PostgresSolicitudRepository";
import { HttpNotificacionesPublisher } from "./infrastructure/HttpNotificacionesPublisher";
import { SolicitudService } from "./application/SolicitudService";
import { buildSolicitudRoutes } from "./routes/solicitudRoutes";
import { typeDefs } from "./graphql/schema";
import { buildResolvers } from "./graphql/resolvers";

async function main() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const repository = new PostgresSolicitudRepository();
  // En este entorno se inyecta el publicador HTTP; para pruebas locales
  // bastaría con inyectar ConsoleEventPublisher en su lugar (LSP).
  const eventPublisher = new HttpNotificacionesPublisher();
  const service = new SolicitudService(repository, eventPublisher);

  app.use("/", buildSolicitudRoutes(service));

  const apollo = new ApolloServer({
    typeDefs,
    resolvers: buildResolvers(service),
  });
  await apollo.start();
  apollo.applyMiddleware({ app: app as any, path: "/graphql" });

  const PORT = process.env.PORT || 4002;
  app.listen(PORT, () => {
    console.log(`solicitudes-service escuchando en puerto ${PORT} (REST) y /graphql (GraphQL)`);
  });
}

main().catch((err) => {
  console.error("Error iniciando solicitudes-service:", err);
  process.exit(1);
});
