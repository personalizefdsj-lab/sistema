import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import {
  DollarSign, TrendingUp, TrendingDown, Clock, ClipboardList,
  AlertTriangle, Users, Package, CalendarDays, ArrowUpRight, ArrowDownRight,
  ChevronRight
} from "lucide-react";
import { ORDER_STATUS_LABELS, FINANCIAL_STATUS_LABELS } from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusColors: Record<string, string> = {
  received: "bg-blue-500",
  design: "bg-purple-500",
  production: "bg-orange-500",
  packaging: "bg-cyan-500",
  sent: "bg-indigo-500",
  finished: "bg-emerald-500",
  waiting_client: "bg-amber-500",
};

const financialStatusColors: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  partial: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  pending: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

const orderStatusBadgeColors: Record<string, string> = {
  received: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  design: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  production: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  packaging: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
  sent: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  finished: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  waiting_client: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
};

export default function Dashboard() {
  const [, navigate] = useLocation();

  const { data: stats, isLoading } = useQuery<any>({
    queryKey: ["/api/dashboard"],
  });

  const { data: company } = useQuery<any>({
    queryKey: ["/api/company"],
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="dashboard-loading">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[5, 6, 7, 8].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  const revenueChange = stats?.lastMonthRevenue > 0
    ? ((stats.monthRevenue - stats.lastMonthRevenue) / stats.lastMonthRevenue * 100)
    : stats?.monthRevenue > 0 ? 100 : 0;

  const totalFinancial = (stats?.financialBreakdown?.paid || 0) + (stats?.financialBreakdown?.partial || 0) + (stats?.financialBreakdown?.pending || 0);

  const mainCards = [
    {
      title: "Total Recebido",
      value: `R$ ${(stats?.totalReceived || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
    },
    {
      title: "A Receber",
      value: `R$ ${(stats?.totalPending || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      icon: TrendingUp,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/30",
    },
    {
      title: "Pedidos Pendentes",
      value: stats?.pendingOrders || 0,
      icon: Clock,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      title: "Total de Pedidos",
      value: stats?.totalOrders || 0,
      icon: ClipboardList,
      color: "text-violet-600 dark:text-violet-400",
      bg: "bg-violet-50 dark:bg-violet-950/30",
    },
  ];

  const quickStats = [
    { title: "Pedidos Hoje", value: stats?.todayOrders || 0, icon: CalendarDays, color: "text-sky-600 dark:text-sky-400" },
    { title: "Urgentes", value: stats?.urgentOrders || 0, icon: AlertTriangle, color: stats?.urgentOrders > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground" },
    { title: "Clientes", value: stats?.totalClients || 0, icon: Users, color: "text-indigo-600 dark:text-indigo-400" },
    { title: "Estoque Baixo", value: stats?.lowStockCount || 0, icon: Package, color: stats?.lowStockCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground" },
  ];

  return (
    <div className="p-6 space-y-6" data-testid="dashboard-page">
      <div>
        <h1 className="text-2xl font-semibold" data-testid="text-dashboard-title">
          {company?.name || "Dashboard"}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Visão geral dos seus pedidos e finanças
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {mainCards.map((card) => (
          <Card key={card.title}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between gap-1">
                <div>
                  <p className="text-sm text-muted-foreground">{card.title}</p>
                  <p className="text-2xl font-bold mt-1" data-testid={`text-stat-${card.title}`}>
                    {card.value}
                  </p>
                </div>
                <div className={`w-10 h-10 rounded-md ${card.bg} flex items-center justify-center flex-shrink-0`}>
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {quickStats.map((qs) => (
          <div key={qs.title} className="flex items-center gap-3 p-3 rounded-lg border bg-card" data-testid={`quick-stat-${qs.title}`}>
            <qs.icon className={`w-5 h-5 flex-shrink-0 ${qs.color}`} />
            <div>
              <p className="text-lg font-bold leading-tight">{qs.value}</p>
              <p className="text-xs text-muted-foreground">{qs.title}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Receita Mensal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-4">
                <div>
                  <p className="text-3xl font-bold" data-testid="text-month-revenue">
                    R$ {(stats?.monthRevenue || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(), "MMMM yyyy", { locale: ptBR })}
                  </p>
                </div>
                {stats?.lastMonthRevenue !== undefined && (
                  <div className={`flex items-center gap-1 text-sm font-medium ${revenueChange >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`} data-testid="text-revenue-change">
                    {revenueChange >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    {Math.abs(revenueChange).toFixed(1)}%
                  </div>
                )}
              </div>
              <div className="mt-4 flex items-center gap-3 text-sm">
                <span className="text-muted-foreground">Mês anterior:</span>
                <span className="font-medium">R$ {(stats?.lastMonthRevenue || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
              </div>
            </CardContent>
          </Card>

          {totalFinancial > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Situação Financeira</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex rounded-full overflow-hidden h-3" data-testid="financial-bar">
                  {stats?.financialBreakdown?.paid > 0 && (
                    <div className="bg-emerald-500" style={{ width: `${(stats.financialBreakdown.paid / totalFinancial) * 100}%` }} />
                  )}
                  {stats?.financialBreakdown?.partial > 0 && (
                    <div className="bg-amber-500" style={{ width: `${(stats.financialBreakdown.partial / totalFinancial) * 100}%` }} />
                  )}
                  {stats?.financialBreakdown?.pending > 0 && (
                    <div className="bg-red-500" style={{ width: `${(stats.financialBreakdown.pending / totalFinancial) * 100}%` }} />
                  )}
                </div>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2" data-testid="financial-paid">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-sm">Pago ({stats?.financialBreakdown?.paid || 0})</span>
                  </div>
                  <div className="flex items-center gap-2" data-testid="financial-partial">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="text-sm">Parcial ({stats?.financialBreakdown?.partial || 0})</span>
                  </div>
                  <div className="flex items-center gap-2" data-testid="financial-pending">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-sm">Pendente ({stats?.financialBreakdown?.pending || 0})</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {stats?.byStatus && Object.keys(stats.byStatus).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pedidos por Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex rounded-full overflow-hidden h-3" data-testid="status-bar">
                  {stats.totalOrders > 0 && Object.entries(stats.byStatus).map(([status, count]) => (
                    <div
                      key={status}
                      className={statusColors[status] || "bg-gray-400"}
                      style={{ width: `${((count as number) / stats.totalOrders) * 100}%` }}
                    />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(stats.byStatus).map(([status, count]) => (
                    <div
                      key={status}
                      className="flex items-center justify-between px-3 py-2 rounded-md bg-muted/50"
                      data-testid={`status-count-${status}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${statusColors[status] || "bg-gray-400"}`} />
                        <span className="text-sm">{ORDER_STATUS_LABELS[status] || status}</span>
                      </div>
                      <span className="text-sm font-bold">{count as number}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Pedidos Recentes</CardTitle>
              <button
                onClick={() => navigate("/orders")}
                className="text-xs text-primary hover:underline flex items-center gap-0.5"
                data-testid="link-all-orders"
              >
                Ver todos <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {(!stats?.recentOrders || stats.recentOrders.length === 0) ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum pedido ainda</p>
            ) : (
              <div className="space-y-3">
                {stats.recentOrders.map((order: any) => (
                  <div
                    key={order.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate("/orders")}
                    data-testid={`recent-order-${order.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-semibold">{order.code}</span>
                        {order.urgent && (
                          <AlertTriangle className="w-3 h-3 text-red-500" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{order.clientName}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold">
                        R$ {parseFloat(order.totalValue || "0").toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {order.createdAt ? format(new Date(order.createdAt), "dd/MM HH:mm") : "—"}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${orderStatusBadgeColors[order.status] || ""}`}>
                        {ORDER_STATUS_LABELS[order.status]}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${financialStatusColors[order.financialStatus] || ""}`}>
                        {FINANCIAL_STATUS_LABELS[order.financialStatus]}
                      </span>
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
