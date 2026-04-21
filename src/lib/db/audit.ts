import { dbAdmin } from "./index";
import { auditLog } from "./schema";

interface AuditParams {
  userId?: string;
  acao: string;
  entidade: string;
  entidadeId?: string;
  dadosAntes?: unknown;
  dadosDepois?: unknown;
  ip?: string;
  userAgent?: string;
}

export async function insertAuditLog(params: AuditParams) {
  await dbAdmin.insert(auditLog).values({
    userId: params.userId,
    acao: params.acao,
    entidade: params.entidade,
    entidadeId: params.entidadeId,
    dadosAntes: params.dadosAntes as Record<string, unknown> | null,
    dadosDepois: params.dadosDepois as Record<string, unknown> | null,
    ip: params.ip,
    userAgent: params.userAgent,
  });
}
