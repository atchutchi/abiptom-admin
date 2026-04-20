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
  pgSequence,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ───────────────────────────────────────────────────────────────────

export const roleEnum = pgEnum("user_role", ["ca", "dg", "coord", "staff"]);

export const invoiceTypeEnum = pgEnum("invoice_type", [
  "proforma",
  "definitiva",
]);

export const invoiceStateEnum = pgEnum("invoice_state", [
  "rascunho",
  "proforma",
  "definitiva",
  "paga_parcial",
  "paga",
  "anulada",
]);

export const currencyEnum = pgEnum("currency", ["XOF", "EUR", "USD"]);

export const periodicidadeEnum = pgEnum("periodicidade", [
  "unica",
  "mensal",
  "anual",
  "bienal",
]);

// ─── Sequences ───────────────────────────────────────────────────────────────

export const invoiceNumberSeq = pgSequence("invoice_number_seq", {
  startWith: 254,
  increment: 1,
  minValue: 1,
});

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

// ─── clients ─────────────────────────────────────────────────────────────────

export const clients = pgTable("clients", {
  id: uuid("id").defaultRandom().primaryKey(),
  nome: text("nome").notNull(),
  nif: varchar("nif", { length: 50 }),
  endereco: text("endereco"),
  contacto: varchar("contacto", { length: 50 }),
  email: varchar("email", { length: 255 }),
  pais: varchar("pais", { length: 100 }).default("Guiné-Bissau"),
  notas: text("notas"),
  activo: boolean("activo").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── contacts ────────────────────────────────────────────────────────────────

export const contacts = pgTable("contacts", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  nome: text("nome").notNull(),
  cargo: varchar("cargo", { length: 100 }),
  email: varchar("email", { length: 255 }),
  telefone: varchar("telefone", { length: 50 }),
  principal: boolean("principal").notNull().default(false),
});

// ─── services_catalog ────────────────────────────────────────────────────────

export const servicesCatalog = pgTable("services_catalog", {
  id: uuid("id").defaultRandom().primaryKey(),
  categoria: varchar("categoria", { length: 100 }).notNull(),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  unidade: varchar("unidade", { length: 50 }).default("serviço"),
  periodicidade: periodicidadeEnum("periodicidade").notNull().default("unica"),
  prazoEntrega: varchar("prazo_entrega", { length: 100 }),
  precoXof: numeric("preco_xof", { precision: 12, scale: 2 }),
  activo: boolean("activo").notNull().default(true),
});

// ─── invoices ────────────────────────────────────────────────────────────────

export const invoices = pgTable("invoices", {
  id: uuid("id").defaultRandom().primaryKey(),
  numero: integer("numero"),
  tipo: invoiceTypeEnum("tipo"),
  estado: invoiceStateEnum("estado").notNull().default("rascunho"),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "restrict" }),
  dataEmissao: date("data_emissao").notNull(),
  dataVencimento: date("data_vencimento"),
  moeda: currencyEnum("moeda").notNull().default("XOF"),
  taxaCambio: numeric("taxa_cambio", { precision: 10, scale: 6 }).default("1"),
  subtotal: numeric("subtotal", { precision: 14, scale: 2 }).notNull().default("0"),
  igvPercentagem: numeric("igv_percentagem", { precision: 5, scale: 2 }).default("0"),
  igvValor: numeric("igv_valor", { precision: 14, scale: 2 }).default("0"),
  total: numeric("total", { precision: 14, scale: 2 }).notNull().default("0"),
  formaPagamento: text("forma_pagamento"),
  contaBancaria: text("conta_bancaria").default(
    "Banque Atlantique GB — Conta nº 020080330007 — IBAN GW68 GW19 5010 0102 0080 3300 0706"
  ),
  observacoes: text("observacoes"),
  pdfUrl: text("pdf_url"),
  enviadaEm: timestamp("enviada_em", { withTimezone: true }),
  createdBy: uuid("created_by").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── invoice_items ────────────────────────────────────────────────────────────

export const invoiceItems = pgTable("invoice_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceId: uuid("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  ordem: integer("ordem").notNull().default(1),
  descricao: text("descricao").notNull(),
  unidade: varchar("unidade", { length: 50 }).default("serviço"),
  quantidade: numeric("quantidade", { precision: 10, scale: 3 }).notNull().default("1"),
  precoUnitario: numeric("preco_unitario", { precision: 14, scale: 2 }).notNull(),
  total: numeric("total", { precision: 14, scale: 2 }).notNull(),
});

// ─── invoice_payments ─────────────────────────────────────────────────────────

export const invoicePayments = pgTable("invoice_payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceId: uuid("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  data: date("data").notNull(),
  valor: numeric("valor", { precision: 14, scale: 2 }).notNull(),
  moeda: currencyEnum("moeda").notNull(),
  taxaCambio: numeric("taxa_cambio", { precision: 10, scale: 6 }).default("1"),
  referencia: varchar("referencia", { length: 200 }),
  metodo: varchar("metodo", { length: 100 }),
  comproativoUrl: text("comprovativo_url"),
  notas: text("notas"),
  registadoPor: uuid("registado_por").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
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
  invoicesCreated: many(invoices),
}));

export const partnerSharesRelations = relations(partnerShares, ({ one }) => ({
  user: one(users, { fields: [partnerShares.userId], references: [users.id] }),
}));

export const clientsRelations = relations(clients, ({ many }) => ({
  contacts: many(contacts),
  invoices: many(invoices),
}));

export const contactsRelations = relations(contacts, ({ one }) => ({
  client: one(clients, {
    fields: [contacts.clientId],
    references: [clients.id],
  }),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  client: one(clients, {
    fields: [invoices.clientId],
    references: [clients.id],
  }),
  createdBy: one(users, {
    fields: [invoices.createdBy],
    references: [users.id],
  }),
  items: many(invoiceItems),
  payments: many(invoicePayments),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
}));

export const invoicePaymentsRelations = relations(
  invoicePayments,
  ({ one }) => ({
    invoice: one(invoices, {
      fields: [invoicePayments.invoiceId],
      references: [invoices.id],
    }),
    registadoPor: one(users, {
      fields: [invoicePayments.registadoPor],
      references: [users.id],
    }),
  })
);

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  user: one(users, { fields: [auditLog.userId], references: [users.id] }),
}));

// ─── Types ────────────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type PartnerShare = typeof partnerShares.$inferSelect;
export type NewPartnerShare = typeof partnerShares.$inferInsert;
export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
export type ServiceCatalog = typeof servicesCatalog.$inferSelect;
export type NewServiceCatalog = typeof servicesCatalog.$inferInsert;
export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type NewInvoiceItem = typeof invoiceItems.$inferInsert;
export type InvoicePayment = typeof invoicePayments.$inferSelect;
export type NewInvoicePayment = typeof invoicePayments.$inferInsert;
export type AuditLog = typeof auditLog.$inferSelect;
export type NewAuditLog = typeof auditLog.$inferInsert;
export type UserRole = (typeof roleEnum.enumValues)[number];
export type InvoiceState = (typeof invoiceStateEnum.enumValues)[number];
export type InvoiceType = (typeof invoiceTypeEnum.enumValues)[number];
export type Currency = (typeof currencyEnum.enumValues)[number];
