import { eq, and, desc, sql, ilike } from "drizzle-orm";
import { db } from "./db";
import {
  companies, users, clients, orders, orderHistory, messages,
  type Company, type InsertCompany,
  type User, type InsertUser,
  type Client, type InsertClient,
  type Order, type InsertOrder,
  type OrderHistory, type InsertOrderHistory,
  type Message, type InsertMessage,
} from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  createCompany(company: InsertCompany): Promise<Company>;
  getCompany(id: number): Promise<Company | undefined>;
  getCompanyBySlug(slug: string): Promise<Company | undefined>;
  getAllCompanies(): Promise<Company[]>;
  updateCompany(id: number, data: Partial<InsertCompany>): Promise<Company | undefined>;
  deleteCompany(id: number): Promise<void>;

  getClients(companyId: number): Promise<Client[]>;
  getClient(id: number, companyId: number): Promise<Client | undefined>;
  getClientByPhone(phone: string, companyId: number): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, companyId: number, data: Partial<InsertClient>): Promise<Client | undefined>;
  searchClients(companyId: number, query: string): Promise<Client[]>;

  getOrders(companyId: number): Promise<Order[]>;
  getOrder(id: number, companyId: number): Promise<Order | undefined>;
  getOrdersByClient(clientId: number, companyId: number): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: number, companyId: number, data: Partial<InsertOrder>): Promise<Order | undefined>;
  getNextOrderNumber(companyId: number): Promise<number>;

  getOrderHistory(orderId: number, companyId: number): Promise<OrderHistory[]>;
  createOrderHistory(history: InsertOrderHistory): Promise<OrderHistory>;

  getMessages(companyId: number, clientId: number): Promise<Message[]>;
  getConversations(companyId: number): Promise<any[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessagesRead(companyId: number, clientId: number): Promise<void>;

  getDashboardStats(companyId: number): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async createCompany(company: InsertCompany): Promise<Company> {
    const [created] = await db.insert(companies).values(company).returning();
    return created;
  }

  async getCompany(id: number): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company;
  }

  async getCompanyBySlug(slug: string): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.slug, slug));
    return company;
  }

  async getAllCompanies(): Promise<Company[]> {
    return db.select().from(companies).orderBy(desc(companies.createdAt));
  }

  async updateCompany(id: number, data: Partial<InsertCompany>): Promise<Company | undefined> {
    const [updated] = await db.update(companies).set(data).where(eq(companies.id, id)).returning();
    return updated;
  }

  async deleteCompany(id: number): Promise<void> {
    await db.delete(orderHistory).where(
      sql`${orderHistory.companyId} = ${id}`
    );
    await db.delete(messages).where(eq(messages.companyId, id));
    await db.delete(orders).where(eq(orders.companyId, id));
    await db.delete(clients).where(eq(clients.companyId, id));
    await db.delete(users).where(eq(users.companyId, id));
    await db.delete(companies).where(eq(companies.id, id));
  }

  async getClients(companyId: number): Promise<Client[]> {
    return db.select().from(clients).where(eq(clients.companyId, companyId)).orderBy(desc(clients.createdAt));
  }

  async getClient(id: number, companyId: number): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(
      and(eq(clients.id, id), eq(clients.companyId, companyId))
    );
    return client;
  }

  async getClientByPhone(phone: string, companyId: number): Promise<Client | undefined> {
    const normalized = phone.replace(/[\s\-\.]/g, "");
    const allClients = await db.select().from(clients).where(eq(clients.companyId, companyId));
    return allClients.find(c => c.phone.replace(/[\s\-\.]/g, "") === normalized);
  }

  async createClient(client: InsertClient): Promise<Client> {
    const [created] = await db.insert(clients).values(client).returning();
    return created;
  }

  async updateClient(id: number, companyId: number, data: Partial<InsertClient>): Promise<Client | undefined> {
    const [updated] = await db.update(clients).set(data)
      .where(and(eq(clients.id, id), eq(clients.companyId, companyId)))
      .returning();
    return updated;
  }

  async searchClients(companyId: number, query: string): Promise<Client[]> {
    const normalized = query.replace(/[\s\-\.]/g, "");
    const all = await this.getClients(companyId);
    return all.filter(c =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.phone.replace(/[\s\-\.]/g, "").includes(normalized)
    );
  }

  async getOrders(companyId: number): Promise<Order[]> {
    return db.select().from(orders).where(eq(orders.companyId, companyId)).orderBy(desc(orders.createdAt));
  }

  async getOrder(id: number, companyId: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(
      and(eq(orders.id, id), eq(orders.companyId, companyId))
    );
    return order;
  }

  async getOrdersByClient(clientId: number, companyId: number): Promise<Order[]> {
    return db.select().from(orders).where(
      and(eq(orders.clientId, clientId), eq(orders.companyId, companyId))
    ).orderBy(desc(orders.createdAt));
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [created] = await db.insert(orders).values(order).returning();
    return created;
  }

  async updateOrder(id: number, companyId: number, data: Partial<InsertOrder>): Promise<Order | undefined> {
    const [updated] = await db.update(orders).set(data)
      .where(and(eq(orders.id, id), eq(orders.companyId, companyId)))
      .returning();
    return updated;
  }

  async getNextOrderNumber(companyId: number): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(orders).where(eq(orders.companyId, companyId));
    return (result[0]?.count || 0) + 1;
  }

  async getOrderHistory(orderId: number, companyId: number): Promise<OrderHistory[]> {
    return db.select().from(orderHistory).where(
      and(eq(orderHistory.orderId, orderId), eq(orderHistory.companyId, companyId))
    ).orderBy(desc(orderHistory.createdAt));
  }

  async createOrderHistory(history: InsertOrderHistory): Promise<OrderHistory> {
    const [created] = await db.insert(orderHistory).values(history).returning();
    return created;
  }

  async getMessages(companyId: number, clientId: number): Promise<Message[]> {
    return db.select().from(messages).where(
      and(eq(messages.companyId, companyId), eq(messages.clientId, clientId))
    ).orderBy(messages.createdAt);
  }

  async getConversations(companyId: number): Promise<any[]> {
    const allClients = await this.getClients(companyId);
    const conversations = [];
    for (const client of allClients) {
      const msgs = await db.select().from(messages)
        .where(and(eq(messages.companyId, companyId), eq(messages.clientId, client.id)))
        .orderBy(desc(messages.createdAt));
      if (msgs.length > 0) {
        const unread = msgs.filter(m => !m.read && m.senderType === "client").length;
        conversations.push({
          client,
          lastMessage: msgs[0],
          unreadCount: unread,
        });
      }
    }
    return conversations.sort((a, b) =>
      new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime()
    );
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [created] = await db.insert(messages).values(message).returning();
    return created;
  }

  async markMessagesRead(companyId: number, clientId: number): Promise<void> {
    await db.update(messages).set({ read: true })
      .where(and(
        eq(messages.companyId, companyId),
        eq(messages.clientId, clientId),
        eq(messages.senderType, "client")
      ));
  }

  async getDashboardStats(companyId: number): Promise<any> {
    const allOrders = await this.getOrders(companyId);
    const totalReceived = allOrders.reduce((sum, o) => sum + parseFloat(o.receivedValue || "0"), 0);
    const totalPending = allOrders.reduce((sum, o) => sum + (parseFloat(o.totalValue || "0") - parseFloat(o.receivedValue || "0")), 0);
    const pendingOrders = allOrders.filter(o => o.financialStatus !== "paid").length;
    const byStatus: Record<string, number> = {};
    allOrders.forEach(o => { byStatus[o.status] = (byStatus[o.status] || 0) + 1; });
    return { totalReceived, totalPending, pendingOrders, totalOrders: allOrders.length, byStatus };
  }
}

export const storage = new DatabaseStorage();
