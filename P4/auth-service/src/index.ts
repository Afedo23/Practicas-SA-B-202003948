import express from "express";
import cors from "cors";
import { ApolloServer } from "apollo-server-express";
import { PostgresUserRepository } from "./infrastructure/PostgresUserRepository";
import { BcryptPasswordHasher } from "./infrastructure/BcryptPasswordHasher";
import { JwtTokenProvider } from "./infrastructure/JwtTokenProvider";
import { AuthService } from "./application/AuthService";
import { buildAuthRoutes } from "./routes/authRoutes";
import { typeDefs } from "./graphql/schema";
import { buildResolvers } from "./graphql/resolvers";

async function main() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Composición de dependencias: se construyen las implementaciones
  // concretas y se inyectan al servicio de aplicación (DIP).
  const userRepository = new PostgresUserRepository();
  const passwordHasher = new BcryptPasswordHasher();
  const tokenProvider = new JwtTokenProvider();
  const authService = new AuthService(userRepository, passwordHasher, tokenProvider);

  app.use("/", buildAuthRoutes(authService));

  const apollo = new ApolloServer({
    typeDefs,
    resolvers: buildResolvers(authService),
  });
  await apollo.start();
  apollo.applyMiddleware({ app: app as any, path: "/graphql" });

  const PORT = process.env.PORT || 4001;
  app.listen(PORT, () => {
    console.log(`auth-service escuchando en puerto ${PORT} (REST) y /graphql (GraphQL)`);
  });
}

main().catch((err) => {
  console.error("Error iniciando auth-service:", err);
  process.exit(1);
});
