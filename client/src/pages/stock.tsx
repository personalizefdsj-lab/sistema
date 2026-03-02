import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, ArrowDown, ArrowUp, Package, BarChart3 } from "lucide-react";
import type { Product, StockMovement } from "@shared/schema";
import { STOCK_MOVEMENT_TYPES } from "@shared/schema";

export default function StockPage() {
  const { toast } = useToast();
  const [movementDialog, setMovementDialog] = useState(false);
  const [historyDialog, setHistoryDialog] = useState<number | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const { data: products = [], isLoading } = useQuery<Product[]>({ queryKey: ["/api/products"] });
  const { data: dashboard } = useQuery<any>({ queryKey: ["/api/stock/dashboard"] });

  const physicalProducts = products.filter(p => p.productType === "physical");

  const [movForm, setMovForm] = useState({ productId: 0, type: "manual_in", quantity: 0, reason: "" });

  const movementMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/stock/movement", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stock/dashboard"] });
      toast({ title: "Movimentação registrada" });
      setMovementDialog(false);
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" data-testid="text-stock-title">Controle de Estoque</h1>
        <Button data-testid="button-new-movement" onClick={() => { setMovForm({ productId: physicalProducts[0]?.id || 0, type: "manual_in", quantity: 0, reason: "" }); setMovementDialog(true); }}>
          <Package className="w-4 h-4 mr-2" /> Nova Movimentação
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold" data-testid="text-total-products">{dashboard?.totalProducts || 0}</p>
                <p className="text-sm text-muted-foreground">Total Produtos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold" data-testid="text-low-stock">{dashboard?.lowStock?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Estoque Baixo</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-destructive" />
              <div>
                <p className="text-2xl font-bold" data-testid="text-no-stock">{dashboard?.noStock?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Sem Estoque</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold" data-testid="text-stock-value">R$ {(dashboard?.totalValue || 0).toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Valor Estoque</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Produtos Físicos</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p>Carregando...</p> : physicalProducts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum produto físico cadastrado</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Estoque</TableHead>
                  <TableHead>Mínimo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {physicalProducts.map(p => {
                  const isLow = (p.stockQuantity || 0) <= (p.minStock || 0) && (p.stockQuantity || 0) > 0;
                  const isEmpty = (p.stockQuantity || 0) === 0;
                  return (
                    <TableRow key={p.id} data-testid={`row-stock-${p.id}`}>
                      <TableCell className="font-medium" data-testid={`text-stock-name-${p.id}`}>{p.name}</TableCell>
                      <TableCell>{p.sku}</TableCell>
                      <TableCell>R$ {parseFloat(p.price).toFixed(2)}</TableCell>
                      <TableCell className={isEmpty ? "text-destructive font-bold" : isLow ? "text-yellow-600 font-bold" : ""} data-testid={`text-stock-qty-${p.id}`}>
                        {p.stockQuantity || 0}
                      </TableCell>
                      <TableCell>{p.minStock || 0}</TableCell>
                      <TableCell>
                        {isEmpty ? <Badge variant="destructive">Sem estoque</Badge> :
                         isLow ? <Badge className="bg-yellow-500">Estoque baixo</Badge> :
                         <Badge variant="secondary">Normal</Badge>}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" data-testid={`button-stock-in-${p.id}`}
                            onClick={() => { setSelectedProduct(p); setMovForm({ productId: p.id, type: "manual_in", quantity: 0, reason: "" }); setMovementDialog(true); }}>
                            <ArrowUp className="w-3 h-3 mr-1" /> Entrada
                          </Button>
                          <Button size="sm" variant="outline" data-testid={`button-stock-out-${p.id}`}
                            onClick={() => { setSelectedProduct(p); setMovForm({ productId: p.id, type: "manual_out", quantity: 0, reason: "" }); setMovementDialog(true); }}>
                            <ArrowDown className="w-3 h-3 mr-1" /> Saída
                          </Button>
                          <Button size="sm" variant="ghost" data-testid={`button-stock-history-${p.id}`}
                            onClick={() => setHistoryDialog(p.id)}>
                            Histórico
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={movementDialog} onOpenChange={setMovementDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Movimentação</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); movementMutation.mutate(movForm); }} className="space-y-4">
            <div>
              <Label>Produto</Label>
              <Select value={String(movForm.productId)} onValueChange={v => setMovForm(f => ({ ...f, productId: parseInt(v) }))}>
                <SelectTrigger data-testid="select-movement-product"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {physicalProducts.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={movForm.type} onValueChange={v => setMovForm(f => ({ ...f, type: v }))}>
                <SelectTrigger data-testid="select-movement-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual_in">Entrada Manual</SelectItem>
                  <SelectItem value="manual_out">Saída Manual</SelectItem>
                  <SelectItem value="adjustment">Ajuste de Inventário</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantidade</Label>
              <Input data-testid="input-movement-qty" type="number" value={movForm.quantity || ""} onChange={e => setMovForm(f => ({ ...f, quantity: parseInt(e.target.value) || 0 }))} required min={1} />
            </div>
            <div>
              <Label>Motivo</Label>
              <Input data-testid="input-movement-reason" value={movForm.reason} onChange={e => setMovForm(f => ({ ...f, reason: e.target.value }))} />
            </div>
            <Button type="submit" className="w-full" data-testid="button-save-movement" disabled={movementMutation.isPending}>
              {movementMutation.isPending ? "Salvando..." : "Registrar"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {historyDialog !== null && (
        <StockHistoryDialog productId={historyDialog} onClose={() => setHistoryDialog(null)} />
      )}
    </div>
  );
}

function StockHistoryDialog({ productId, onClose }: { productId: number; onClose: () => void }) {
  const { data: movements = [], isLoading } = useQuery<StockMovement[]>({
    queryKey: ["/api/stock", productId, "movements"],
    queryFn: () => fetch(`/api/stock/${productId}/movements`).then(r => r.json()),
  });

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Histórico de Movimentação</DialogTitle></DialogHeader>
        {isLoading ? <p>Carregando...</p> : movements.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">Nenhuma movimentação</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Qtd</TableHead>
                <TableHead>Motivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.map(m => (
                <TableRow key={m.id}>
                  <TableCell>{new Date(m.createdAt).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell><Badge variant="outline">{STOCK_MOVEMENT_TYPES[m.type] || m.type}</Badge></TableCell>
                  <TableCell className={m.quantity > 0 ? "text-green-600" : "text-destructive"}>{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</TableCell>
                  <TableCell className="text-sm">{m.reason || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
