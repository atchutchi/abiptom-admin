import { readFileSync } from "node:fs";
import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local" });

const sql = readFileSync(
  "src/lib/db/migrations/0002_add_dividends.sql",
  "utf-8"
);

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  await client.query(sql);
  console.log("OK dividends migration applied");
} catch (err) {
  console.error("FAIL", err.message);
  process.exit(1);
} finally {
  await client.end();
}
