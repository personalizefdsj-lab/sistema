import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, ShoppingBag, TrendingUp, BarChart3 } from "lucide-react";
import type { Order } from "@shared/schema";
import { ORDER_STATUS_LABELS } from "@shared/schema";

export default function SalesDashboardPage() {
  const { data: stats, isLoading } = useQuery<any>({ queryKey: ["/api/sales/dashboard"] });
  const { data: orders = [] } = useQuery<Order[]>({ queryKey: ["/api/orders"] });

  const onlineOrders = orders.filter(o => o.source === "online");
  const recentOnline = onlineOrders.slice(0, 10);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold" data-testid="text-sales-title">Dashboard de Vendas Online</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold" data-testid="text-sales-month-total">
                  {isLoading ? "..." : `R$ ${(stats?.totalMonth || 0).toFixed(2)}`}
                </p>
                <p className="text-sm text-muted-foreground">Vendido no Mês</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold" data-testid="text-sales-month-orders">
                  {isLoading ? "..." : stats?.monthOrdersCount || 0}
                </p>
                <p className="text-sm text-muted-foreground">Pedidos no Mês</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold" data-testid="text-sales-avg-ticket">
                  {isLoading ? "..." : `R$ ${(stats?.avgTicket || 0).toFixed(2)}`}
                </p>
                <p className="text-sm text-muted-foreground">Ticket Médio</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold" data-testid="text-sales-total-online">
                  {isLoading ? "..." : stats?.totalOnlineOrders || 0}
                </p>
                <p className="text-sm text-muted-foreground">Total Vendas Online</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Produtos Mais Vendidos</CardTitle></CardHeader>
          <CardContent>
            {!stats?.topProducts || stats.topProducts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhuma venda online ainda</p>
            ) : (
              <div className="space-y-3">
                {stats.topProducts.map((p: any, idx: number) => (
                  <div key={p.productId} className="flex items-center justify-between border rounded-lg p-3" data-testid={`row-top-product-${p.productId}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-muted-foreground w-6">{idx + 1}</span>
                      <div>
                        <p className="font-medium">{p.name}</p>
                        <p className="text-sm text-muted-foreground">{p.quantity} vendidos</p>
                      </div>
                    </div>
                    <p className="font-bold">R$ {p.revenue.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Últimos Pedidos Online</CardTitle></CardHeader>
          <CardContent>
            {recentOnline.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhum pedido online ainda</p>
            ) : (
              <div className="space-y-3">
                {recentOnline.map(order => (
                  <div key={order.id} className="flex items-center justify-between border rounded-lg p-3" data-testid={`row-online-order-${order.id}`}>
                    <div>
                      <p className="font-medium">{order.code}</p>
                      <p className="text-sm text-muted-foreground">{new Date(order.createdAt).toLocaleDateString("pt-BR")}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">R$ {parseFloat(order.totalValue || "0").toFixed(2)}</p>
                      <Badge variant="outline">{ORDER_STATUS_LABELS[order.status]}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
