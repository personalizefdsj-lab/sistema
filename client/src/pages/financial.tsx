import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Trash2 } from "lucide-react";
import type { Expense } from "@shared/schema";
import { EXPENSE_CATEGORIES } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function FinancialPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterMonth, setFilterMonth] = useState(() => format(new Date(), "yyyy-MM"));

  const [formType, setFormType] = useState<string>("expense");
  const [formCategory, setFormCategory] = useState<string>("outros");
  const [formDescription, setFormDescription] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDate, setFormDate] = useState(() => format(new Date(), "yyyy-MM-dd"));

  const { data: entries = [], isLoading } = useQuery<Expense[]>({
    queryKey: ["/api/financial"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { type: string; category: string; description: string; amount: string; date: string }) => {
      await apiRequest("POST", "/api/financial", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/financial"] });
      toast({ title: "Lançamento criado com sucesso" });
      resetForm();
      setDialogOpen(false);
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao criar lançamento", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/financial/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/financial"] });
      toast({ title: "Lançamento excluído" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao excluir", description: err.message, variant: "destructive" });
    },
  });

  function resetForm() {
    setFormType("expense");
    setFormCategory("outros");
    setFormDescription("");
    setFormAmount("");
    setFormDate(format(new Date(), "yyyy-MM-dd"));
  }

  function handleSubmit() {
    if (!formAmount || parseFloat(formAmount) <= 0) {
      toast({ title: "Informe um valor válido", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      type: formType,
      category: formCategory,
      description: formDescription,
      amount: formAmount,
      date: formDate,
    });
  }

  const filtered = entries.filter((e) => {
    if (filterType !== "all" && e.type !== filterType) return false;
    if (filterCategory !== "all" && e.category !== filterCategory) return false;
    const entryMonth = format(new Date(e.date), "yyyy-MM");
    if (entryMonth !== filterMonth) return false;
    return true;
  });

  const totalIncome = filtered
    .filter((e) => e.type === "income")
    .reduce((sum, e) => sum + parseFloat(e.amount), 0);
  const totalExpense = filtered
    .filter((e) => e.type === "expense")
    .reduce((sum, e) => sum + parseFloat(e.amount), 0);
  const balance = totalIncome - totalExpense;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="financial-loading">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="financial-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Financeiro</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-entry" onClick={() => { resetForm(); setDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Entrada/Saída
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="dialog-new-entry">
            <DialogHeader>
              <DialogTitle>Novo Lançamento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={formType} onValueChange={setFormType} data-testid="select-form-type">
                  <SelectTrigger data-testid="select-trigger-form-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Entrada</SelectItem>
                    <SelectItem value="expense">Saída</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger data-testid="select-trigger-form-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(EXPENSE_CATEGORIES).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input
                  data-testid="input-description"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Descrição do lançamento"
                />
              </div>
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input
                  data-testid="input-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label>Data</Label>
                <Input
                  data-testid="input-date"
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                />
              </div>
              <Button
                data-testid="button-submit-entry"
                className="w-full"
                onClick={handleSubmit}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Salvando..." : "Salvar Lançamento"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card data-testid="card-total-income">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Entradas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-total-income">
              {formatCurrency(totalIncome)}
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-total-expense">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Saídas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600" data-testid="text-total-expense">
              {formatCurrency(totalExpense)}
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-balance">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saldo</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${balance >= 0 ? "text-green-600" : "text-red-600"}`}
              data-testid="text-balance"
            >
              {formatCurrency(balance)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap space-y-0 pb-4">
          <CardTitle className="text-lg">Lançamentos</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[140px]" data-testid="select-trigger-filter-type">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="income">Entradas</SelectItem>
                <SelectItem value="expense">Saídas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[160px]" data-testid="select-trigger-filter-category">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {Object.entries(EXPENSE_CATEGORIES).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              data-testid="input-filter-month"
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-[160px]"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8" data-testid="text-no-entries">
              Nenhum lançamento encontrado
            </p>
          ) : (
            <div className="space-y-2">
              {filtered.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between gap-4 p-3 rounded-md border flex-wrap"
                  data-testid={`row-entry-${entry.id}`}
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm text-muted-foreground min-w-[80px]" data-testid={`text-date-${entry.id}`}>
                      {format(new Date(entry.date), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                    <Badge
                      variant={entry.type === "income" ? "default" : "destructive"}
                      className={entry.type === "income" ? "bg-green-600" : ""}
                      data-testid={`badge-type-${entry.id}`}
                    >
                      {entry.type === "income" ? "Entrada" : "Saída"}
                    </Badge>
                    <span className="text-sm font-medium" data-testid={`text-category-${entry.id}`}>
                      {EXPENSE_CATEGORIES[entry.category] || entry.category}
                    </span>
                    {entry.description && (
                      <span className="text-sm text-muted-foreground" data-testid={`text-description-${entry.id}`}>
                        {entry.description}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`font-semibold ${entry.type === "income" ? "text-green-600" : "text-red-600"}`}
                      data-testid={`text-amount-${entry.id}`}
                    >
                      {entry.type === "income" ? "+" : "-"} {formatCurrency(parseFloat(entry.amount))}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      data-testid={`button-delete-${entry.id}`}
                      onClick={() => deleteMutation.mutate(entry.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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