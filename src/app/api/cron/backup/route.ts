import { promises as fs } from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return NextResponse.json({ error: "DATABASE_URL não configurado." }, { status: 500 });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `abiptom-backup-${timestamp}.sql`;
  const tmpPath = path.join("/tmp", filename);

  let dumpSql: string;
  try {
    const { stdout } = await execFileAsync(
      "pg_dump",
      ["--no-owner", "--no-privileges", databaseUrl],
      {
        maxBuffer: 1024 * 1024 * 256,
      }
    );
    dumpSql = stdout;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Erro desconhecido ao gerar backup";
    return NextResponse.json(
      {
        error:
          "Falha ao executar pg_dump. Verifica se a runtime tem o binário disponível.",
        detail: message,
      },
      { status: 500 }
    );
  }

  await fs.writeFile(tmpPath, dumpSql, "utf8");

  const buffer = await fs.readFile(tmpPath);
  const backupBucket = process.env.BACKUP_SUPABASE_BUCKET;

  if (!backupBucket) {
    return NextResponse.json({
      ok: true,
      warning:
        "Backup criado em memória local, mas BACKUP_SUPABASE_BUCKET não está configurado para upload remoto.",
      filename,
      bytes: buffer.byteLength,
    });
  }

  const supabase = createAdminClient();
  const storagePath = `db-backups/${filename}`;

  const { error: uploadError } = await supabase.storage
    .from(backupBucket)
    .upload(storagePath, buffer, {
      contentType: "application/sql",
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      {
        error: "Backup gerado mas falhou upload para Supabase Storage.",
        detail: uploadError.message,
        filename,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    filename,
    bytes: buffer.byteLength,
    bucket: backupBucket,
    path: storagePath,
  });
}
