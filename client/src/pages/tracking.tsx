import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Package, CheckCircle2, Clock, Truck, ArrowRight } from "lucide-react";
import { ORDER_STATUS_LABELS, FINANCIAL_STATUS_LABELS } from "@shared/schema";

const STATUS_ICONS: Record<string, any> = {
  received: Clock,
  design: Package,
  production: Package,
  packaging: Package,
  sent: Truck,
  finished: CheckCircle2,
  waiting_client: Clock,
};

export default function TrackingPage() {
  const params = useParams<{ code: string }>();
  const [searchCode, setSearchCode] = useState(params.code || "");
  const [activeCode, setActiveCode] = useState(params.code || "");

  const { data, isLoading, error } = useQuery<any>({
    queryKey: ["/api/track", activeCode],
    queryFn: () => fetch(`/api/track/${activeCode}`).then(r => { if (!r.ok) throw new Error("Pedido não encontrado"); return r.json(); }),
    enabled: !!activeCode,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveCode(searchCode.trim().toUpperCase());
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background">
        <div className="max-w-3xl mx-auto px-4 py-6 text-center">
          <Package className="w-12 h-12 mx-auto text-primary mb-3" />
          <h1 className="text-2xl font-bold" data-testid="text-tracking-title">Acompanhar Pedido</h1>
          <p className="text-muted-foreground">Digite o código do pedido para ver o status</p>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input data-testid="input-track-code" value={searchCode} onChange={e => setSearchCode(e.target.value)}
            placeholder="Ex: FDJ-2026-0001" className="text-lg h-12" />
          <Button type="submit" size="lg" data-testid="button-track-search">
            <Search className="w-5 h-5 mr-2" /> Buscar
          </Button>
        </form>

        {isLoading && <Card><CardContent className="py-8 text-center">Buscando pedido...</CardContent></Card>}

        {error && activeCode && (
          <Card><CardContent className="py-8 text-center text-destructive">Pedido não encontrado. Verifique o código e tente novamente.</CardContent></Card>
        )}

        {data && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl" data-testid="text-track-order-code">{data.order.code}</CardTitle>
                  <Badge variant="outline" data-testid="text-track-status">{ORDER_STATUS_LABELS[data.order.status] || data.order.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Empresa</p>
                    <p className="font-medium" data-testid="text-track-company">{data.companyName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Cliente</p>
                    <p className="font-medium" data-testid="text-track-client">{data.clientName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Valor Total</p>
                    <p className="font-medium">R$ {parseFloat(data.order.totalValue || "0").toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status Financeiro</p>
                    <Badge variant={data.order.financialStatus === "paid" ? "default" : "secondary"}>
                      {FINANCIAL_STATUS_LABELS[data.order.financialStatus] || data.order.financialStatus}
                    </Badge>
                  </div>
                  {data.order.description && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Descrição</p>
                      <p className="font-medium">{data.order.description}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground">Criado em</p>
                    <p className="font-medium">{new Date(data.order.createdAt).toLocaleDateString("pt-BR")}</p>
                  </div>
                  {data.order.deliveryDate && (
                    <div>
                      <p className="text-muted-foreground">Previsão de Entrega</p>
                      <p className="font-medium">{new Date(data.order.deliveryDate).toLocaleDateString("pt-BR")}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Progresso</CardTitle></CardHeader>
              <CardContent>
                <OrderTimeline history={data.history} currentStatus={data.order.status} />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

function OrderTimeline({ history, currentStatus }: { history: any[]; currentStatus: string }) {
  const sortedHistory = [...history].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  if (sortedHistory.length === 0) {
    return <p className="text-center text-muted-foreground">Sem histórico disponível</p>;
  }

  return (
    <div className="space-y-4">
      {sortedHistory.map((entry, idx) => {
        const Icon = STATUS_ICONS[entry.toStatus] || Package;
        const isLast = idx === sortedHistory.length - 1;
        return (
          <div key={entry.id} className="flex gap-3" data-testid={`timeline-entry-${entry.id}`}>
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isLast ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                <Icon className="w-4 h-4" />
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
              {entry.changedBy && <p className="text-xs text-muted-foreground">Por: {entry.changedBy}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
