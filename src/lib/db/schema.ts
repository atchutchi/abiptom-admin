import {
  pgTable,
  uuid,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  jsonb,
  numeric,
  date,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ───────────────────────────────────────────────────────────────────

export const roleEnum = pgEnum("user_role", ["ca", "dg", "coord", "staff"]);

// ─── users ───────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  authUserId: uuid("auth_user_id").unique().notNull(),
  nomeCompleto: text("nome_completo").notNull(),
  nomeCurto: varchar("nome_curto", { length: 50 }).notNull(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  telefone: varchar("telefone", { length: 30 }),
  role: roleEnum("role").notNull().default("staff"),
  cargo: text("cargo"),
  salarioBaseMensal: numeric("salario_base_mensal", {
    precision: 12,
    scale: 2,
  }).default("0"),
  dataEntrada: date("data_entrada"),
  dataSaida: date("data_saida"),
  fotografiaUrl: text("fotografia_url"),
  activo: boolean("activo").notNull().default(true),
  mfaEnabled: boolean("mfa_enabled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── partner_shares ───────────────────────────────────────────────────────────

export const partnerShares = pgTable("partner_shares", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  percentagemQuota: numeric("percentagem_quota", {
    precision: 5,
    scale: 2,
  }).notNull(),
  dataInicio: date("data_inicio").notNull(),
  dataFim: date("data_fim"),
  notas: text("notas"),
});

// ─── audit_log ────────────────────────────────────────────────────────────────

export const auditLog = pgTable("audit_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  acao: varchar("acao", { length: 100 }).notNull(),
  entidade: varchar("entidade", { length: 100 }).notNull(),
  entidadeId: text("entidade_id"),
  dadosAntes: jsonb("dados_antes"),
  dadosDepois: jsonb("dados_depois"),
  ip: varchar("ip", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  partnerShares: many(partnerShares),
  auditLogs: many(auditLog),
}));

export const partnerSharesRelations = relations(partnerShares, ({ one }) => ({
  user: one(users, { fields: [partnerShares.userId], references: [users.id] }),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  user: one(users, { fields: [auditLog.userId], references: [users.id] }),
}));

// ─── Types ────────────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type PartnerShare = typeof partnerShares.$inferSelect;
export type NewPartnerShare = typeof partnerShares.$inferInsert;
export type AuditLog = typeof auditLog.$inferSelect;
export type NewAuditLog = typeof auditLog.$inferInsert;
export type UserRole = (typeof roleEnum.enumValues)[number];
