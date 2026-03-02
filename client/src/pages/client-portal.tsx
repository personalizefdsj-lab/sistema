import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Phone, Package, ArrowLeft, Clock, CheckCircle2, Truck,
  MessageSquare, Send, ArrowRight, Store as StoreIcon, ShoppingBag
} from "lucide-react";
import { ORDER_STATUS_LABELS, FINANCIAL_STATUS_LABELS } from "@shared/schema";
import type { Order, Message } from "@shared/schema";

const STATUS_ICONS: Record<string, any> = {
  received: Clock,
  design: Package,
  production: Package,
  packaging: Package,
  sent: Truck,
  finished: CheckCircle2,
  waiting_client: Clock,
};

const statusColors: Record<string, string> = {
  received: "bg-blue-100 text-blue-800",
  design: "bg-purple-100 text-purple-800",
  production: "bg-orange-100 text-orange-800",
  packaging: "bg-cyan-100 text-cyan-800",
  sent: "bg-indigo-100 text-indigo-800",
  finished: "bg-emerald-100 text-emerald-800",
  waiting_client: "bg-amber-100 text-amber-800",
};

export default function ClientPortal() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug!;
  const [phone, setPhone] = useState("");
  const [authenticatedPhone, setAuthenticatedPhone] = useState("");
  const [portalData, setPortalData] = useState<any>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("orders");
  const { toast } = useToast();

  const authQuery = useQuery<any>({
    queryKey: ["/api/portal", slug, "auth", authenticatedPhone],
    queryFn: () => fetch(`/api/portal/${slug}/auth?phone=${encodeURIComponent(authenticatedPhone)}`).then(r => {
      if (!r.ok) throw new Error("Nenhum cadastro encontrado com este telefone");
      return r.json();
    }),
    enabled: !!authenticatedPhone,
  });

  useEffect(() => {
    if (authQuery.data) setPortalData(authQuery.data);
  }, [authQuery.data]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setAuthenticatedPhone(phone.trim());
  };

  const handleLogout = () => {
    setAuthenticatedPhone("");
    setPortalData(null);
    setPhone("");
    setSelectedOrderId(null);
    setActiveTab("orders");
  };

  const primaryColor = portalData?.company?.primaryColor || "#3B82F6";

  if (!authenticatedPhone || !portalData) {
    return (
      <LoginScreen
        slug={slug}
        phone={phone}
        setPhone={setPhone}
        onSubmit={handleLogin}
        isLoading={authQuery.isLoading}
        error={authQuery.error ? "Nenhum cadastro encontrado com este telefone. Verifique o número e tente novamente." : undefined}
      />
    );
  }

  if (selectedOrderId) {
    return (
      <OrderDetailView
        slug={slug}
        phone={authenticatedPhone}
        orderId={selectedOrderId}
        primaryColor={primaryColor}
        companyName={portalData.company.name}
        onBack={() => setSelectedOrderId(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 bg-background z-40">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {portalData.company.logoUrl ? (
              <img src={portalData.company.logoUrl} alt={portalData.company.name} className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
                <StoreIcon className="w-4 h-4 text-white" />
              </div>
            )}
            <div>
              <p className="font-semibold text-sm" data-testid="text-portal-company">{portalData.company.name}</p>
              <p className="text-xs text-muted-foreground">Olá, {portalData.client.name}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} data-testid="button-portal-logout">
            Sair
          </Button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="orders" data-testid="tab-orders">
              <ShoppingBag className="w-4 h-4 mr-2" /> Meus Pedidos
            </TabsTrigger>
            <TabsTrigger value="messages" data-testid="tab-messages">
              <MessageSquare className="w-4 h-4 mr-2" /> Mensagens
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="mt-4">
            <OrdersList
              orders={portalData.orders}
              primaryColor={primaryColor}
              onSelect={setSelectedOrderId}
            />
          </TabsContent>

          <TabsContent value="messages" className="mt-4">
            <ChatView
              slug={slug}
              phone={authenticatedPhone}
              clientName={portalData.client.name}
              primaryColor={primaryColor}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function LoginScreen({ slug, phone, setPhone, onSubmit, isLoading, error }: {
  slug: string; phone: string; setPhone: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void; isLoading: boolean; error?: string;
}) {
  const { data: storeInfo } = useQuery<any>({
    queryKey: ["/api/store", slug],
    queryFn: () => fetch(`/api/store/${slug}`).then(r => r.ok ? r.json() : null),
  });

  const primaryColor = storeInfo?.primaryColor || "#3B82F6";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="pt-8 space-y-6">
          <div className="text-center">
            {storeInfo?.logoUrl ? (
              <img src={storeInfo.logoUrl} alt={storeInfo.name} className="w-16 h-16 rounded-full object-cover mx-auto mb-3" />
            ) : (
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: primaryColor }}>
                <StoreIcon className="w-8 h-8 text-white" />
              </div>
            )}
            <h1 className="text-xl font-bold" data-testid="text-portal-title">{storeInfo?.name || "Portal do Cliente"}</h1>
            <p className="text-sm text-muted-foreground mt-1">Acompanhe seus pedidos e entre em contato</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  data-testid="input-portal-phone"
                  placeholder="Seu número de telefone"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="pl-9 h-12 text-base"
                  type="tel"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive text-center" data-testid="text-portal-error">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full h-11"
              style={{ backgroundColor: primaryColor }}
              disabled={isLoading || !phone.trim()}
              data-testid="button-portal-login"
            >
              {isLoading ? "Buscando..." : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function OrdersList({ orders, primaryColor, onSelect }: {
  orders: Order[]; primaryColor: string; onSelect: (id: number) => void;
}) {
  if (orders.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>Você ainda não tem pedidos</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map(order => (
        <Card
          key={order.id}
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onSelect(order.id)}
          data-testid={`portal-order-${order.id}`}
        >
          <CardContent className="py-4 px-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm font-semibold" data-testid={`text-portal-order-code-${order.id}`}>
                    {order.code}
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusColors[order.status] || "bg-gray-100 text-gray-800"}`}>
                    {ORDER_STATUS_LABELS[order.status] || order.status}
                  </span>
                </div>
                {order.description && (
                  <p className="text-sm text-muted-foreground mt-1 truncate">{order.description}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(order.createdAt).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-semibold" style={{ color: primaryColor }}>
                  R$ {parseFloat(order.totalValue || "0").toFixed(2)}
                </p>
                <Badge variant={order.financialStatus === "paid" ? "default" : "secondary"} className="text-xs mt-1">
                  {FINANCIAL_STATUS_LABELS[order.financialStatus] || order.financialStatus}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function OrderDetailView({ slug, phone, orderId, primaryColor, companyName, onBack }: {
  slug: string; phone: string; orderId: number; primaryColor: string; companyName: string; onBack: () => void;
}) {
  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/portal", slug, "orders", orderId, phone],
    queryFn: () => fetch(`/api/portal/${slug}/orders/${orderId}?phone=${encodeURIComponent(phone)}`).then(r => {
      if (!r.ok) throw new Error("Pedido não encontrado");
      return r.json();
    }),
  });

  if (isLoading) return <div className="p-6 text-center">Carregando...</div>;
  if (!data) return <div className="p-6 text-center text-destructive">Pedido não encontrado</div>;

  const { order, history, items } = data;
  const sortedHistory = [...(history || [])].sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 bg-background z-40">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-back-order-detail">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <p className="font-semibold text-sm">{order.code}</p>
            <p className="text-xs text-muted-foreground">{companyName}</p>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg" data-testid="text-portal-order-detail-code">{order.code}</CardTitle>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${statusColors[order.status] || ""}`}>
                {ORDER_STATUS_LABELS[order.status] || order.status}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Valor Total</p>
                <p className="font-semibold" style={{ color: primaryColor }}>R$ {parseFloat(order.totalValue || "0").toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status Financeiro</p>
                <Badge variant={order.financialStatus === "paid" ? "default" : "secondary"}>
                  {FINANCIAL_STATUS_LABELS[order.financialStatus] || order.financialStatus}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground">Criado em</p>
                <p className="font-medium">{new Date(order.createdAt).toLocaleDateString("pt-BR")}</p>
              </div>
              {order.deliveryDate && (
                <div>
                  <p className="text-muted-foreground">Previsão de Entrega</p>
                  <p className="font-medium">{new Date(order.deliveryDate).toLocaleDateString("pt-BR")}</p>
                </div>
              )}
            </div>
            {order.description && (
              <div>
                <p className="text-sm text-muted-foreground">Descrição</p>
                <p className="text-sm font-medium">{order.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {items && items.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Itens do Pedido</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {items.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{item.quantity}x</p>
                      {item.variation && <p className="text-xs text-muted-foreground">{item.variation}</p>}
                    </div>
                    <p className="text-sm font-medium">R$ {(parseFloat(item.unitPrice) * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-base">Progresso do Pedido</CardTitle></CardHeader>
          <CardContent>
            {sortedHistory.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Sem histórico disponível</p>
            ) : (
              <div className="space-y-4">
                {sortedHistory.map((entry: any, idx: number) => {
                  const Icon = STATUS_ICONS[entry.toStatus] || Package;
                  const isLast = idx === sortedHistory.length - 1;
                  return (
                    <div key={entry.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                          style={{ backgroundColor: isLast ? primaryColor : "#e5e7eb" }}
                        >
                          <Icon className={`w-4 h-4 ${isLast ? "" : "text-gray-500"}`} />
                        </div>
                        {idx < sortedHistory.length - 1 && <div className="w-0.5 flex-1 bg-border mt-1" />}
                      </div>
                      <div className="pb-4">
                        <p className="font-medium text-sm">{ORDER_STATUS_LABELS[entry.toStatus] || entry.toStatus}</p>
                        {entry.fromStatus && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            {ORDER_STATUS_LABELS[entry.fromStatus] || entry.fromStatus} <ArrowRight className="w-3 h-3" /> {ORDER_STATUS_LABELS[entry.toStatus] || entry.toStatus}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">{new Date(entry.createdAt).toLocaleString("pt-BR")}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ChatView({ slug, phone, clientName, primaryColor }: {
  slug: string; phone: string; clientName: string; primaryColor: string;
}) {
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ["/api/portal", slug, "messages", phone],
    queryFn: () => fetch(`/api/portal/${slug}/messages?phone=${encodeURIComponent(phone)}`).then(r => r.json()),
    refetchInterval: 5000,
  });

  const sendMutation = useMutation({
    mutationFn: (content: string) => fetch(`/api/portal/${slug}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, content }),
    }).then(r => {
      if (!r.ok) throw new Error("Erro ao enviar mensagem");
      return r.json();
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal", slug, "messages", phone] });
      setMessage("");
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    sendMutation.mutate(message.trim());
  };

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 220px)" }}>
      <div className="flex-1 overflow-y-auto space-y-3 p-3 bg-muted/30 rounded-lg">
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Carregando mensagens...</p>
        ) : messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhuma mensagem ainda</p>
            <p className="text-xs mt-1">Envie uma mensagem para iniciar a conversa</p>
          </div>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={`flex ${msg.senderType === "client" ? "justify-end" : "justify-start"}`}
              data-testid={`portal-message-${msg.id}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  msg.senderType === "client"
                    ? "text-white"
                    : "bg-white border"
                }`}
                style={msg.senderType === "client" ? { backgroundColor: primaryColor } : undefined}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                <p className={`text-[10px] mt-1 ${msg.senderType === "client" ? "text-white/70" : "text-muted-foreground"}`}>
                  {new Date(msg.createdAt).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="flex gap-2 mt-3">
        <Input
          data-testid="input-portal-message"
          placeholder="Digite sua mensagem..."
          value={message}
          onChange={e => setMessage(e.target.value)}
          className="flex-1"
        />
        <Button
          type="submit"
          disabled={!message.trim() || sendMutation.isPending}
          style={{ backgroundColor: primaryColor }}
          data-testid="button-portal-send"
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}
