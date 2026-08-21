import { Pool } from "pg";

export const pool = new Pool({
  host: process.env.DB_HOST || "postgres-db",
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || "sa_user",
  password: process.env.DB_PASSWORD || "sa_password",
  database: process.env.DB_NAME || "solicitudesdb",
});
