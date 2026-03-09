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
import type { Order, Client, Product } from "@shared/schema";
import {
  Plus, Search, AlertTriangle, List, Columns3, Calendar,
  ChevronRight, DollarSign, Clock, Phone, GripVertical, ClipboardList,
  UserPlus, Trash2, Minus, ShoppingBag, FileText
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

type OrderItemDraft = {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: string;
  variation?: string;
};

function isOrderLate(order: Order): boolean {
  if (order.status === "finished") return false;
  if (!order.deliveryDate) return false;
  return new Date(order.deliveryDate) < new Date();
}

export default function OrdersPage() {
  const { toast } = useToast();
  const [view, setView] = useState<"list" | "kanban">("list");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeTab, setTypeTab] = useState<"order" | "quotation">("order");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<number | null>(null);

  const { data: orders = [], isLoading } = useQuery<Order[]>({ queryKey: ["/api/orders"] });
  const { data: clients = [] } = useQuery<Client[]>({ queryKey: ["/api/clients"] });

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

  const deleteOrderMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/orders/${id}`);
      return id;
    },
    onSuccess: (deletedId) => {
      setSelectedOrder(null);
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.removeQueries({ queryKey: ["/api/orders", deletedId] });
      toast({ title: "Pedido excluído com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao excluir pedido", variant: "destructive" });
    },
  });

  const filteredOrders = orders.filter(o => {
    const matchesType = (o.type || "order") === typeTab;
    const matchesSearch = search === "" ||
      o.code.toLowerCase().includes(search.toLowerCase()) ||
      clients.find(c => c.id === o.clientId)?.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || o.status === statusFilter;
    return matchesType && matchesSearch && matchesStatus;
  });

  const orderCount = orders.filter(o => (o.type || "order") === "order").length;
  const quotationCount = orders.filter(o => o.type === "quotation").length;

  const getClientName = (clientId: number) =>
    clients.find(c => c.id === clientId)?.name || "—";

  const getClientPhone = (clientId: number) =>
    clients.find(c => c.id === clientId)?.phone || "";

  const sendWhatsApp = (order: Order) => {
    const client = clients.find(c => c.id === order.clientId);
    if (!client || !client.phone) return;
    const phone = client.phone.replace(/\D/g, "");
    const typeLabel = order.type === "quotation" ? "orçamento" : "pedido";
    const msg = encodeURIComponent(
      `Olá ${client.name}!\n\nSeu ${typeLabel} *${order.code}*\nStatus: ${ORDER_STATUS_LABELS[order.status]}\nData de Entrada: ${format(new Date(order.createdAt), "dd/MM/yyyy HH:mm")}\n\nObrigado pela preferência!`
    );
    window.open(`https://wa.me/55${phone}?text=${msg}`, "_blank");
  };

  if (selectedOrder) {
    return (
      <OrderDetail
        orderId={selectedOrder}
        onBack={() => setSelectedOrder(null)}
        clients={clients}
        onDelete={(id: number) => deleteOrderMutation.mutate(id)}
        isDeleting={deleteOrderMutation.isPending}
      />
    );
  }

  const isQuotation = typeTab === "quotation";
  const typeLabel = isQuotation ? "Orçamento" : "Pedido";
  const typeLabelPlural = isQuotation ? "Orçamentos" : "Pedidos";

  return (
    <div className="p-6 space-y-6" data-testid="orders-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">{typeLabelPlural}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filteredOrders.length} {typeLabelPlural.toLowerCase()} encontrado{filteredOrders.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button data-testid="button-new-order" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo {typeLabel}
        </Button>
      </div>

      <Tabs value={typeTab} onValueChange={(v) => setTypeTab(v as any)}>
        <TabsList data-testid="tabs-order-type">
          <TabsTrigger value="order" data-testid="tab-orders">
            <ClipboardList className="w-4 h-4 mr-1" />
            Pedidos
            <Badge variant="secondary" className="ml-1.5 text-xs">{orderCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="quotation" data-testid="tab-quotations">
            <FileText className="w-4 h-4 mr-1" />
            Orçamentos
            <Badge variant="secondary" className="ml-1.5 text-xs">{quotationCount}</Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

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
          onDelete={(id: number) => deleteOrderMutation.mutate(id)}
        />
      ) : (
        <KanbanView
          orders={filteredOrders}
          getClientName={getClientName}
          onSelect={setSelectedOrder}
          onStatusChange={(id, status) => updateStatusMutation.mutate({ id, status })}
        />
      )}

      <CreateOrderDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        clients={clients}
        defaultType={typeTab}
      />
    </div>
  );
}

function CreateOrderDialog({ open, onOpenChange, clients, defaultType }: { open: boolean; onOpenChange: (v: boolean) => void; clients: Client[]; defaultType: string }) {
  const { toast } = useToast();
  const [clientMode, setClientMode] = useState<"existing" | "new">("existing");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [newClient, setNewClient] = useState({ name: "", phone: "", email: "" });
  const [description, setDescription] = useState("");
  const [totalValue, setTotalValue] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [orderType, setOrderType] = useState(defaultType);
  const [orderItems, setOrderItems] = useState<OrderItemDraft[]>([]);
  const [showProductPicker, setShowProductPicker] = useState(false);

  const { data: products = [] } = useQuery<Product[]>({ queryKey: ["/api/products"] });
  const activeProducts = products.filter(p => p.active !== false);

  const [customTotal, setCustomTotal] = useState("");
  const itemsTotal = orderItems.reduce((sum, item) => sum + parseFloat(item.unitPrice) * item.quantity, 0);
  const effectiveTotal = customTotal ? customTotal : (orderItems.length > 0 ? itemsTotal.toFixed(2) : totalValue);

  const createClientMutation = useMutation({
    mutationFn: async (data: { name: string; phone: string; email?: string }) => {
      const res = await apiRequest("POST", "/api/clients", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/orders", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      onOpenChange(false);
      resetForm();
      const label = orderType === "quotation" ? "Orçamento" : "Pedido";
      toast({ title: `${label} criado com sucesso` });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setClientMode("existing");
    setSelectedClientId("");
    setNewClient({ name: "", phone: "", email: "" });
    setDescription("");
    setTotalValue("");
    setDeliveryDate("");
    setUrgent(false);
    setOrderItems([]);
    setCustomTotal("");
    setOrderType(defaultType);
  };

  const getProductFamily = (product: Product) => product.parentId || product.id;

  const recalcPrices = (items: OrderItemDraft[]) => {
    return items.map(item => {
      const product = products.find(p => p.id === item.productId);
      if (!product) return item;
      const familyId = getProductFamily(product);
      let familyTotal = 0;
      for (const i of items) {
        const ip = products.find(p => p.id === i.productId);
        if (ip && getProductFamily(ip) === familyId) familyTotal += i.quantity;
      }
      const useWholesale = product.wholesalePrice && product.wholesaleMinQty && familyTotal >= product.wholesaleMinQty;
      const newPrice = useWholesale ? product.wholesalePrice : product.price;
      return { ...item, unitPrice: newPrice };
    });
  };

  const addProduct = (product: Product) => {
    setOrderItems(prev => {
      const existing = prev.find(i => i.productId === product.id);
      let updated: OrderItemDraft[];
      if (existing) {
        updated = prev.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      } else {
        updated = [...prev, { productId: product.id, productName: product.name, quantity: 1, unitPrice: product.price }];
      }
      return recalcPrices(updated);
    });
    setShowProductPicker(false);
  };

  const updateItemQuantity = (productId: number, delta: number) => {
    setOrderItems(prev => {
      const updated = prev.map(i => {
        if (i.productId === productId) {
          const newQty = i.quantity + delta;
          return newQty > 0 ? { ...i, quantity: newQty } : i;
        }
        return i;
      });
      return recalcPrices(updated);
    });
  };

  const removeItem = (productId: number) => {
    setOrderItems(prev => recalcPrices(prev.filter(i => i.productId !== productId)));
  };

  const handleSubmit = async () => {
    try {
      let clientId: number;

      if (clientMode === "new") {
        if (!newClient.name) {
          toast({ title: "Preencha o nome do cliente", variant: "destructive" });
          return;
        }
        const created = await createClientMutation.mutateAsync({
          name: newClient.name,
          phone: newClient.phone || undefined,
          email: newClient.email || undefined,
        } as any);
        clientId = created.id;
      } else {
        if (!selectedClientId) {
          toast({ title: "Selecione um cliente", variant: "destructive" });
          return;
        }
        clientId = parseInt(selectedClientId);
      }

      createOrderMutation.mutate({
        clientId,
        description: description || null,
        urgent,
        totalValue: effectiveTotal || "0",
        deliveryDate: deliveryDate || null,
        type: orderType,
        items: orderItems.length > 0 ? orderItems.map(i => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          variation: null,
        })) : undefined,
      });
    } catch (err: any) {
      toast({ title: "Erro ao criar cliente", description: err.message, variant: "destructive" });
    }
  };

  const isPending = createClientMutation.isPending || createOrderMutation.isPending;
  const isQuotation = orderType === "quotation";
  const typeLabel = isQuotation ? "Orçamento" : "Pedido";

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Novo {typeLabel}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={orderType} onValueChange={setOrderType}>
              <SelectTrigger data-testid="select-order-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="order">Pedido</SelectItem>
                <SelectItem value="quotation">Orçamento</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Cliente</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setClientMode(clientMode === "existing" ? "new" : "existing")}
                data-testid="button-toggle-client-mode"
              >
                {clientMode === "existing" ? (
                  <><UserPlus className="w-4 h-4 mr-1" /> Novo Cliente</>
                ) : (
                  <><Search className="w-4 h-4 mr-1" /> Cliente Existente</>
                )}
              </Button>
            </div>

            {clientMode === "existing" ? (
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger data-testid="select-client">
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}{c.phone ? ` — ${c.phone}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="space-y-2 border rounded-lg p-3 bg-muted/30">
                <div>
                  <Label className="text-xs">Nome *</Label>
                  <Input
                    data-testid="input-new-client-name"
                    value={newClient.name}
                    onChange={e => setNewClient(p => ({ ...p, name: e.target.value }))}
                    placeholder="Nome do cliente"
                  />
                </div>
                <div>
                  <Label className="text-xs">Telefone</Label>
                  <Input
                    data-testid="input-new-client-phone"
                    value={newClient.phone}
                    onChange={e => setNewClient(p => ({ ...p, phone: e.target.value }))}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input
                    data-testid="input-new-client-email"
                    type="email"
                    value={newClient.email}
                    onChange={e => setNewClient(p => ({ ...p, email: e.target.value }))}
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Produtos</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowProductPicker(true)}
                data-testid="button-add-product-to-order"
              >
                <Plus className="w-4 h-4 mr-1" /> Adicionar Produto
              </Button>
            </div>

            {orderItems.length > 0 && (
              <div className="space-y-2">
                {orderItems.map(item => {
                  const product = products.find(p => p.id === item.productId);
                  const familyId = product ? getProductFamily(product) : null;
                  let familyTotal = 0;
                  if (familyId) {
                    for (const i of orderItems) {
                      const ip = products.find(p => p.id === i.productId);
                      if (ip && getProductFamily(ip) === familyId) familyTotal += i.quantity;
                    }
                  }
                  const isWholesale = product?.wholesalePrice && product?.wholesaleMinQty && familyTotal >= product.wholesaleMinQty;
                  return (
                    <div key={item.productId} className="flex items-center gap-2 border rounded-lg p-2" data-testid={`order-item-${item.productId}`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.productName}</p>
                        <div className="flex items-center gap-1">
                          <p className="text-xs text-muted-foreground">R$ {parseFloat(item.unitPrice).toFixed(2)} cada</p>
                          {isWholesale && (
                            <Badge variant="secondary" className="text-[10px] px-1 py-0" data-testid={`badge-wholesale-${item.productId}`}>Atacado</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button type="button" size="icon" variant="outline" className="h-7 w-7"
                          data-testid={`button-item-minus-${item.productId}`}
                          onClick={() => updateItemQuantity(item.productId, -1)}>
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <Button type="button" size="icon" variant="outline" className="h-7 w-7"
                          data-testid={`button-item-plus-${item.productId}`}
                          onClick={() => updateItemQuantity(item.productId, 1)}>
                          <Plus className="w-3 h-3" />
                        </Button>
                        <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                          data-testid={`button-item-remove-${item.productId}`}
                          onClick={() => removeItem(item.productId)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                      <p className="text-sm font-semibold w-20 text-right">
                        R$ {(parseFloat(item.unitPrice) * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm font-semibold">Total dos Produtos</span>
                  <span className={`text-sm font-bold ${customTotal ? "line-through text-muted-foreground" : ""}`} data-testid="text-items-total">R$ {itemsTotal.toFixed(2)}</span>
                </div>
              </div>
            )}

            {orderItems.length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhum produto adicionado. Você pode adicionar produtos ou definir o valor manualmente abaixo.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              data-testid="input-order-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Observações do pedido..."
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Valor Total (R$)</Label>
              {orderItems.length > 0 && customTotal && (
                <Button type="button" variant="ghost" size="sm" className="h-6 text-xs"
                  data-testid="button-clear-custom-total"
                  onClick={() => setCustomTotal("")}>
                  Usar valor calculado
                </Button>
              )}
            </div>
            {orderItems.length > 0 ? (
              <Input
                data-testid="input-order-value"
                type="number"
                step="0.01"
                min="0"
                value={customTotal}
                onChange={e => setCustomTotal(e.target.value)}
                placeholder={`${itemsTotal.toFixed(2)} (calculado automaticamente)`}
              />
            ) : (
              <Input
                data-testid="input-order-value"
                type="number"
                step="0.01"
                min="0"
                value={totalValue}
                onChange={e => setTotalValue(e.target.value)}
                placeholder="0.00"
              />
            )}
            {orderItems.length > 0 && customTotal && parseFloat(customTotal) !== itemsTotal && (
              <p className="text-xs text-amber-600 dark:text-amber-400" data-testid="text-custom-total-warning">
                Valor alterado manualmente (calculado: R$ {itemsTotal.toFixed(2)})
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Previsão de Entrega</Label>
            <Input
              data-testid="input-delivery-date"
              type="date"
              value={deliveryDate}
              onChange={e => setDeliveryDate(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={urgent}
              onCheckedChange={setUrgent}
              id="urgent"
              data-testid="switch-urgent"
            />
            <Label htmlFor="urgent">{typeLabel} Urgente</Label>
          </div>

          <Button
            className="w-full"
            disabled={isPending}
            data-testid="button-create-order"
            onClick={handleSubmit}
          >
            {isPending ? "Criando..." : `Criar ${typeLabel}`}
          </Button>
        </div>

        {showProductPicker && (
          <ProductPickerDialog
            products={activeProducts}
            onSelect={addProduct}
            onClose={() => setShowProductPicker(false)}
            alreadyAdded={orderItems.map(i => i.productId)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ProductPickerDialog({ products, onSelect, onClose, alreadyAdded }: {
  products: Product[];
  onSelect: (p: Product) => void;
  onClose: () => void;
  alreadyAdded: number[];
}) {
  const [search, setSearch] = useState("");
  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.category && p.category.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background rounded-lg shadow-xl w-full max-w-md max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b">
          <h3 className="font-semibold mb-2">Selecionar Produto</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              data-testid="input-search-product-picker"
              placeholder="Buscar produto..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum produto encontrado</p>
          ) : (
            <div className="space-y-1">
              {filtered.map(product => {
                const isAdded = alreadyAdded.includes(product.id);
                return (
                  <button
                    key={product.id}
                    className={`w-full text-left p-3 rounded-md hover:bg-muted transition-colors flex items-center justify-between ${isAdded ? "opacity-50" : ""}`}
                    onClick={() => onSelect(product)}
                    data-testid={`picker-product-${product.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{product.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {product.category && <span className="text-xs text-muted-foreground">{product.category}</span>}
                        <span className="text-xs text-muted-foreground">SKU: {product.sku}</span>
                        {product.productType === "physical" && (
                          <span className={`text-xs ${(product.stockQuantity || 0) <= 0 ? "text-destructive" : "text-muted-foreground"}`}>
                            Estoque: {product.stockQuantity || 0}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right ml-3">
                      <p className="font-semibold text-sm">R$ {parseFloat(product.price).toFixed(2)}</p>
                      {product.wholesalePrice && (
                        <p className="text-[10px] text-muted-foreground">
                          Atacado: R$ {parseFloat(product.wholesalePrice).toFixed(2)} (mín. {product.wholesaleMinQty || 1})
                        </p>
                      )}
                      {isAdded && <Badge variant="secondary" className="text-[10px]">Já adicionado</Badge>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="p-3 border-t">
          <Button variant="outline" className="w-full" onClick={onClose} data-testid="button-close-product-picker">Fechar</Button>
        </div>
      </div>
    </div>
  );
}

function ListView({
  orders,
  getClientName,
  onSelect,
  sendWhatsApp,
  onDelete,
}: {
  orders: Order[];
  getClientName: (id: number) => string;
  onSelect: (id: number) => void;
  sendWhatsApp: (o: Order) => void;
  onDelete: (id: number) => void;
}) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
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
      {orders.map(order => {
        const late = isOrderLate(order);
        return (
          <Card
            key={order.id}
            className={`cursor-pointer transition-all hover-elevate ${order.urgent ? "ring-2 ring-amber-400 dark:ring-amber-600" : ""} ${late ? "ring-2 ring-red-400 dark:ring-red-600" : ""}`}
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
                      {late && (
                        <Badge className="text-xs bg-red-600 text-white" data-testid={`badge-late-${order.id}`}>
                          <Clock className="w-3 h-3 mr-1" />
                          Atrasado
                        </Badge>
                      )}
                      {order.source === "online" && (
                        <Badge variant="secondary" className="text-xs">
                          <ShoppingBag className="w-3 h-3 mr-1" />
                          Online
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
                  {confirmDeleteId === order.id ? (
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => { onDelete(order.id); setConfirmDeleteId(null); }}
                        data-testid={`button-confirm-delete-${order.id}`}
                      >
                        Confirmar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setConfirmDeleteId(null)}
                        data-testid={`button-cancel-delete-${order.id}`}
                      >
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(order.id); }}
                      data-testid={`button-delete-${order.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  )}
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
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
              {statusOrders.map(order => {
                const late = isOrderLate(order);
                return (
                  <Card
                    key={order.id}
                    draggable
                    onDragStart={e => e.dataTransfer.setData("orderId", String(order.id))}
                    onClick={() => onSelect(order.id)}
                    className={`cursor-grab active:cursor-grabbing hover-elevate ${order.urgent ? "ring-2 ring-amber-400 dark:ring-amber-600" : ""} ${late ? "ring-2 ring-red-400 dark:ring-red-600" : ""}`}
                    data-testid={`kanban-card-${order.id}`}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-1 mb-2">
                        <span className="font-mono text-xs font-semibold">{order.code}</span>
                        <div className="flex items-center gap-1">
                          {late && <Clock className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
                          {order.urgent && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                        </div>
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
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
