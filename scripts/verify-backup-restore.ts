import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import postgres from "postgres";
import {
  assertSafeRestoreFile,
  assertSafeRestoreTarget,
  redactDatabaseUrl,
} from "../src/lib/backup/restore-safety";

const execFileAsync = promisify(execFile);
const ESSENTIAL_TABLES = [
  "users",
  "clients",
  "projects",
  "invoices",
  "expenses",
  "salary_periods",
  "audit_log",
] as const;

function printHelp(): void {
  console.log(`Uso:
  npm run backup:verify-restore -- --file C:\\backups\\abiptom-backup.sql

Variável obrigatória:
  BACKUP_RESTORE_DATABASE_URL  Base PostgreSQL isolada cujo nome contém restore, verify ou test.

O comando recusa DATABASE_URL e DATABASE_DIRECT_URL como destino.`);
}

function getFileArgument(args: string[]): string | null {
  const index = args.indexOf("--file");
  return index >= 0 ? args[index + 1] ?? null : null;
}

async function runRestore(filePath: string, restoreUrl: string): Promise<void> {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".sql") {
    await execFileAsync(
      "psql",
      ["--set", "ON_ERROR_STOP=on", "--file", filePath, restoreUrl],
      { maxBuffer: 1024 * 1024 * 32 },
    );
    return;
  }

  await execFileAsync(
    "pg_restore",
    [
      "--clean",
      "--if-exists",
      "--no-owner",
      "--no-privileges",
      "--dbname",
      restoreUrl,
      filePath,
    ],
    { maxBuffer: 1024 * 1024 * 32 },
  );
}

async function verifyTables(restoreUrl: string) {
  const sql = postgres(restoreUrl, {
    ssl: restoreUrl.includes("localhost") ? false : "require",
    max: 1,
    connect_timeout: 10,
  });

  try {
    const counts: Record<string, number> = {};
    for (const table of ESSENTIAL_TABLES) {
      const [registry] = await sql<{ table_name: string | null }[]>`
        select to_regclass(${`public.${table}`})::text as table_name
      `;
      if (!registry?.table_name) {
        throw new Error(`Tabela essencial em falta após restauro: ${table}`);
      }

      const [row] = await sql<{ total: number }[]>`
        select count(*)::int as total from ${sql(table)}
      `;
      counts[table] = row?.total ?? 0;
    }
    return counts;
  } finally {
    await sql.end();
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    return;
  }

  const restoreUrl = process.env.BACKUP_RESTORE_DATABASE_URL;
  assertSafeRestoreTarget({
    restoreUrl,
    runtimeUrl: process.env.DATABASE_URL,
    directUrl: process.env.DATABASE_DIRECT_URL,
  });

  const requestedFile = getFileArgument(args);
  if (!requestedFile) throw new Error("Indica o dump através de --file.");

  const filePath = path.resolve(requestedFile);
  const stats = await fs.stat(filePath);
  assertSafeRestoreFile(filePath, stats.size);

  await runRestore(filePath, restoreUrl!);
  const counts = await verifyTables(restoreUrl!);

  console.log(
    JSON.stringify(
      {
        ok: true,
        target: redactDatabaseUrl(restoreUrl!),
        dump: filePath,
        bytes: stats.size,
        tables: counts,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Falha desconhecida no restauro.",
  );
  process.exitCode = 1;
});
