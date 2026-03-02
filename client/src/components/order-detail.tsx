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
import { ArrowLeft, AlertTriangle, Clock, Phone, History, Package, Calendar } from "lucide-react";
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
}: {
  orderId: number;
  onBack: () => void;
  clients: Client[];
}) {
  const { toast } = useToast();

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

      {orderItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="w-4 h-4" />
              Produtos do Pedido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {orderItems.map((item, idx) => (
                <div key={item.id || idx} className="flex items-center justify-between gap-3 p-3 rounded-md bg-muted/30 border" data-testid={`order-item-detail-${item.id}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" data-testid={`text-item-name-${item.id}`}>
                      {products.find(p => p.id === item.productId)?.name || `Produto #${item.productId}`}
                      {item.variation && <span className="text-muted-foreground ml-1">({item.variation})</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity}x R$ {parseFloat(item.unitPrice || "0").toFixed(2)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold" data-testid={`text-item-subtotal-${item.id}`}>
                    R$ {(parseFloat(item.unitPrice || "0") * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
              <div className="flex items-center justify-between pt-3 border-t mt-3">
                <span className="text-sm font-semibold">Total dos Itens</span>
                <span className="text-sm font-bold" data-testid="text-items-total">R$ {itemsTotal.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
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
