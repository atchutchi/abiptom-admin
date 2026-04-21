import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";
import { getMigrationDatabaseUrl } from "./src/lib/db/config";

config({ path: ".env.local" });

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./src/lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: getMigrationDatabaseUrl(),
    ssl: true,
  },
  verbose: true,
  strict: true,
});
