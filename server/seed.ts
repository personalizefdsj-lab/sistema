import { storage } from "./storage";
import { hashPassword } from "./auth";

export async function seedDatabase() {
  const existingAdmin = await storage.getUserByUsername("superadmin");
  if (existingAdmin) return;

  const hashedAdmin = await hashPassword("admin123");
  const hashed123 = await hashPassword("123456");

  await storage.createUser({
    username: "superadmin",
    password: hashedAdmin,
    name: "Super Admin",
    role: "superadmin",
    companyId: null,
  });

  const company1 = await storage.createCompany({
    name: "Arte Digital Studio",
    slug: "arte-digital-studio",
    phone: "11999887766",
    primaryColor: "#3B82F6",
    status: "active",
    plan: "professional",
  });

  const company2 = await storage.createCompany({
    name: "Print Express",
    slug: "print-express",
    phone: "21988776655",
    primaryColor: "#10B981",
    status: "active",
    plan: "basic",
  });

  await storage.createUser({
    username: "maria",
    password: hashed123,
    name: "Maria Silva",
    role: "admin",
    companyId: company1.id,
  });

  await storage.createUser({
    username: "joao",
    password: hashed123,
    name: "João Santos",
    role: "admin",
    companyId: company2.id,
  });

  const c1 = await storage.createClient({ companyId: company1.id, name: "Carlos Oliveira", phone: "11987654321", email: "carlos@email.com" });
  const c2 = await storage.createClient({ companyId: company1.id, name: "Ana Souza", phone: "11976543210", email: "ana@email.com" });
  const c3 = await storage.createClient({ companyId: company1.id, name: "Roberto Lima", phone: "11965432109", email: "roberto@email.com" });
  const c4 = await storage.createClient({ companyId: company1.id, name: "Fernanda Costa", phone: "11954321098", email: "fernanda@email.com" });

  const seedOrders = [
    { companyId: company1.id, clientId: c1.id, code: "FDJ-2026-0001", status: "production", urgent: false, description: "Banner 3x2m para evento corporativo", totalValue: "450.00", receivedValue: "200.00", financialStatus: "partial", kanbanOrder: 0 },
    { companyId: company1.id, clientId: c2.id, code: "FDJ-2026-0002", status: "design", urgent: true, description: "Logo redesign + cartão de visita", totalValue: "800.00", receivedValue: "0", financialStatus: "pending", kanbanOrder: 0 },
    { companyId: company1.id, clientId: c3.id, code: "FDJ-2026-0003", status: "received", urgent: false, description: "Adesivos personalizados 500un", totalValue: "350.00", receivedValue: "350.00", financialStatus: "paid", kanbanOrder: 0 },
    { companyId: company1.id, clientId: c1.id, code: "FDJ-2026-0004", status: "packaging", urgent: false, description: "Flyers A5 frente e verso 1000un", totalValue: "280.00", receivedValue: "140.00", financialStatus: "partial", kanbanOrder: 0 },
    { companyId: company1.id, clientId: c4.id, code: "FDJ-2026-0005", status: "finished", urgent: false, description: "Cardápio plastificado restaurante", totalValue: "600.00", receivedValue: "600.00", financialStatus: "paid", kanbanOrder: 0 },
    { companyId: company1.id, clientId: c2.id, code: "FDJ-2026-0006", status: "waiting_client", urgent: true, description: "Identidade visual completa", totalValue: "2500.00", receivedValue: "1000.00", financialStatus: "partial", kanbanOrder: 0 },
    { companyId: company1.id, clientId: c3.id, code: "FDJ-2026-0007", status: "sent", urgent: false, description: "Camisetas personalizadas 50un", totalValue: "1200.00", receivedValue: "1200.00", financialStatus: "paid", kanbanOrder: 0 },
  ];

  for (const o of seedOrders) {
    const order = await storage.createOrder(o as any);
    await storage.createOrderHistory({
      orderId: order.id,
      companyId: company1.id,
      fromStatus: null,
      toStatus: "received",
      changedBy: "Maria Silva",
    });
    if (o.status !== "received") {
      await storage.createOrderHistory({
        orderId: order.id,
        companyId: company1.id,
        fromStatus: "received",
        toStatus: o.status,
        changedBy: "Maria Silva",
      });
    }
  }

  await storage.createMessage({ companyId: company1.id, clientId: c1.id, content: "Olá! Gostaria de saber o status do meu pedido.", senderType: "client", read: false });
  await storage.createMessage({ companyId: company1.id, clientId: c1.id, content: "Seu pedido está em produção! Previsão de entrega para sexta-feira.", senderType: "company", read: true });
  await storage.createMessage({ companyId: company1.id, clientId: c2.id, content: "Preciso de uma alteração no layout do cartão de visita.", senderType: "client", read: false });

  console.log("Database seeded successfully");
}
