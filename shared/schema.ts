import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, decimal, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  phone: text("phone"),
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color").default("#3B82F6"),
  status: text("status").notNull().default("active"),
  plan: text("plan").notNull().default("basic"),
  subscriptionExpiry: timestamp("subscription_expiry"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("admin"),
  companyId: integer("company_id").references(() => companies.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  clientId: integer("client_id").notNull().references(() => clients.id),
  code: text("code").notNull(),
  status: text("status").notNull().default("received"),
  urgent: boolean("urgent").default(false),
  description: text("description"),
  deliveryDate: timestamp("delivery_date"),
  totalValue: decimal("total_value", { precision: 10, scale: 2 }).default("0"),
  receivedValue: decimal("received_value", { precision: 10, scale: 2 }).default("0"),
  financialStatus: text("financial_status").notNull().default("pending"),
  kanbanOrder: integer("kanban_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const orderHistory = pgTable("order_history", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id),
  companyId: integer("company_id").notNull().references(() => companies.id),
  fromStatus: text("from_status"),
  toStatus: text("to_status").notNull(),
  changedBy: text("changed_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  clientId: integer("client_id").notNull().references(() => clients.id),
  content: text("content").notNull(),
  senderType: text("sender_type").notNull(),
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCompanySchema = createInsertSchema(companies).omit({ id: true, createdAt: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertClientSchema = createInsertSchema(clients).omit({ id: true, createdAt: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, code: true });
export const insertOrderHistorySchema = createInsertSchema(orderHistory).omit({ id: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });

export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type OrderHistory = typeof orderHistory.$inferSelect;
export type InsertOrderHistory = z.infer<typeof insertOrderHistorySchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export const ORDER_STATUSES = [
  "received",
  "design",
  "production",
  "packaging",
  "sent",
  "finished",
  "waiting_client",
] as const;

export const ORDER_STATUS_LABELS: Record<string, string> = {
  received: "Pedido Recebido",
  design: "Em Design",
  production: "Em Produção",
  packaging: "Em Embalagem",
  sent: "Enviado",
  finished: "Finalizado",
  waiting_client: "Aguardando Cliente",
};

export const FINANCIAL_STATUS_LABELS: Record<string, string> = {
  paid: "Pago",
  partial: "Parcial",
  pending: "Pendente",
};

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const registerCompanySchema = z.object({
  companyName: z.string().min(2),
  companyPhone: z.string().optional(),
  adminName: z.string().min(2),
  adminUsername: z.string().min(3),
  adminPassword: z.string().min(6),
});
