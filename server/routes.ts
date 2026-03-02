import type { Express } from "express";
import { type Server } from "http";
import passport from "passport";
import { z } from "zod";
import { storage } from "./storage";
import { setupAuth, requireAuth, requireSuperAdmin, hashPassword } from "./auth";
import { registerCompanySchema, ORDER_STATUSES } from "@shared/schema";

const createClientSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().nullable().optional(),
});

const updateClientSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  email: z.string().email().nullable().optional(),
});

const createOrderSchema = z.object({
  clientId: z.number().int().positive(),
  description: z.string().optional().nullable(),
  urgent: z.boolean().optional().default(false),
  totalValue: z.string().optional().default("0"),
  deliveryDate: z.string().optional().nullable(),
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
});

const sendMessageSchema = z.object({
  clientId: z.number().int().positive(),
  content: z.string().min(1),
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
      req.logIn(user, (err) => {
        if (err) return next(err);
        return res.json(user);
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

      const company = await storage.createCompany({
        name: data.companyName,
        slug,
        phone: data.companyPhone || null,
      });

      const user = await storage.createUser({
        username: data.adminUsername,
        password: hashedPassword,
        name: data.adminName,
        role: "admin",
        companyId: company.id,
      });

      req.logIn({
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        companyId: user.companyId,
      }, (err) => {
        if (err) return res.status(500).json({ message: "Falha ao fazer login" });
        return res.json({
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          companyId: user.companyId,
        });
      });
    } catch (err: any) {
      return res.status(400).json({ message: err.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout(() => res.json({ success: true }));
  });

  app.get("/api/auth/me", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    return res.json(req.user);
  });

  app.get("/api/admin/companies", requireSuperAdmin, async (_req, res) => {
    const all = await storage.getAllCompanies();
    res.json(all);
  });

  app.patch("/api/admin/companies/:id", requireSuperAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const allowed = z.object({
      status: z.enum(["active", "suspended"]).optional(),
      plan: z.enum(["basic", "professional", "premium"]).optional(),
    }).parse(req.body);
    const updated = await storage.updateCompany(id, allowed);
    if (!updated) return res.status(404).json({ message: "Não encontrado" });
    res.json(updated);
  });

  app.delete("/api/admin/companies/:id", requireSuperAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deleteCompany(id);
    res.json({ success: true });
  });

  app.get("/api/clients", requireAuth, async (req, res) => {
    const companyId = req.user!.companyId!;
    const search = req.query.search as string;
    if (search) {
      const results = await storage.searchClients(companyId, search);
      return res.json(results);
    }
    const all = await storage.getClients(companyId);
    res.json(all);
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
      const existing = await storage.getClientByPhone(data.phone, companyId);
      if (existing) return res.status(400).json({ message: "Cliente com este telefone já existe" });
      const client = await storage.createClient({ ...data, companyId });
      res.json(client);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/clients/:id", requireAuth, async (req, res) => {
    try {
      const data = updateClientSchema.parse(req.body);
      const updated = await storage.updateClient(parseInt(req.params.id), req.user!.companyId!, data);
      if (!updated) return res.status(404).json({ message: "Não encontrado" });
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.get("/api/orders", requireAuth, async (req, res) => {
    const all = await storage.getOrders(req.user!.companyId!);
    res.json(all);
  });

  app.get("/api/orders/:id", requireAuth, async (req, res) => {
    const order = await storage.getOrder(parseInt(req.params.id), req.user!.companyId!);
    if (!order) return res.status(404).json({ message: "Não encontrado" });
    res.json(order);
  });

  app.get("/api/orders/client/:clientId", requireAuth, async (req, res) => {
    const ordersList = await storage.getOrdersByClient(parseInt(req.params.clientId), req.user!.companyId!);
    res.json(ordersList);
  });

  app.post("/api/orders", requireAuth, async (req, res) => {
    try {
      const companyId = req.user!.companyId!;
      const data = createOrderSchema.parse(req.body);
      const nextNum = await storage.getNextOrderNumber(companyId);
      const year = new Date().getFullYear();
      const code = `FDJ-${year}-${String(nextNum).padStart(4, "0")}`;

      const order = await storage.createOrder({
        ...data,
        companyId,
        code,
        status: "received",
        financialStatus: "pending",
        receivedValue: "0",
        kanbanOrder: 0,
        deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : null,
      } as any);

      await storage.createOrderHistory({
        orderId: order.id,
        companyId,
        fromStatus: null,
        toStatus: "received",
        changedBy: req.user!.name,
      });

      res.json(order);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/orders/:id", requireAuth, async (req, res) => {
    try {
      const companyId = req.user!.companyId!;
      const orderId = parseInt(req.params.id);
      const data = updateOrderSchema.parse(req.body);
      const existing = await storage.getOrder(orderId, companyId);
      if (!existing) return res.status(404).json({ message: "Não encontrado" });

      if (data.status && data.status !== existing.status) {
        await storage.createOrderHistory({
          orderId,
          companyId,
          fromStatus: existing.status,
          toStatus: data.status,
          changedBy: req.user!.name,
        });
      }

      if (data.receivedValue !== undefined || data.totalValue !== undefined) {
        const total = parseFloat(data.totalValue ?? existing.totalValue ?? "0");
        const received = parseFloat(data.receivedValue ?? existing.receivedValue ?? "0");
        if (received >= total && total > 0) {
          data.financialStatus = "paid";
        } else if (received > 0) {
          data.financialStatus = "partial";
        } else {
          data.financialStatus = "pending";
        }
      }

      const updated = await storage.updateOrder(orderId, companyId, data as any);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.get("/api/orders/:id/history", requireAuth, async (req, res) => {
    const history = await storage.getOrderHistory(parseInt(req.params.id), req.user!.companyId!);
    res.json(history);
  });

  app.get("/api/messages/:clientId", requireAuth, async (req, res) => {
    const msgs = await storage.getMessages(req.user!.companyId!, parseInt(req.params.clientId));
    res.json(msgs);
  });

  app.get("/api/conversations", requireAuth, async (req, res) => {
    const convos = await storage.getConversations(req.user!.companyId!);
    res.json(convos);
  });

  app.post("/api/messages", requireAuth, async (req, res) => {
    try {
      const data = sendMessageSchema.parse(req.body);
      const msg = await storage.createMessage({
        ...data,
        companyId: req.user!.companyId!,
        senderType: "company",
      });
      res.json(msg);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.post("/api/messages/:clientId/read", requireAuth, async (req, res) => {
    await storage.markMessagesRead(req.user!.companyId!, parseInt(req.params.clientId));
    res.json({ success: true });
  });

  app.get("/api/dashboard", requireAuth, async (req, res) => {
    const stats = await storage.getDashboardStats(req.user!.companyId!);
    res.json(stats);
  });

  app.get("/api/company", requireAuth, async (req, res) => {
    const company = await storage.getCompany(req.user!.companyId!);
    if (!company) return res.status(404).json({ message: "Não encontrado" });
    res.json(company);
  });

  return httpServer;
}
