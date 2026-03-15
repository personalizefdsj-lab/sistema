import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { INVOICE_STATUS_LABELS } from "@shared/schema";
import type { Invoice } from "@shared/schema";
import { FileText, Download, Search, XCircle, RefreshCw, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const invoiceStatusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  processing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  authorized: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
  error: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

export default function InvoicesPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: invoices = [], isLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const cancelMutation = useMutation({
    mutationFn: async ({ id, justificativa }: { id: number; justificativa: string }) => {
      const res = await apiRequest("POST", `/api/invoices/${id}/cancel`, { justificativa });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Nota fiscal cancelada" });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao cancelar", description: err.message, variant: "destructive" });
    },
  });

  const refreshMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/invoices/${id}/refresh`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Status atualizado" });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao atualizar", description: err.message, variant: "destructive" });
    },
  });

  const filtered = invoices.filter(inv => {
    const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
    const matchesSearch = search === "" ||
      String(inv.numero).includes(search) ||
      (inv.chaveAcesso && inv.chaveAcesso.includes(search));
    return matchesStatus && matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-6xl mx-auto overflow-auto h-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold" data-testid="text-invoices-title">Notas Fiscais</h1>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número ou chave..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-invoices"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-invoice-status-filter">
            <SelectValue placeholder="Filtrar status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="authorized">Autorizadas</SelectItem>
            <SelectItem value="processing">Processando</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="error">Com Erro</SelectItem>
            <SelectItem value="cancelled">Canceladas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground" data-testid="text-no-invoices">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Nenhuma nota fiscal encontrada</p>
              <p className="text-sm mt-1">As notas fiscais emitidas aparecerão aqui.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(inv => (
            <Card key={inv.id} data-testid={`invoice-card-${inv.id}`}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold" data-testid={`text-invoice-number-${inv.id}`}>
                        NF-e #{inv.numero}
                      </span>
                      <span className="text-sm text-muted-foreground">Série {inv.serie}</span>
                      <Badge className={invoiceStatusColors[inv.status] || ""} data-testid={`badge-invoice-status-${inv.id}`}>
                        {INVOICE_STATUS_LABELS[inv.status] || inv.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                      <span>R$ {parseFloat(inv.valorTotal || "0").toFixed(2)}</span>
                      <span>{format(new Date(inv.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                      {inv.chaveAcesso && (
                        <span className="text-xs font-mono truncate max-w-[200px]" title={inv.chaveAcesso}>
                          {inv.chaveAcesso}
                        </span>
                      )}
                    </div>
                    {inv.errorMessage && (
                      <p className="text-xs text-destructive mt-1" data-testid={`text-invoice-error-${inv.id}`}>
                        {inv.errorMessage}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {inv.status === "processing" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => refreshMutation.mutate(inv.id)}
                        disabled={refreshMutation.isPending}
                        data-testid={`button-refresh-invoice-${inv.id}`}
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Atualizar
                      </Button>
                    )}
                    {inv.status === "authorized" && inv.pdfUrl && (
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                        data-testid={`button-download-pdf-${inv.id}`}
                      >
                        <a href={inv.pdfUrl} target="_blank" rel="noopener noreferrer">
                          <Download className="w-3 h-3 mr-1" />
                          DANFE
                        </a>
                      </Button>
                    )}
                    {inv.status === "authorized" && inv.xmlUrl && (
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                        data-testid={`button-download-xml-${inv.id}`}
                      >
                        <a href={inv.xmlUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3 h-3 mr-1" />
                          XML
                        </a>
                      </Button>
                    )}
                    {inv.status === "authorized" && (
                      <CancelInvoiceButton
                        invoiceId={inv.id}
                        onCancel={(justificativa) => cancelMutation.mutate({ id: inv.id, justificativa })}
                        isPending={cancelMutation.isPending}
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CancelInvoiceButton({ invoiceId, onCancel, isPending }: {
  invoiceId: number;
  onCancel: (justificativa: string) => void;
  isPending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [justificativa, setJustificativa] = useState("");

  if (!open) {
    return (
      <Button
        size="sm"
        variant="destructive"
        onClick={() => setOpen(true)}
        data-testid={`button-cancel-invoice-${invoiceId}`}
      >
        <XCircle className="w-3 h-3 mr-1" />
        Cancelar
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder="Justificativa (mín. 15 caracteres)"
        value={justificativa}
        onChange={e => setJustificativa(e.target.value)}
        className="w-64"
        data-testid={`input-cancel-justificativa-${invoiceId}`}
      />
      <Button
        size="sm"
        variant="destructive"
        disabled={justificativa.length < 15 || isPending}
        onClick={() => {
          onCancel(justificativa);
          setOpen(false);
          setJustificativa("");
        }}
        data-testid={`button-confirm-cancel-${invoiceId}`}
      >
        Confirmar
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => { setOpen(false); setJustificativa(""); }}
      >
        Voltar
      </Button>
    </div>
  );
}
