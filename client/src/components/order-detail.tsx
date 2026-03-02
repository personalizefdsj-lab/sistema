import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ORDER_STATUSES, ORDER_STATUS_LABELS, FINANCIAL_STATUS_LABELS } from "@shared/schema";
import type { Order, Client, OrderHistory, OrderItem, Product } from "@shared/schema";
import { ArrowLeft, AlertTriangle, Clock, Phone, History, Package, Calendar, Plus, Minus, Trash2, Search } from "lucide-react";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  received: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  design: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  production: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  packaging: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
  sent: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  finished: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  waiting_client: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
};

export default function OrderDetail({
  orderId,
  onBack,
  clients,
  onDelete,
  isDeleting,
}: {
  orderId: number;
  onBack: () => void;
  clients: Client[];
  onDelete?: (id: number) => void;
  isDeleting?: boolean;
}) {
  const { toast } = useToast();
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: order, isLoading } = useQuery<Order>({
    queryKey: ["/api/orders", orderId],
  });

  const { data: history = [] } = useQuery<OrderHistory[]>({
    queryKey: ["/api/orders", orderId, "history"],
  });

  const { data: orderItems = [] } = useQuery<OrderItem[]>({
    queryKey: ["/api/orders", orderId, "items"],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", `/api/orders/${orderId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders", orderId] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders", orderId, "history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Pedido atualizado" });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const invalidateItems = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/orders", orderId, "items"] });
  };

  const addItemMutation = useMutation({
    mutationFn: async (data: { productId: number; quantity: number; unitPrice: string; variation?: string }) => {
      const res = await apiRequest("POST", `/api/orders/${orderId}/items`, data);
      return res.json();
    },
    onSuccess: () => { invalidateItems(); toast({ title: "Produto adicionado" }); },
    onError: (err: any) => { toast({ title: "Erro", description: err.message, variant: "destructive" }); },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ itemId, ...data }: { itemId: number; quantity?: number; unitPrice?: string }) => {
      const res = await apiRequest("PATCH", `/api/orders/${orderId}/items/${itemId}`, data);
      return res.json();
    },
    onSuccess: () => { invalidateItems(); },
    onError: (err: any) => { toast({ title: "Erro", description: err.message, variant: "destructive" }); },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      await apiRequest("DELETE", `/api/orders/${orderId}/items/${itemId}`);
    },
    onSuccess: () => { invalidateItems(); toast({ title: "Produto removido" }); },
    onError: (err: any) => { toast({ title: "Erro", description: err.message, variant: "destructive" }); },
  });

  if (isLoading || !order) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const client = clients.find(c => c.id === order.clientId);
  const remaining = Math.max(0, parseFloat(order.totalValue || "0") - parseFloat(order.receivedValue || "0"));
  const statusIndex = ORDER_STATUSES.indexOf(order.status as any);
  const itemsTotal = orderItems.reduce((sum, item) => sum + parseFloat(item.unitPrice || "0") * item.quantity, 0);

  const sendWhatsApp = () => {
    if (!client) return;
    const phone = client.phone.replace(/\D/g, "");
    const msg = encodeURIComponent(
      `Olá ${client.name}!\n\nSeu pedido *${order.code}*\nStatus: ${ORDER_STATUS_LABELS[order.status]}\nData de Entrada: ${format(new Date(order.createdAt), "dd/MM/yyyy HH:mm")}\n\nObrigado pela preferência!`
    );
    window.open(`https://wa.me/55${phone}?text=${msg}`, "_blank");
  };

  return (
    <div className="p-6 space-y-6" data-testid="order-detail-page">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold font-mono" data-testid="text-order-code">{order.code}</h1>
            {order.urgent && (
              <Badge variant="destructive">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Urgente
              </Badge>
            )}
            {order.source === "online" && (
              <Badge variant="secondary">Online</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Entrada: {format(new Date(order.createdAt), "dd/MM/yyyy HH:mm")}
          </p>
        </div>
        {onDelete && (
          confirmDelete ? (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="destructive"
                disabled={isDeleting}
                onClick={() => onDelete(orderId)}
                data-testid="button-confirm-delete-order"
              >
                {isDeleting ? "Excluindo..." : "Confirmar exclusão"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setConfirmDelete(false)}
                data-testid="button-cancel-delete-order"
              >
                Cancelar
              </Button>
            </div>
          ) : (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setConfirmDelete(true)}
              data-testid="button-delete-order"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          )
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {ORDER_STATUSES.map((s, i) => {
          const isCurrent = order.status === s;
          const isPast = statusIndex > i;
          return (
            <div
              key={s}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                isCurrent
                  ? statusColors[s]
                  : isPast
                    ? "bg-muted text-muted-foreground"
                    : "bg-muted/40 text-muted-foreground/50"
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${isCurrent ? "bg-current" : isPast ? "bg-muted-foreground/50" : "bg-muted-foreground/20"}`} />
              {ORDER_STATUS_LABELS[s]}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detalhes do Pedido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-muted-foreground text-xs">Cliente</Label>
              <p className="font-medium" data-testid="text-client-name">{client?.name || "—"}</p>
              {client?.phone && (
                <p className="text-sm text-muted-foreground">{client.phone}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">Descrição</Label>
              <Textarea
                data-testid="input-order-description"
                defaultValue={order.description || ""}
                placeholder="Adicionar descrição do pedido..."
                rows={3}
                onBlur={e => {
                  if (e.target.value !== (order.description || "")) {
                    updateMutation.mutate({ description: e.target.value || null });
                  }
                }}
              />
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Status</Label>
              <Select
                value={order.status}
                onValueChange={(v) => updateMutation.mutate({ status: v })}
              >
                <SelectTrigger data-testid="select-order-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORDER_STATUSES.map(s => (
                    <SelectItem key={s} value={s}>{ORDER_STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Previsão de Entrega
              </Label>
              <Input
                data-testid="input-delivery-date"
                type="date"
                defaultValue={order.deliveryDate ? format(new Date(order.deliveryDate), "yyyy-MM-dd") : ""}
                onBlur={e => {
                  const newVal = e.target.value || null;
                  const oldVal = order.deliveryDate ? format(new Date(order.deliveryDate), "yyyy-MM-dd") : null;
                  if (newVal !== oldVal) {
                    updateMutation.mutate({ deliveryDate: newVal });
                  }
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-muted-foreground text-xs flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Pedido Urgente
              </Label>
              <Switch
                data-testid="switch-urgent"
                checked={!!order.urgent}
                onCheckedChange={(v) => updateMutation.mutate({ urgent: v })}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={sendWhatsApp} variant="outline" className="flex-1" data-testid="button-whatsapp">
                <Phone className="w-4 h-4 mr-2 text-emerald-600" />
                WhatsApp
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Financeiro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-md bg-muted/50">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="font-bold text-lg" data-testid="text-order-total">
                  R$ {parseFloat(order.totalValue || "0").toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="text-center p-3 rounded-md bg-emerald-50 dark:bg-emerald-950/20">
                <p className="text-xs text-muted-foreground">Recebido</p>
                <p className="font-bold text-lg text-emerald-600 dark:text-emerald-400" data-testid="text-order-received">
                  R$ {parseFloat(order.receivedValue || "0").toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="text-center p-3 rounded-md bg-amber-50 dark:bg-amber-950/20">
                <p className="text-xs text-muted-foreground">Restante</p>
                <p className="font-bold text-lg text-amber-600 dark:text-amber-400" data-testid="text-order-remaining">
                  R$ {remaining.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Valor Total (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  defaultValue={order.totalValue || "0"}
                  onBlur={e => updateMutation.mutate({ totalValue: e.target.value })}
                  data-testid="input-total-value"
                />
              </div>
              <div className="space-y-2">
                <Label>Valor Recebido (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  defaultValue={order.receivedValue || "0"}
                  onBlur={e => updateMutation.mutate({ receivedValue: e.target.value })}
                  data-testid="input-received-value"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="w-4 h-4" />
              Produtos do Pedido
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowProductPicker(true)}
              data-testid="button-add-item"
            >
              <Plus className="w-4 h-4 mr-1" /> Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {orderItems.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum produto adicionado a este pedido.</p>
          ) : (
            <div className="space-y-2">
              {orderItems.map((item, idx) => {
                const product = products.find(p => p.id === item.productId);
                return (
                  <div key={item.id || idx} className="flex items-center gap-2 p-3 rounded-md bg-muted/30 border" data-testid={`order-item-detail-${item.id}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" data-testid={`text-item-name-${item.id}`}>
                        {product?.name || `Produto #${item.productId}`}
                        {item.variation && <span className="text-muted-foreground ml-1">({item.variation})</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        R$ {parseFloat(item.unitPrice || "0").toFixed(2)} cada
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button type="button" size="icon" variant="outline" className="h-7 w-7"
                        data-testid={`button-item-minus-${item.id}`}
                        disabled={item.quantity <= 1 || updateItemMutation.isPending}
                        onClick={() => updateItemMutation.mutate({ itemId: item.id, quantity: item.quantity - 1 })}>
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <Button type="button" size="icon" variant="outline" className="h-7 w-7"
                        data-testid={`button-item-plus-${item.id}`}
                        disabled={updateItemMutation.isPending}
                        onClick={() => updateItemMutation.mutate({ itemId: item.id, quantity: item.quantity + 1 })}>
                        <Plus className="w-3 h-3" />
                      </Button>
                      <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                        data-testid={`button-item-remove-${item.id}`}
                        disabled={deleteItemMutation.isPending}
                        onClick={() => deleteItemMutation.mutate(item.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    <p className="text-sm font-semibold w-20 text-right" data-testid={`text-item-subtotal-${item.id}`}>
                      R$ {(parseFloat(item.unitPrice || "0") * item.quantity).toFixed(2)}
                    </p>
                  </div>
                );
              })}
              <div className="flex items-center justify-between pt-3 border-t mt-3">
                <span className="text-sm font-semibold">Total dos Itens</span>
                <span className="text-sm font-bold" data-testid="text-items-total">R$ {itemsTotal.toFixed(2)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {showProductPicker && (
        <OrderProductPicker
          products={products.filter(p => p.active !== false)}
          alreadyAdded={orderItems.map(i => i.productId)}
          onSelect={(product) => {
            addItemMutation.mutate({ productId: product.id, quantity: 1, unitPrice: product.price });
            setShowProductPicker(false);
          }}
          onClose={() => setShowProductPicker(false)}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="w-4 h-4" />
            Histórico
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem histórico</p>
          ) : (
            <div className="space-y-3">
              {history.map(h => (
                <div key={h.id} className="flex items-start gap-3" data-testid={`history-item-${h.id}`}>
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                  <div>
                    <p className="text-sm">
                      {h.fromStatus ? (
                        <>
                          <span className="text-muted-foreground">{ORDER_STATUS_LABELS[h.fromStatus]}</span>
                          {" → "}
                          <span className="font-medium">{ORDER_STATUS_LABELS[h.toStatus]}</span>
                        </>
                      ) : (
                        <span className="font-medium">{ORDER_STATUS_LABELS[h.toStatus]}</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {h.changedBy} - {format(new Date(h.createdAt), "dd/MM/yyyy HH:mm")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function OrderProductPicker({ products, alreadyAdded, onSelect, onClose }: {
  products: Product[];
  alreadyAdded: number[];
  onSelect: (p: Product) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.category && p.category.toLowerCase().includes(search.toLowerCase())) ||
    (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background rounded-lg shadow-xl w-full max-w-md max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b">
          <h3 className="font-semibold mb-2">Adicionar Produto ao Pedido</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              data-testid="input-search-product-detail"
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
                    data-testid={`picker-detail-product-${product.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{product.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {product.category && <span className="text-xs text-muted-foreground">{product.category}</span>}
                        <span className="text-xs text-muted-foreground">SKU: {product.sku}</span>
                      </div>
                    </div>
                    <div className="text-right ml-3">
                      <p className="font-semibold text-sm">R$ {parseFloat(product.price).toFixed(2)}</p>
                      {isAdded && <Badge variant="secondary" className="text-[10px]">Já adicionado</Badge>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
