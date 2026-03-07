import type { Express } from "express";
import { type Server } from "http";
import passport from "passport";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { storage } from "./storage";
import { setupAuth, requireAuth, requireSuperAdmin, requirePermission, hashPassword } from "./auth";
import { registerCompanySchema, ORDER_STATUSES, orders, ALL_PERMISSIONS } from "@shared/schema";

const createClientSchema = z.object({
  name: z.string().min(1),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  address: z.string().nullable().optional(),
  personType: z.enum(["fisica", "juridica"]).nullable().optional(),
  document: z.string().nullable().optional(),
  neighborhood: z.string().nullable().optional(),
  streetNumber: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
});

const updateClientSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  address: z.string().nullable().optional(),
  personType: z.enum(["fisica", "juridica"]).nullable().optional(),
  document: z.string().nullable().optional(),
  neighborhood: z.string().nullable().optional(),
  streetNumber: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
});

const createOrderSchema = z.object({
  clientId: z.number().int().positive(),
  description: z.string().optional().nullable(),
  urgent: z.boolean().optional().default(false),
  totalValue: z.string().optional().default("0"),
  deliveryDate: z.string().optional().nullable(),
  type: z.enum(["order", "quotation"]).optional().default("order"),
  items: z.array(z.object({
    productId: z.number().int().positive(),
    quantity: z.number().int().positive(),
    unitPrice: z.string(),
    variation: z.string().optional().nullable(),
  })).optional(),
});

const updateOrderSchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  urgent: z.boolean().optional(),
  description: z.string().optional().nullable(),
  totalValue: z.string().optional(),
  receivedValue: z.string().optional(),
  deliveryDate: z.string().optional().nullable(),
  kanbanOrder: z.number().optional(),
  financialStatus: z.string().optional(),
  type: z.enum(["order", "quotation"]).optional(),
});

const sendMessageSchema = z.object({
  clientId: z.number().int().positive(),
  content: z.string().min(1),
});

const createProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  price: z.string().min(1),
  wholesalePrice: z.string().optional().nullable(),
  wholesaleMinQty: z.number().optional().default(1),
  internalCode: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  gallery: z.array(z.string()).optional().nullable(),
  active: z.boolean().optional().default(true),
  productType: z.enum(["physical", "digital"]).default("physical"),
  variations: z.object({
    sizes: z.array(z.string()).optional(),
    colors: z.array(z.string()).optional(),
    models: z.array(z.string()).optional(),
  }).optional().nullable(),
  stockQuantity: z.number().optional().default(0),
  minStock: z.number().optional().default(0),
  generateChildren: z.boolean().optional().default(false),
  childOverrides: z.record(z.string(), z.object({
    price: z.string().optional(),
    wholesalePrice: z.string().optional(),
    stockQuantity: z.number().optional(),
  })).optional(),
});

const updateProductSchema = createProductSchema.partial();

const stockMovementSchema = z.object({
  productId: z.number().int().positive(),
  type: z.enum(["manual_in", "manual_out", "adjustment"]),
  quantity: z.number().int().positive(),
  reason: z.string().optional().nullable(),
});

const checkoutSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
  items: z.array(z.object({
    productId: z.number().int().positive(),
    quantity: z.number().int().positive(),
    variation: z.string().optional().nullable(),
  })).min(1),
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupAuth(app);

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Credenciais inválidas" });
      req.logIn(user, async (err) => {
        if (err) return next(err);
        const userData: any = { ...user };
        if (userData.companyId) {
          const company = await storage.getCompany(userData.companyId);
          if (company) userData.companySlug = company.slug;
        }
        return res.json(userData);
      });
    })(req, res, next);
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = registerCompanySchema.parse(req.body);
      const existing = await storage.getUserByUsername(data.adminUsername);
      if (existing) return res.status(400).json({ message: "Usuário já existe" });

      const slug = data.companyName.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
      const existingSlug = await storage.getCompanyBySlug(slug);
      if (existingSlug) return res.status(400).json({ message: "Nome de empresa já em uso" });

      const hashedPassword = await hashPassword(data.adminPassword);
      const company = await storage.createCompany({ name: data.companyName, slug, phone: data.companyPhone || null });
      const user = await storage.createUser({
        username: data.adminUsername, password: hashedPassword, name: data.adminName,
        email: data.adminEmail ? data.adminEmail.trim().toLowerCase() : null,
        role: "admin", companyId: company.id,
      });

      req.logIn({ id: user.id, username: user.username, name: user.name, role: user.role, companyId: user.companyId }, (err) => {
        if (err) return res.status(500).json({ message: "Falha ao fazer login" });
        return res.json({ id: user.id, username: user.username, name: user.name, role: user.role, companyId: user.companyId, companySlug: slug });
      });
    } catch (err: any) {
      return res.status(400).json({ message: err.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => { req.logout(() => res.json({ success: true })); });
  app.get("/api/auth/me", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    const userData: any = { ...req.user };
    if (userData.companyId) {
      const company = await storage.getCompany(userData.companyId);
      if (company) userData.companySlug = company.slug;
    }
    return res.json(userData);
  });

  const resetAttempts = new Map<string, { count: number; lastAttempt: number }>();
  const resetCooldowns = new Map<string, number>();

  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = z.object({ email: z.string().email() }).parse(req.body);
      const normalizedEmail = email.trim().toLowerCase();
      const cooldown = resetCooldowns.get(normalizedEmail);
      if (cooldown && Date.now() - cooldown < 60000) {
        return res.json({ success: true, message: "Se o e-mail estiver cadastrado, você receberá um código de recuperação." });
      }
      const user = await storage.getUserByEmail(normalizedEmail);
      if (user) {
        const { randomInt } = await import("crypto");
        const code = String(randomInt(100000, 999999));
        const expiry = new Date(Date.now() + 15 * 60 * 1000);
        await storage.updateUser(user.id, { resetToken: code, resetTokenExpiry: expiry } as any);
        resetCooldowns.set(normalizedEmail, Date.now());
        resetAttempts.delete(normalizedEmail);
        const { sendPasswordResetEmail } = await import("./email");
        await sendPasswordResetEmail(normalizedEmail, code, user.name);
      }
      res.json({ success: true, message: "Se o e-mail estiver cadastrado, você receberá um código de recuperação." });
    } catch (err: any) { res.status(400).json({ message: err.message }); }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { email, code, newPassword } = z.object({
        email: z.string().email(),
        code: z.string().length(6),
        newPassword: z.string().min(6),
      }).parse(req.body);
      const normalizedEmail = email.trim().toLowerCase();
      const attempts = resetAttempts.get(normalizedEmail) || { count: 0, lastAttempt: 0 };
      if (attempts.count >= 5 && Date.now() - attempts.lastAttempt < 15 * 60 * 1000) {
        return res.status(429).json({ message: "Muitas tentativas. Tente novamente em 15 minutos." });
      }
      const user = await storage.getUserByEmail(normalizedEmail);
      if (!user || !user.resetToken || !user.resetTokenExpiry) {
        resetAttempts.set(normalizedEmail, { count: attempts.count + 1, lastAttempt: Date.now() });
        return res.status(400).json({ message: "Código inválido ou expirado" });
      }
      if (user.resetToken !== code || new Date(user.resetTokenExpiry) < new Date()) {
        resetAttempts.set(normalizedEmail, { count: attempts.count + 1, lastAttempt: Date.now() });
        return res.status(400).json({ message: "Código inválido ou expirado" });
      }
      const hashed = await hashPassword(newPassword);
      await storage.updateUser(user.id, { password: hashed, resetToken: null, resetTokenExpiry: null } as any);
      resetAttempts.delete(normalizedEmail);
      res.json({ success: true, message: "Senha alterada com sucesso!" });
    } catch (err: any) { res.status(400).json({ message: err.message }); }
  });

  app.get("/api/admin/companies", requireSuperAdmin, async (_req, res) => { res.json(await storage.getAllCompanies()); });
  app.patch("/api/admin/companies/:id", requireSuperAdmin, async (req, res) => {
    const allowed = z.object({ status: z.enum(["active", "suspended"]).optional(), plan: z.enum(["basic", "professional", "premium"]).optional() }).parse(req.body);
    const updated = await storage.updateCompany(parseInt(req.params.id), allowed);
    if (!updated) return res.status(404).json({ message: "Não encontrado" });
    res.json(updated);
  });
  app.delete("/api/admin/companies/:id", requireSuperAdmin, async (req, res) => {
    await storage.deleteCompany(parseInt(req.params.id));
    res.json({ success: true });
  });

  app.post("/api/admin/companies/:id/reset-password", requireSuperAdmin, async (req, res) => {
    try {
      const companyId = parseInt(req.params.id);
      const companyUsers = await storage.getUsersByCompany(companyId);
      const adminUser = companyUsers.find(u => u.role === "admin");
      if (!adminUser) return res.status(404).json({ message: "Administrador da empresa não encontrado" });
      const { randomBytes } = await import("crypto");
      const newPassword = randomBytes(6).toString("base64url").slice(0, 8);
      const hashed = await hashPassword(newPassword);
      await storage.updateUser(adminUser.id, { password: hashed } as any);
      res.json({ newPassword, adminUsername: adminUser.username, adminName: adminUser.name });
    } catch (err: any) { res.status(400).json({ message: err.message }); }
  });

  const requireClientsOrPdv = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    const user = req.user!;
    if (user.role === "superadmin" || user.role === "admin") return next();
    const perms = user.permissions as string[] | null;
    if (perms && (perms.includes("clients") || perms.includes("pdv") || perms.includes("orders"))) return next();
    return res.status(403).json({ message: "Permissão insuficiente" });
  };
  app.get("/api/clients", requireAuth, requireClientsOrPdv, async (req, res) => {
    const companyId = req.user!.companyId!;
    const search = req.query.search as string;
    if (search) return res.json(await storage.searchClients(companyId, search));
    res.json(await storage.getClients(companyId));
  });
  app.get("/api/clients/:id", requireAuth, async (req, res) => {
    const client = await storage.getClient(parseInt(req.params.id), req.user!.companyId!);
    if (!client) return res.status(404).json({ message: "Não encontrado" });
    res.json(client);
  });
  app.post("/api/clients", requireAuth, async (req, res) => {
    try {
      const companyId = req.user!.companyId!;
      const data = createClientSchema.parse(req.body);
      if (data.phone) {
        const existing = await storage.getClientByPhone(data.phone, companyId);
        if (existing) return res.status(400).json({ message: "Cliente com este telefone já existe" });
      }
      res.json(await storage.createClient({ ...data, companyId } as any));
    } catch (err: any) { res.status(400).json({ message: err.message }); }
  });
  app.patch("/api/clients/:id", requireAuth, async (req, res) => {
    try {
      const data = updateClientSchema.parse(req.body);
      const updated = await storage.updateClient(parseInt(req.params.id), req.user!.companyId!, data);
      if (!updated) return res.status(404).json({ message: "Não encontrado" });
      res.json(updated);
    } catch (err: any) { res.status(400).json({ message: err.message }); }
  });

  app.get("/api/orders", requireAuth, requirePermission("orders"), async (req, res) => { res.json(await storage.getOrders(req.user!.companyId!)); });
  app.get("/api/orders/:id", requireAuth, async (req, res) => {
    const order = await storage.getOrder(parseInt(req.params.id), req.user!.companyId!);
    if (!order) return res.status(404).json({ message: "Não encontrado" });
    res.json(order);
  });
  app.get("/api/orders/client/:clientId", requireAuth, async (req, res) => {
    res.json(await storage.getOrdersByClient(parseInt(req.params.clientId), req.user!.companyId!));
  });
  app.post("/api/orders", requireAuth, async (req, res) => {
    try {
      const companyId = req.user!.companyId!;
      const data = createOrderSchema.parse(req.body);
      const nextNum = await storage.getNextOrderNumber(companyId);
      const prefix = data.type === "quotation" ? "ORC" : "FDJ";
      const code = `${prefix}-${new Date().getFullYear()}-${String(nextNum).padStart(4, "0")}`;
      const orderData: any = {
        clientId: data.clientId, companyId, code, status: "received", financialStatus: "pending",
        receivedValue: "0", kanbanOrder: 0, urgent: data.urgent, type: data.type || "order",
        description: data.description,
        totalValue: data.totalValue,
        deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : null,
      };
      const order = await storage.createOrder(orderData);

      if (data.items && data.items.length > 0) {
        for (const item of data.items) {
          await storage.createOrderItem({ orderId: order.id, productId: item.productId, quantity: item.quantity, unitPrice: item.unitPrice, variation: item.variation || null });
        }
      }

      await storage.createOrderHistory({ orderId: order.id, companyId, fromStatus: null, toStatus: "received", changedBy: req.user!.name });
      res.json(order);
    } catch (err: any) { res.status(400).json({ message: err.message }); }
  });
  app.patch("/api/orders/:id", requireAuth, async (req, res) => {
    try {
      const companyId = req.user!.companyId!;
      const orderId = parseInt(req.params.id);
      const data = updateOrderSchema.parse(req.body);
      const existing = await storage.getOrder(orderId, companyId);
      if (!existing) return res.status(404).json({ message: "Não encontrado" });

      if (data.status && data.status !== existing.status) {
        await storage.createOrderHistory({ orderId, companyId, fromStatus: existing.status, toStatus: data.status, changedBy: req.user!.name });
        if (data.status === "finished") {
          data.urgent = false;
        }
        if (data.status === "finished" && existing.status !== "finished" && existing.source !== "online") {
          const items = await storage.getOrderItems(orderId);
          for (const item of items) {
            const product = await storage.getProduct(item.productId, companyId);
            if (product && product.productType === "physical") {
              await storage.adjustStock(item.productId, companyId, -item.quantity);
              await storage.createStockMovement({ productId: item.productId, companyId, type: "sale", quantity: -item.quantity, reason: `Pedido ${existing.code} finalizado` });
            }
          }
        }
      }

      if (data.receivedValue !== undefined || data.totalValue !== undefined) {
        const total = parseFloat(data.totalValue ?? existing.totalValue ?? "0");
        const received = parseFloat(data.receivedValue ?? existing.receivedValue ?? "0");
        if (received >= total && total > 0) data.financialStatus = "paid";
        else if (received > 0) data.financialStatus = "partial";
        else data.financialStatus = "pending";
      }

      if (data.receivedValue !== undefined) {
        const oldReceived = parseFloat(existing.receivedValue || "0");
        const newReceived = parseFloat(data.receivedValue || "0");
        const diff = newReceived - oldReceived;
        if (diff > 0) {
          await storage.createExpense({
            companyId,
            type: "income",
            category: "Recebimento de Pedido",
            description: `Pagamento pedido ${existing.code} (R$ ${diff.toFixed(2)})`,
            amount: diff.toFixed(2),
            date: new Date(),
          });
        }
      }

      const updateData: any = { ...data };
      if (updateData.deliveryDate !== undefined) {
        updateData.deliveryDate = updateData.deliveryDate ? new Date(updateData.deliveryDate) : null;
      }

      res.json(await storage.updateOrder(orderId, companyId, updateData));
    } catch (err: any) { res.status(400).json({ message: err.message }); }
  });
  app.delete("/api/orders/:id", requireAuth, async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const companyId = req.user!.companyId!;
      const order = await storage.getOrder(orderId, companyId);
      if (!order) return res.status(404).json({ message: "Pedido não encontrado" });
      await storage.deleteOrder(orderId, companyId);
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.get("/api/orders/:id/history", requireAuth, async (req, res) => {
    res.json(await storage.getOrderHistory(parseInt(req.params.id), req.user!.companyId!));
  });
  app.get("/api/orders/:id/items", requireAuth, async (req, res) => {
    res.json(await storage.getOrderItems(parseInt(req.params.id)));
  });
  app.post("/api/orders/:id/items", requireAuth, async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const order = await storage.getOrder(orderId, req.user!.companyId!);
      if (!order) return res.status(404).json({ message: "Pedido não encontrado" });
      const { productId, quantity, unitPrice, variation } = req.body;
      const item = await storage.createOrderItem({ orderId, productId, quantity, unitPrice, variation: variation || null });
      res.json(item);
    } catch (err: any) { res.status(400).json({ message: err.message }); }
  });
  app.patch("/api/orders/:id/items/:itemId", requireAuth, async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const order = await storage.getOrder(orderId, req.user!.companyId!);
      if (!order) return res.status(404).json({ message: "Pedido não encontrado" });
      const items = await storage.getOrderItems(orderId);
      const item = items.find(i => i.id === parseInt(req.params.itemId));
      if (!item) return res.status(404).json({ message: "Item não encontrado neste pedido" });
      const { quantity, unitPrice } = req.body;
      const updated = await storage.updateOrderItem(item.id, {
        quantity: quantity !== undefined ? quantity : item.quantity,
        unitPrice: unitPrice !== undefined ? unitPrice : item.unitPrice,
      });
      res.json(updated);
    } catch (err: any) { res.status(400).json({ message: err.message }); }
  });
  app.delete("/api/orders/:id/items/:itemId", requireAuth, async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const order = await storage.getOrder(orderId, req.user!.companyId!);
      if (!order) return res.status(404).json({ message: "Pedido não encontrado" });
      const items = await storage.getOrderItems(orderId);
      const item = items.find(i => i.id === parseInt(req.params.itemId));
      if (!item) return res.status(404).json({ message: "Item não encontrado neste pedido" });
      await storage.deleteOrderItem(item.id);
      res.json({ ok: true });
    } catch (err: any) { res.status(400).json({ message: err.message }); }
  });

  app.get("/api/messages/:clientId", requireAuth, async (req, res) => {
    res.json(await storage.getMessages(req.user!.companyId!, parseInt(req.params.clientId)));
  });
  app.get("/api/conversations", requireAuth, async (req, res) => {
    res.json(await storage.getConversations(req.user!.companyId!));
  });
  app.post("/api/messages", requireAuth, async (req, res) => {
    try {
      const data = sendMessageSchema.parse(req.body);
      res.json(await storage.createMessage({ ...data, companyId: req.user!.companyId!, senderType: "company" }));
    } catch (err: any) { res.status(400).json({ message: err.message }); }
  });
  app.post("/api/messages/:clientId/read", requireAuth, async (req, res) => {
    await storage.markMessagesRead(req.user!.companyId!, parseInt(req.params.clientId));
    res.json({ success: true });
  });

  app.get("/api/dashboard", requireAuth, async (req, res) => { res.json(await storage.getDashboardStats(req.user!.companyId!)); });
  app.get("/api/company", requireAuth, async (req, res) => {
    const company = await storage.getCompany(req.user!.companyId!);
    if (!company) return res.status(404).json({ message: "Não encontrado" });
    res.json(company);
  });
  app.patch("/api/company", requireAuth, async (req, res) => {
    const allowed = z.object({
      name: z.string().min(1).optional(),
      description: z.string().optional().nullable(),
      primaryColor: z.string().optional(),
      phone: z.string().optional().nullable(),
      bannerUrl: z.string().optional().nullable(),
      logoUrl: z.string().optional().nullable(),
      socialLinks: z.any().optional(),
      cnpj: z.string().optional().nullable(),
      address: z.string().optional().nullable(),
      neighborhood: z.string().optional().nullable(),
      city: z.string().optional().nullable(),
      state: z.string().optional().nullable(),
      zipCode: z.string().optional().nullable(),
    }).parse(req.body);
    const updated = await storage.updateCompany(req.user!.companyId!, allowed);
    res.json(updated);
  });

  // Products
  app.get("/api/products", requireAuth, async (req, res) => { res.json(await storage.getProducts(req.user!.companyId!)); });
  app.get("/api/products/:id", requireAuth, async (req, res) => {
    const product = await storage.getProduct(parseInt(req.params.id), req.user!.companyId!);
    if (!product) return res.status(404).json({ message: "Não encontrado" });
    res.json(product);
  });
  app.get("/api/products/:id/children", requireAuth, async (req, res) => {
    res.json(await storage.getChildProducts(parseInt(req.params.id), req.user!.companyId!));
  });
  app.post("/api/products", requireAuth, async (req, res) => {
    try {
      const companyId = req.user!.companyId!;
      const data = createProductSchema.parse(req.body);
      const sku = await storage.getNextSku(companyId);
      const { generateChildren, childOverrides, ...productData } = data;

      if (generateChildren && data.variations) {
        const hasVariations = (data.variations.sizes?.length || 0) + (data.variations.colors?.length || 0) + (data.variations.models?.length || 0) > 0;
        if (hasVariations) {
          const result = await storage.createProductWithChildren(
            { ...productData, companyId, sku } as any,
            data.variations,
            childOverrides
          );
          return res.json(result);
        }
      }

      res.json(await storage.createProduct({ ...productData, companyId, sku } as any));
    } catch (err: any) { res.status(400).json({ message: err.message }); }
  });
  app.patch("/api/products/:id", requireAuth, async (req, res) => {
    try {
      const data = updateProductSchema.parse(req.body);
      const { generateChildren, childOverrides, ...updateData } = data;
      const updated = await storage.updateProduct(parseInt(req.params.id), req.user!.companyId!, updateData as any);
      if (!updated) return res.status(404).json({ message: "Não encontrado" });
      res.json(updated);
    } catch (err: any) { res.status(400).json({ message: err.message }); }
  });
  app.delete("/api/products/:id", requireAuth, async (req, res) => {
    await storage.deleteProduct(parseInt(req.params.id), req.user!.companyId!);
    res.json({ success: true });
  });

  // Stock
  app.get("/api/stock/dashboard", requireAuth, async (req, res) => {
    res.json(await storage.getStockDashboard(req.user!.companyId!));
  });
  app.get("/api/stock/:productId/movements", requireAuth, async (req, res) => {
    res.json(await storage.getStockMovements(parseInt(req.params.productId), req.user!.companyId!));
  });
  app.post("/api/stock/movement", requireAuth, async (req, res) => {
    try {
      const companyId = req.user!.companyId!;
      const data = stockMovementSchema.parse(req.body);
      const product = await storage.getProduct(data.productId, companyId);
      if (!product) return res.status(404).json({ message: "Produto não encontrado" });
      if (product.productType !== "physical") return res.status(400).json({ message: "Produto digital não controla estoque" });
      const delta = data.type === "manual_in" ? data.quantity : data.type === "manual_out" ? -data.quantity : data.quantity;
      const movement = await storage.createStockMovement({ ...data, companyId, quantity: delta });
      await storage.adjustStock(data.productId, companyId, delta);
      res.json(movement);
    } catch (err: any) { res.status(400).json({ message: err.message }); }
  });

  // Sales dashboard
  app.get("/api/sales/dashboard", requireAuth, async (req, res) => {
    res.json(await storage.getOnlineSalesDashboard(req.user!.companyId!));
  });

  // Employee management
  app.get("/api/employees", requireAuth, async (req, res) => {
    const companyId = req.user!.companyId!;
    const allUsers = await storage.getUsersByCompany(companyId);
    res.json(allUsers.map(u => ({ id: u.id, username: u.username, name: u.name, role: u.role, permissions: u.permissions, createdAt: u.createdAt })));
  });
  app.post("/api/employees", requireAuth, async (req, res) => {
    try {
      if (req.user!.role !== "admin") return res.status(403).json({ message: "Apenas administradores podem criar funcionários" });
      const data = z.object({
        name: z.string().min(1),
        username: z.string().min(3),
        password: z.string().min(6),
        permissions: z.array(z.string()).optional().default([]),
      }).parse(req.body);
      const existing = await storage.getUserByUsername(data.username);
      if (existing) return res.status(400).json({ message: "Usuário já existe" });
      const hashed = await hashPassword(data.password);
      const user = await storage.createUser({
        username: data.username, password: hashed, name: data.name,
        role: "employee", companyId: req.user!.companyId!,
        permissions: data.permissions,
      });
      res.json({ id: user.id, username: user.username, name: user.name, role: user.role, permissions: user.permissions });
    } catch (err: any) { res.status(400).json({ message: err.message }); }
  });
  app.patch("/api/employees/:id", requireAuth, async (req, res) => {
    try {
      if (req.user!.role !== "admin") return res.status(403).json({ message: "Apenas administradores" });
      const companyId = req.user!.companyId!;
      const data = z.object({
        name: z.string().min(1).optional(),
        permissions: z.array(z.string()).optional(),
      }).parse(req.body);
      const updated = await storage.updateUser(parseInt(req.params.id), data as any, companyId);
      if (!updated) return res.status(404).json({ message: "Não encontrado" });
      res.json({ id: updated.id, username: updated.username, name: updated.name, role: updated.role, permissions: updated.permissions });
    } catch (err: any) { res.status(400).json({ message: err.message }); }
  });
  app.patch("/api/employees/:id/reset-password", requireAuth, async (req, res) => {
    try {
      if (req.user!.role !== "admin") return res.status(403).json({ message: "Apenas administradores" });
      const companyId = req.user!.companyId!;
      const { randomBytes: rb } = await import("crypto");
      const newPassword = rb(6).toString("base64url").slice(0, 8);
      const hashed = await hashPassword(newPassword);
      const updated = await storage.updateUser(parseInt(req.params.id), { password: hashed } as any, companyId);
      if (!updated) return res.status(404).json({ message: "Não encontrado" });
      res.json({ newPassword });
    } catch (err: any) { res.status(400).json({ message: err.message }); }
  });
  app.delete("/api/employees/:id", requireAuth, async (req, res) => {
    try {
      if (req.user!.role !== "admin") return res.status(403).json({ message: "Apenas administradores" });
      const companyId = req.user!.companyId!;
      const targetId = parseInt(req.params.id);
      if (targetId === req.user!.id) return res.status(400).json({ message: "Não pode excluir a si mesmo" });
      await storage.deleteUser(targetId, companyId);
      res.json({ success: true });
    } catch (err: any) { res.status(400).json({ message: err.message }); }
  });

  // Change password (self)
  app.patch("/api/auth/change-password", requireAuth, async (req, res) => {
    try {
      const { currentPassword, newPassword } = z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(6),
      }).parse(req.body);
      const user = await storage.getUser(req.user!.id);
      if (!user) return res.status(404).json({ message: "Usuário não encontrado" });
      const { comparePassword: cmp } = await import("./auth");
      const valid = await cmp(currentPassword, user.password);
      if (!valid) return res.status(400).json({ message: "Senha atual incorreta" });
      const hashed = await hashPassword(newPassword);
      await storage.updateUser(req.user!.id, { password: hashed } as any);
      res.json({ success: true });
    } catch (err: any) { res.status(400).json({ message: err.message }); }
  });

  app.patch("/api/auth/update-email", requireAuth, async (req, res) => {
    try {
      const { email } = z.object({ email: z.string().email().or(z.literal("")) }).parse(req.body);
      const normalized = email ? email.trim().toLowerCase() : null;
      await storage.updateUser(req.user!.id, { email: normalized } as any);
      res.json({ success: true });
    } catch (err: any) { res.status(400).json({ message: err.message }); }
  });

  // Financial expenses
  app.get("/api/financial", requireAuth, requirePermission("financial"), async (req, res) => {
    res.json(await storage.getExpenses(req.user!.companyId!));
  });
  app.post("/api/financial", requireAuth, async (req, res) => {
    try {
      const data = z.object({
        type: z.enum(["income", "expense"]),
        category: z.string().min(1),
        description: z.string().optional().nullable(),
        amount: z.string().min(1),
        date: z.string().optional(),
      }).parse(req.body);
      const expense = await storage.createExpense({
        companyId: req.user!.companyId!,
        type: data.type,
        category: data.category,
        description: data.description || null,
        amount: data.amount,
        date: data.date ? new Date(data.date) : new Date(),
      } as any);
      res.json(expense);
    } catch (err: any) { res.status(400).json({ message: err.message }); }
  });
  app.delete("/api/financial/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteExpense(parseInt(req.params.id), req.user!.companyId!);
      res.json({ success: true });
    } catch (err: any) { res.status(400).json({ message: err.message }); }
  });

  // Convert quotation to order
  app.post("/api/orders/:id/convert", requireAuth, async (req, res) => {
    try {
      const companyId = req.user!.companyId!;
      const orderId = parseInt(req.params.id);
      const order = await storage.getOrder(orderId, companyId);
      if (!order) return res.status(404).json({ message: "Não encontrado" });
      if (order.type !== "quotation") return res.status(400).json({ message: "Apenas orçamentos podem ser convertidos" });
      const nextNum = await storage.getNextOrderNumber(companyId);
      const newCode = `FDJ-${new Date().getFullYear()}-${String(nextNum).padStart(4, "0")}`;
      const updated = await storage.updateOrder(orderId, companyId, { type: "order", code: newCode } as any);
      res.json(updated);
    } catch (err: any) { res.status(400).json({ message: err.message }); }
  });

  // Company logo upload
  const multer = (await import("multer")).default;
  const path = await import("path");
  const fs = await import("fs");
  const uploadDir = path.default.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  const upload = multer({ dest: uploadDir, limits: { fileSize: 5 * 1024 * 1024 } });
  app.use("/uploads", (await import("express")).default.static(uploadDir));

  app.post("/api/company/logo", requireAuth, upload.single("logo"), async (req: any, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "Nenhum arquivo enviado" });
      const ext = path.default.extname(req.file.originalname) || ".png";
      const newName = `logo_${req.user!.companyId}${ext}`;
      const newPath = path.default.join(uploadDir, newName);
      fs.renameSync(req.file.path, newPath);
      const logoUrl = `/uploads/${newName}`;
      await storage.updateCompany(req.user!.companyId!, { logoUrl } as any);
      res.json({ logoUrl });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Public store routes (no auth required)
  app.get("/api/store/:slug", async (req, res) => {
    const company = await storage.getCompanyBySlug(req.params.slug);
    if (!company || company.status !== "active") return res.status(404).json({ message: "Loja não encontrada" });
    const { id, name, slug, phone, logoUrl, bannerUrl, primaryColor, description, socialLinks, plan } = company;
    if (plan === "basic") return res.status(403).json({ message: "Loja não disponível neste plano" });
    res.json({ id, name, slug, phone, logoUrl, bannerUrl, primaryColor, description, socialLinks });
  });
  app.get("/api/store/:slug/products", async (req, res) => {
    const company = await storage.getCompanyBySlug(req.params.slug);
    if (!company || company.status !== "active") return res.status(404).json({ message: "Loja não encontrada" });
    if (company.plan === "basic") return res.status(403).json({ message: "Loja não disponível neste plano" });
    const prods = await storage.getActiveProducts(company.id);
    res.json(prods);
  });
  app.get("/api/store/:slug/products/:productId", async (req, res) => {
    const company = await storage.getCompanyBySlug(req.params.slug);
    if (!company || company.status !== "active") return res.status(404).json({ message: "Loja não encontrada" });
    const product = await storage.getProduct(parseInt(req.params.productId), company.id);
    if (!product || !product.active) return res.status(404).json({ message: "Produto não encontrado" });
    res.json(product);
  });

  // Public checkout
  app.post("/api/store/:slug/checkout", async (req, res) => {
    try {
      const company = await storage.getCompanyBySlug(req.params.slug);
      if (!company || company.status !== "active") return res.status(404).json({ message: "Loja não encontrada" });
      if (company.plan === "basic") return res.status(403).json({ message: "Loja não disponível neste plano" });

      const data = checkoutSchema.parse(req.body);
      let client = await storage.getClientByPhone(data.phone, company.id);
      if (!client) {
        client = await storage.createClient({ companyId: company.id, name: data.name, phone: data.phone, email: data.email || null, address: data.address || null });
      }

      let totalValue = 0;
      const itemsWithPrices = [];
      for (const item of data.items) {
        const product = await storage.getProduct(item.productId, company.id);
        if (!product || !product.active) return res.status(400).json({ message: `Produto ${item.productId} não encontrado` });
        const price = parseFloat(product.price);
        totalValue += price * item.quantity;
        itemsWithPrices.push({ ...item, unitPrice: product.price, productName: product.name });
      }

      const nextNum = await storage.getNextOrderNumber(company.id);
      const code = `FDJ-${new Date().getFullYear()}-${String(nextNum).padStart(4, "0")}`;
      const desc = itemsWithPrices.map(i => `${i.quantity}x ${i.productName}${i.variation ? ` (${i.variation})` : ""}`).join(", ");

      const order = await storage.createOrder({
        companyId: company.id, clientId: client.id, code, status: "received", financialStatus: "pending",
        totalValue: totalValue.toFixed(2), receivedValue: "0", kanbanOrder: 0, description: desc,
        urgent: false, source: "online",
      } as any);

      for (const item of itemsWithPrices) {
        await storage.createOrderItem({ orderId: order.id, productId: item.productId, quantity: item.quantity, unitPrice: item.unitPrice, variation: item.variation || null });
        const product = await storage.getProduct(item.productId, company.id);
        if (product && product.productType === "physical") {
          await storage.adjustStock(item.productId, company.id, -item.quantity);
          await storage.createStockMovement({ productId: item.productId, companyId: company.id, type: "sale", quantity: -item.quantity, reason: `Venda online - Pedido ${code}` });
        }
      }

      await storage.createOrderHistory({ orderId: order.id, companyId: company.id, fromStatus: null, toStatus: "received", changedBy: "Loja Online" });
      res.json({ order, code: order.code });
    } catch (err: any) { res.status(400).json({ message: err.message }); }
  });

  // Public order tracking
  app.get("/api/track/:code", async (req, res) => {
    const code = req.params.code.toUpperCase();
    const result = await db.select().from(orders).where(eq(orders.code, code));
    if (result.length === 0) return res.status(404).json({ message: "Pedido não encontrado" });
    const order = result[0];
    const history = await storage.getOrderHistory(order.id, order.companyId);
    const company = await storage.getCompany(order.companyId);
    const client = await storage.getClient(order.clientId, order.companyId);
    res.json({ order, history, companyName: company?.name, clientName: client?.name });
  });

  // Client portal endpoints (public, identified by phone)
  app.get("/api/portal/:slug/auth", async (req, res) => {
    const phone = req.query.phone as string;
    if (!phone) return res.status(400).json({ message: "Telefone é obrigatório" });
    const company = await storage.getCompanyBySlug(req.params.slug);
    if (!company || company.status !== "active") return res.status(404).json({ message: "Empresa não encontrada" });
    const client = await storage.getClientByPhone(phone, company.id);
    if (!client) return res.status(404).json({ message: "Nenhum cadastro encontrado com este telefone" });
    const clientOrders = await storage.getOrdersByClient(client.id, company.id);
    res.json({
      client: { id: client.id, name: client.name, phone: client.phone, email: client.email },
      company: { id: company.id, name: company.name, slug: company.slug, logoUrl: company.logoUrl, primaryColor: company.primaryColor, phone: company.phone },
      orders: clientOrders,
    });
  });

  app.get("/api/portal/:slug/orders/:orderId", async (req, res) => {
    const phone = req.query.phone as string;
    if (!phone) return res.status(400).json({ message: "Telefone é obrigatório" });
    const company = await storage.getCompanyBySlug(req.params.slug);
    if (!company || company.status !== "active") return res.status(404).json({ message: "Empresa não encontrada" });
    const client = await storage.getClientByPhone(phone, company.id);
    if (!client) return res.status(404).json({ message: "Cliente não encontrado" });
    const order = await storage.getOrder(parseInt(req.params.orderId), company.id);
    if (!order || order.clientId !== client.id) return res.status(404).json({ message: "Pedido não encontrado" });
    const history = await storage.getOrderHistory(order.id, company.id);
    const items = await storage.getOrderItems(order.id);
    res.json({ order, history, items });
  });

  app.get("/api/portal/:slug/messages", async (req, res) => {
    const phone = req.query.phone as string;
    if (!phone) return res.status(400).json({ message: "Telefone é obrigatório" });
    const company = await storage.getCompanyBySlug(req.params.slug);
    if (!company || company.status !== "active") return res.status(404).json({ message: "Empresa não encontrada" });
    const client = await storage.getClientByPhone(phone, company.id);
    if (!client) return res.status(404).json({ message: "Cliente não encontrado" });
    const msgs = await storage.getMessages(company.id, client.id);
    res.json(msgs);
  });

  app.post("/api/portal/:slug/messages", async (req, res) => {
    try {
      const phone = req.body.phone as string;
      const content = req.body.content as string;
      if (!phone || !content) return res.status(400).json({ message: "Telefone e mensagem são obrigatórios" });
      const company = await storage.getCompanyBySlug(req.params.slug);
      if (!company || company.status !== "active") return res.status(404).json({ message: "Empresa não encontrada" });
      const client = await storage.getClientByPhone(phone, company.id);
      if (!client) return res.status(404).json({ message: "Cliente não encontrado" });
      const msg = await storage.createMessage({ companyId: company.id, clientId: client.id, content, senderType: "client" });
      res.json(msg);
    } catch (err: any) { res.status(400).json({ message: err.message }); }
  });

  return httpServer;
}

