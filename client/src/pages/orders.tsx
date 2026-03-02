import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ORDER_STATUSES, ORDER_STATUS_LABELS, FINANCIAL_STATUS_LABELS } from "@shared/schema";
import type { Order, Client } from "@shared/schema";
import {
  Plus, Search, AlertTriangle, List, Columns3, Calendar,
  ChevronRight, DollarSign, Clock, Phone, GripVertical, ClipboardList
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import OrderDetail from "@/components/order-detail";

const statusColors: Record<string, string> = {
  received: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  design: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  production: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  packaging: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
  sent: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  finished: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  waiting_client: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
};

const financialColors: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  partial: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  pending: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

export default function OrdersPage() {
  const { toast } = useToast();
  const [view, setView] = useState<"list" | "kanban">("list");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<number | null>(null);

  const { data: orders = [], isLoading } = useQuery<Order[]>({ queryKey: ["/api/orders"] });
  const { data: clients = [] } = useQuery<Client[]>({ queryKey: ["/api/clients"] });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/orders", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setCreateOpen(false);
      toast({ title: "Pedido criado com sucesso" });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/orders/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    },
  });

  const filteredOrders = orders.filter(o => {
    const matchesSearch = search === "" ||
      o.code.toLowerCase().includes(search.toLowerCase()) ||
      clients.find(c => c.id === o.clientId)?.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    createMutation.mutate({
      clientId: parseInt(form.get("clientId") as string),
      description: form.get("description"),
      urgent: form.get("urgent") === "on",
      totalValue: form.get("totalValue") || "0",
      receivedValue: "0",
      deliveryDate: form.get("deliveryDate") || null,
    });
  };

  const getClientName = (clientId: number) =>
    clients.find(c => c.id === clientId)?.name || "—";

  const getClientPhone = (clientId: number) =>
    clients.find(c => c.id === clientId)?.phone || "";

  const sendWhatsApp = (order: Order) => {
    const client = clients.find(c => c.id === order.clientId);
    if (!client) return;
    const phone = client.phone.replace(/\D/g, "");
    const msg = encodeURIComponent(
      `Olá ${client.name}!\n\nSeu pedido *${order.code}*\nStatus: ${ORDER_STATUS_LABELS[order.status]}\nData de Entrada: ${format(new Date(order.createdAt), "dd/MM/yyyy HH:mm")}\n\nObrigado pela preferência!`
    );
    window.open(`https://wa.me/55${phone}?text=${msg}`, "_blank");
  };

  if (selectedOrder) {
    return (
      <OrderDetail
        orderId={selectedOrder}
        onBack={() => setSelectedOrder(null)}
        clients={clients}
      />
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="orders-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Pedidos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {orders.length} pedido{orders.length !== 1 ? "s" : ""} no total
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-order">
              <Plus className="w-4 h-4 mr-2" />
              Novo Pedido
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Criar Novo Pedido</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select name="clientId" required>
                  <SelectTrigger data-testid="select-client">
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea name="description" data-testid="input-order-description" />
              </div>
              <div className="space-y-2">
                <Label>Valor Total (R$)</Label>
                <Input name="totalValue" type="number" step="0.01" min="0" data-testid="input-order-value" />
              </div>
              <div className="space-y-2">
                <Label>Previsão de Entrega</Label>
                <Input name="deliveryDate" type="date" data-testid="input-delivery-date" />
              </div>
              <div className="flex items-center gap-2">
                <Switch name="urgent" id="urgent" data-testid="switch-urgent" />
                <Label htmlFor="urgent">Pedido Urgente</Label>
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-create-order">
                {createMutation.isPending ? "Criando..." : "Criar Pedido"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código ou cliente..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
            data-testid="input-search-orders"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48" data-testid="select-filter-status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            {ORDER_STATUSES.map(s => (
              <SelectItem key={s} value={s}>{ORDER_STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex border rounded-md">
          <Button
            variant={view === "list" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setView("list")}
            data-testid="button-view-list"
          >
            <List className="w-4 h-4" />
          </Button>
          <Button
            variant={view === "kanban" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setView("kanban")}
            data-testid="button-view-kanban"
          >
            <Columns3 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : view === "list" ? (
        <ListView
          orders={filteredOrders}
          getClientName={getClientName}
          onSelect={setSelectedOrder}
          sendWhatsApp={sendWhatsApp}
        />
      ) : (
        <KanbanView
          orders={filteredOrders}
          getClientName={getClientName}
          onSelect={setSelectedOrder}
          onStatusChange={(id, status) => updateStatusMutation.mutate({ id, status })}
        />
      )}
    </div>
  );
}

function ListView({
  orders,
  getClientName,
  onSelect,
  sendWhatsApp,
}: {
  orders: Order[];
  getClientName: (id: number) => string;
  onSelect: (id: number) => void;
  sendWhatsApp: (o: Order) => void;
}) {
  if (orders.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground" data-testid="text-no-orders">
        <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>Nenhum pedido encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-2" data-testid="orders-list-view">
      {orders.map(order => (
        <Card
          key={order.id}
          className={`cursor-pointer transition-all hover-elevate ${order.urgent ? "ring-2 ring-amber-400 dark:ring-amber-600" : ""}`}
          onClick={() => onSelect(order.id)}
          data-testid={`card-order-${order.id}`}
        >
          <CardContent className="py-4 px-5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4 min-w-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-semibold" data-testid={`text-order-code-${order.id}`}>
                      {order.code}
                    </span>
                    {order.urgent && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Urgente
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {getClientName(order.clientId)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="text-right text-sm">
                  <p className="text-muted-foreground">
                    <Clock className="w-3 h-3 inline mr-1" />
                    {format(new Date(order.createdAt), "dd/MM/yyyy HH:mm")}
                  </p>
                  <p className="font-medium mt-0.5">
                    R$ {parseFloat(order.totalValue || "0").toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${statusColors[order.status] || ""}`}>
                  {ORDER_STATUS_LABELS[order.status]}
                </span>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${financialColors[order.financialStatus] || ""}`}>
                  {FINANCIAL_STATUS_LABELS[order.financialStatus]}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={(e) => { e.stopPropagation(); sendWhatsApp(order); }}
                  data-testid={`button-whatsapp-${order.id}`}
                >
                  <Phone className="w-4 h-4 text-emerald-600" />
                </Button>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function KanbanView({
  orders,
  getClientName,
  onSelect,
  onStatusChange,
}: {
  orders: Order[];
  getClientName: (id: number) => string;
  onSelect: (id: number) => void;
  onStatusChange: (id: number, status: string) => void;
}) {
  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const orderId = parseInt(e.dataTransfer.getData("orderId"));
    if (!isNaN(orderId)) {
      onStatusChange(orderId, status);
    }
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4" data-testid="orders-kanban-view">
      {ORDER_STATUSES.map(status => {
        const statusOrders = orders.filter(o => o.status === status);
        return (
          <div
            key={status}
            className="flex-shrink-0 w-72"
            onDragOver={e => e.preventDefault()}
            onDrop={e => handleDrop(e, status)}
          >
            <div className="flex items-center justify-between gap-1 mb-3 px-1">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusColors[status]}`}>
                  {ORDER_STATUS_LABELS[status]}
                </span>
              </div>
              <Badge variant="secondary">{statusOrders.length}</Badge>
            </div>
            <div className="space-y-2 min-h-[200px] bg-muted/30 rounded-md p-2">
              {statusOrders.map(order => (
                <Card
                  key={order.id}
                  draggable
                  onDragStart={e => e.dataTransfer.setData("orderId", String(order.id))}
                  onClick={() => onSelect(order.id)}
                  className={`cursor-grab active:cursor-grabbing hover-elevate ${order.urgent ? "ring-2 ring-amber-400 dark:ring-amber-600" : ""}`}
                  data-testid={`kanban-card-${order.id}`}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-1 mb-2">
                      <span className="font-mono text-xs font-semibold">{order.code}</span>
                      {order.urgent && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                    </div>
                    <p className="text-sm font-medium truncate">{getClientName(order.clientId)}</p>
                    <p className="text-xs text-muted-foreground mt-1 truncate">{order.description}</p>
                    <div className="flex items-center justify-between gap-1 mt-2 pt-2 border-t">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(order.createdAt), "dd/MM")}
                      </span>
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${financialColors[order.financialStatus]}`}>
                        <DollarSign className="w-2.5 h-2.5 mr-0.5" />
                        {FINANCIAL_STATUS_LABELS[order.financialStatus]}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
