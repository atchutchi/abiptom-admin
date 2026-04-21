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

export const projectStateEnum = pgEnum("project_state", [
  "proposta",
  "activo",
  "pausado",
  "concluido",
  "cancelado",
]);

export const salaryPeriodStateEnum = pgEnum("salary_period_state", [
  "aberto",
  "calculado",
  "confirmado",
  "pago",
]);

export const projectRoleEnum = pgEnum("project_role", [
  "pf",
  "aux",
  "dg",
  "coord",
]);

export const expenseCategoryEnum = pgEnum("expense_category", [
  "aluguer",
  "servicos_publicos",
  "material_escritorio",
  "deslocacoes",
  "marketing",
  "formacao",
  "software_licencas",
  "manutencao",
  "impostos_taxas",
  "outros",
]);

export const expenseStateEnum = pgEnum("expense_state", [
  "rascunho",
  "aprovada",
  "paga",
  "anulada",
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

// ─── projects ────────────────────────────────────────────────────────────────

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "restrict" }),
  servicoId: uuid("servico_id").references(() => servicesCatalog.id, {
    onDelete: "set null",
  }),
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),
  dataInicio: date("data_inicio").notNull(),
  dataFimEstimada: date("data_fim_estimada"),
  estado: projectStateEnum("estado").notNull().default("proposta"),
  pontoFocalId: uuid("ponto_focal_id").references(() => users.id, {
    onDelete: "set null",
  }),
  valorPrevisto: numeric("valor_previsto", { precision: 14, scale: 2 }),
  moeda: currencyEnum("moeda").notNull().default("XOF"),
  notas: text("notas"),
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

// ─── project_assistants ───────────────────────────────────────────────────────

export const projectAssistants = pgTable("project_assistants", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  percentagemOverride: numeric("percentagem_override", {
    precision: 5,
    scale: 2,
  }),
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
  projectId: uuid("project_id").references(() => projects.id, {
    onDelete: "set null",
  }),
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

// ─── salary_policies ──────────────────────────────────────────────────────────

export const salaryPolicies = pgTable("salary_policies", {
  id: uuid("id").defaultRandom().primaryKey(),
  nome: varchar("nome", { length: 100 }).notNull(),
  versao: varchar("versao", { length: 20 }).notNull(),
  descricao: text("descricao"),
  dataInicio: date("data_inicio").notNull(),
  dataFim: date("data_fim"),
  activo: boolean("activo").notNull().default(true),
  configuracaoJson: jsonb("configuracao_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── salary_periods ───────────────────────────────────────────────────────────

export const salaryPeriods = pgTable("salary_periods", {
  id: uuid("id").defaultRandom().primaryKey(),
  ano: integer("ano").notNull(),
  mes: integer("mes").notNull(),
  policyId: uuid("policy_id")
    .notNull()
    .references(() => salaryPolicies.id, { onDelete: "restrict" }),
  estado: salaryPeriodStateEnum("estado").notNull().default("aberto"),
  totalBruto: numeric("total_bruto", { precision: 14, scale: 2 }).default("0"),
  totalLiquido: numeric("total_liquido", { precision: 14, scale: 2 }).default("0"),
  totalFolha: numeric("total_folha", { precision: 14, scale: 2 }).default("0"),
  criadoPor: uuid("criado_por").references(() => users.id, {
    onDelete: "set null",
  }),
  confirmadoEm: timestamp("confirmado_em", { withTimezone: true }),
  confirmadoPor: uuid("confirmado_por").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── salary_lines ─────────────────────────────────────────────────────────────

export const salaryLines = pgTable("salary_lines", {
  id: uuid("id").defaultRandom().primaryKey(),
  periodId: uuid("period_id")
    .notNull()
    .references(() => salaryPeriods.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  salarioBase: numeric("salario_base", { precision: 14, scale: 2 }).notNull().default("0"),
  componenteDinamica: jsonb("componente_dinamica").default("[]"),
  subsidios: jsonb("subsidios").default("{}"),
  outrosBeneficios: numeric("outros_beneficios", { precision: 14, scale: 2 }).default("0"),
  descontos: numeric("descontos", { precision: 14, scale: 2 }).default("0"),
  totalBruto: numeric("total_bruto", { precision: 14, scale: 2 }).notNull().default("0"),
  totalLiquido: numeric("total_liquido", { precision: 14, scale: 2 }).notNull().default("0"),
  pago: boolean("pago").notNull().default(false),
  dataPagamento: date("data_pagamento"),
  referenciaPagamento: varchar("referencia_pagamento", { length: 200 }),
  reciboUrl: text("recibo_url"),
  overrideMotivo: text("override_motivo"),
});

// ─── project_payments ─────────────────────────────────────────────────────────

export const projectPayments = pgTable("project_payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  periodId: uuid("period_id")
    .notNull()
    .references(() => salaryPeriods.id, { onDelete: "cascade" }),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "restrict" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  papel: projectRoleEnum("papel").notNull(),
  percentagemAplicada: numeric("percentagem_aplicada", { precision: 5, scale: 2 }).notNull(),
  valorLiquidoProjecto: numeric("valor_liquido_projecto", { precision: 14, scale: 2 }).notNull(),
  valorRecebido: numeric("valor_recebido", { precision: 14, scale: 2 }).notNull(),
});

// ─── expenses ─────────────────────────────────────────────────────────────────

export const expenses = pgTable("expenses", {
  id: uuid("id").defaultRandom().primaryKey(),
  data: date("data").notNull(),
  categoria: expenseCategoryEnum("categoria").notNull(),
  descricao: text("descricao").notNull(),
  fornecedor: text("fornecedor"),
  nifFornecedor: varchar("nif_fornecedor", { length: 50 }),
  valor: numeric("valor", { precision: 14, scale: 2 }).notNull(),
  moeda: currencyEnum("moeda").notNull().default("XOF"),
  taxaCambio: numeric("taxa_cambio", { precision: 10, scale: 6 }).default("1"),
  valorXof: numeric("valor_xof", { precision: 14, scale: 2 }).notNull(),
  metodoPagamento: varchar("metodo_pagamento", { length: 100 }),
  referencia: varchar("referencia", { length: 200 }),
  comprovativoUrl: text("comprovativo_url"),
  estado: expenseStateEnum("estado").notNull().default("rascunho"),
  dataPagamento: date("data_pagamento"),
  notas: text("notas"),
  criadoPor: uuid("criado_por").references(() => users.id, {
    onDelete: "set null",
  }),
  aprovadoPor: uuid("aprovado_por").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
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
  projectsAsPF: many(projects, { relationName: "pontoFocal" }),
  projectAssistants: many(projectAssistants),
  salaryLines: many(salaryLines),
  projectPayments: many(projectPayments),
}));

export const partnerSharesRelations = relations(partnerShares, ({ one }) => ({
  user: one(users, { fields: [partnerShares.userId], references: [users.id] }),
}));

export const clientsRelations = relations(clients, ({ many }) => ({
  contacts: many(contacts),
  invoices: many(invoices),
  projects: many(projects),
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
  project: one(projects, {
    fields: [invoices.projectId],
    references: [projects.id],
  }),
  createdBy: one(users, {
    fields: [invoices.createdBy],
    references: [users.id],
  }),
  items: many(invoiceItems),
  payments: many(invoicePayments),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  client: one(clients, {
    fields: [projects.clientId],
    references: [clients.id],
  }),
  servico: one(servicesCatalog, {
    fields: [projects.servicoId],
    references: [servicesCatalog.id],
  }),
  pontoFocal: one(users, {
    fields: [projects.pontoFocalId],
    references: [users.id],
    relationName: "pontoFocal",
  }),
  assistants: many(projectAssistants),
  invoices: many(invoices),
  projectPayments: many(projectPayments),
  expenses: many(expenses),
}));

export const projectAssistantsRelations = relations(projectAssistants, ({ one }) => ({
  project: one(projects, {
    fields: [projectAssistants.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectAssistants.userId],
    references: [users.id],
  }),
}));

export const salaryPoliciesRelations = relations(salaryPolicies, ({ many }) => ({
  periods: many(salaryPeriods),
}));

export const salaryPeriodsRelations = relations(salaryPeriods, ({ one, many }) => ({
  policy: one(salaryPolicies, {
    fields: [salaryPeriods.policyId],
    references: [salaryPolicies.id],
  }),
  lines: many(salaryLines),
  projectPayments: many(projectPayments),
}));

export const salaryLinesRelations = relations(salaryLines, ({ one }) => ({
  period: one(salaryPeriods, {
    fields: [salaryLines.periodId],
    references: [salaryPeriods.id],
  }),
  user: one(users, {
    fields: [salaryLines.userId],
    references: [users.id],
  }),
}));

export const projectPaymentsRelations = relations(projectPayments, ({ one }) => ({
  period: one(salaryPeriods, {
    fields: [projectPayments.periodId],
    references: [salaryPeriods.id],
  }),
  project: one(projects, {
    fields: [projectPayments.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectPayments.userId],
    references: [users.id],
  }),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  project: one(projects, {
    fields: [expenses.projectoId],
    references: [projects.id],
  }),
  registadoPor: one(users, {
    fields: [expenses.registadoPor],
    references: [users.id],
  }),
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

export const expensesRelations = relations(expenses, ({ one }) => ({
  criadoPor: one(users, {
    fields: [expenses.criadoPor],
    references: [users.id],
    relationName: "expense_criado_por",
  }),
  aprovadoPor: one(users, {
    fields: [expenses.aprovadoPor],
    references: [users.id],
    relationName: "expense_aprovado_por",
  }),
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
export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;
export type UserRole = (typeof roleEnum.enumValues)[number];
export type InvoiceState = (typeof invoiceStateEnum.enumValues)[number];
export type InvoiceType = (typeof invoiceTypeEnum.enumValues)[number];
export type Currency = (typeof currencyEnum.enumValues)[number];
export type ProjectState = (typeof projectStateEnum.enumValues)[number];
export type SalaryPeriodState = (typeof salaryPeriodStateEnum.enumValues)[number];
export type ProjectRole = (typeof projectRoleEnum.enumValues)[number];
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type ProjectAssistant = typeof projectAssistants.$inferSelect;
export type SalaryPolicy = typeof salaryPolicies.$inferSelect;
export type NewSalaryPolicy = typeof salaryPolicies.$inferInsert;
export type SalaryPeriod = typeof salaryPeriods.$inferSelect;
export type NewSalaryPeriod = typeof salaryPeriods.$inferInsert;
export type SalaryLine = typeof salaryLines.$inferSelect;
export type NewSalaryLine = typeof salaryLines.$inferInsert;
export type ProjectPayment = typeof projectPayments.$inferSelect;
export type ExpenseCategory = (typeof expenseCategoryEnum.enumValues)[number];
export type ExpenseState = (typeof expenseStateEnum.enumValues)[number];
