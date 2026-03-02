import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "./db";
import {
  companies, users, clients, orders, orderHistory, messages, products, stockMovements, orderItems,
  type Company, type InsertCompany,
  type User, type InsertUser,
  type Client, type InsertClient,
  type Order, type InsertOrder,
  type OrderHistory, type InsertOrderHistory,
  type Message, type InsertMessage,
  type Product, type InsertProduct,
  type StockMovement, type InsertStockMovement,
  type OrderItem, type InsertOrderItem,
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

  getProducts(companyId: number): Promise<Product[]>;
  getProduct(id: number, companyId: number): Promise<Product | undefined>;
  getActiveProducts(companyId: number): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, companyId: number, data: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: number, companyId: number): Promise<void>;
  getNextSku(companyId: number): Promise<string>;

  getStockMovements(productId: number, companyId: number): Promise<StockMovement[]>;
  createStockMovement(movement: InsertStockMovement): Promise<StockMovement>;
  adjustStock(productId: number, companyId: number, quantity: number): Promise<void>;
  getStockDashboard(companyId: number): Promise<any>;

  getOrderItems(orderId: number): Promise<OrderItem[]>;
  createOrderItem(item: InsertOrderItem): Promise<OrderItem>;

  getOnlineSalesDashboard(companyId: number): Promise<any>;
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
    await db.delete(orderHistory).where(sql`${orderHistory.companyId} = ${id}`);
    await db.delete(messages).where(eq(messages.companyId, id));
    const companyOrders = await db.select().from(orders).where(eq(orders.companyId, id));
    for (const o of companyOrders) {
      await db.delete(orderItems).where(eq(orderItems.orderId, o.id));
    }
    await db.delete(orders).where(eq(orders.companyId, id));
    await db.delete(stockMovements).where(eq(stockMovements.companyId, id));
    await db.delete(products).where(eq(products.companyId, id));
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
        conversations.push({ client, lastMessage: msgs[0], unreadCount: unread });
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
      .where(and(eq(messages.companyId, companyId), eq(messages.clientId, clientId), eq(messages.senderType, "client")));
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

  async getProducts(companyId: number): Promise<Product[]> {
    return db.select().from(products).where(eq(products.companyId, companyId)).orderBy(desc(products.createdAt));
  }

  async getProduct(id: number, companyId: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(
      and(eq(products.id, id), eq(products.companyId, companyId))
    );
    return product;
  }

  async getActiveProducts(companyId: number): Promise<Product[]> {
    return db.select().from(products).where(
      and(eq(products.companyId, companyId), eq(products.active, true))
    ).orderBy(desc(products.createdAt));
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [created] = await db.insert(products).values(product).returning();
    return created;
  }

  async updateProduct(id: number, companyId: number, data: Partial<InsertProduct>): Promise<Product | undefined> {
    const [updated] = await db.update(products).set(data)
      .where(and(eq(products.id, id), eq(products.companyId, companyId)))
      .returning();
    return updated;
  }

  async deleteProduct(id: number, companyId: number): Promise<void> {
    await db.delete(stockMovements).where(eq(stockMovements.productId, id));
    await db.delete(products).where(and(eq(products.id, id), eq(products.companyId, companyId)));
  }

  async getNextSku(companyId: number): Promise<string> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(products).where(eq(products.companyId, companyId));
    const num = (result[0]?.count || 0) + 1;
    return `PRD-${String(num).padStart(5, "0")}`;
  }

  async getStockMovements(productId: number, companyId: number): Promise<StockMovement[]> {
    return db.select().from(stockMovements).where(
      and(eq(stockMovements.productId, productId), eq(stockMovements.companyId, companyId))
    ).orderBy(desc(stockMovements.createdAt));
  }

  async createStockMovement(movement: InsertStockMovement): Promise<StockMovement> {
    const [created] = await db.insert(stockMovements).values(movement).returning();
    return created;
  }

  async adjustStock(productId: number, companyId: number, quantity: number): Promise<void> {
    await db.update(products).set({
      stockQuantity: sql`${products.stockQuantity} + ${quantity}`,
    }).where(and(eq(products.id, productId), eq(products.companyId, companyId)));
  }

  async getStockDashboard(companyId: number): Promise<any> {
    const allProducts = await this.getProducts(companyId);
    const physicalProducts = allProducts.filter(p => p.productType === "physical");
    const lowStock = physicalProducts.filter(p => (p.stockQuantity || 0) <= (p.minStock || 0) && (p.stockQuantity || 0) > 0);
    const noStock = physicalProducts.filter(p => (p.stockQuantity || 0) === 0);
    const totalValue = physicalProducts.reduce((sum, p) => sum + (p.stockQuantity || 0) * parseFloat(p.price || "0"), 0);
    return { lowStock, noStock, totalValue, totalProducts: allProducts.length };
  }

  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    return db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  }

  async createOrderItem(item: InsertOrderItem): Promise<OrderItem> {
    const [created] = await db.insert(orderItems).values(item).returning();
    return created;
  }

  async getOnlineSalesDashboard(companyId: number): Promise<any> {
    const allOrders = await this.getOrders(companyId);
    const onlineOrders = allOrders.filter(o => o.source === "online");
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthOrders = onlineOrders.filter(o => new Date(o.createdAt) >= monthStart);
    const totalMonth = monthOrders.reduce((sum, o) => sum + parseFloat(o.totalValue || "0"), 0);
    const avgTicket = monthOrders.length > 0 ? totalMonth / monthOrders.length : 0;

    const productSales: Record<number, { name: string; quantity: number; revenue: number }> = {};
    for (const order of onlineOrders) {
      const items = await this.getOrderItems(order.id);
      for (const item of items) {
        if (!productSales[item.productId]) {
          const product = await this.getProduct(item.productId, companyId);
          productSales[item.productId] = { name: product?.name || "Produto removido", quantity: 0, revenue: 0 };
        }
        productSales[item.productId].quantity += item.quantity;
        productSales[item.productId].revenue += item.quantity * parseFloat(item.unitPrice);
      }
    }
    const topProducts = Object.entries(productSales)
      .map(([id, data]) => ({ productId: parseInt(id), ...data }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    return {
      totalMonth,
      monthOrdersCount: monthOrders.length,
      avgTicket,
      totalOnlineOrders: onlineOrders.length,
      topProducts,
    };
  }
}

export const storage = new DatabaseStorage();
