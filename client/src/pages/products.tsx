import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus, Package, Search, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import type { Product } from "@shared/schema";

export default function ProductsPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);

  const { data: products = [], isLoading } = useQuery<Product[]>({ queryKey: ["/api/products"] });

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

  const filtered = products.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "all" || p.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/products/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/products"] }); toast({ title: "Produto removido" }); },
  });

  const toggleMutation = useMutation({
    mutationFn: (p: Product) => apiRequest("PATCH", `/api/products/${p.id}`, { active: !p.active }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/products"] }); },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" data-testid="text-products-title">Produtos</h1>
        <Button data-testid="button-add-product" onClick={() => { setEditProduct(null); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Novo Produto
        </Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input data-testid="input-search-products" placeholder="Buscar produto..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48" data-testid="select-category-filter">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {categories.map(c => <SelectItem key={c} value={c!}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <Card key={i} className="animate-pulse"><CardContent className="h-48" /></Card>)}
        </div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum produto encontrado</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(product => (
            <Card key={product.id} data-testid={`card-product-${product.id}`} className={!product.active ? "opacity-60" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate" data-testid={`text-product-name-${product.id}`}>{product.name}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">SKU: {product.sku}</p>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-toggle-product-${product.id}`}
                      onClick={() => toggleMutation.mutate(product)}>
                      {product.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-edit-product-${product.id}`}
                      onClick={() => { setEditProduct(product); setDialogOpen(true); }}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" data-testid={`button-delete-product-${product.id}`}
                      onClick={() => { if (confirm("Remover produto?")) deleteMutation.mutate(product.id); }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {product.imageUrl && <img src={product.imageUrl} alt={product.name} className="w-full h-32 object-cover rounded-md" />}
                <div className="flex items-center gap-2 flex-wrap">
                  {product.category && <Badge variant="secondary">{product.category}</Badge>}
                  <Badge variant={product.productType === "physical" ? "default" : "outline"}>
                    {product.productType === "physical" ? "Físico" : "Digital"}
                  </Badge>
                  {!product.active && <Badge variant="destructive">Inativo</Badge>}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold" data-testid={`text-product-price-${product.id}`}>
                    R$ {parseFloat(product.price).toFixed(2)}
                  </span>
                  {product.productType === "physical" && (
                    <span className={`text-sm ${(product.stockQuantity || 0) <= (product.minStock || 0) ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                      Estoque: {product.stockQuantity || 0}
                    </span>
                  )}
                </div>
                {product.description && <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ProductDialog open={dialogOpen} onOpenChange={setDialogOpen} product={editProduct} />
    </div>
  );
}

function ProductDialog({ open, onOpenChange, product }: { open: boolean; onOpenChange: (v: boolean) => void; product: Product | null }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: "", description: "", category: "", price: "", internalCode: "", imageUrl: "",
    active: true, productType: "physical" as "physical" | "digital",
    stockQuantity: 0, minStock: 0,
    sizes: "", colors: "", models: "",
  });

  const resetForm = () => {
    if (product) {
      const v = product.variations as any;
      setForm({
        name: product.name, description: product.description || "", category: product.category || "",
        price: product.price, internalCode: product.internalCode || "", imageUrl: product.imageUrl || "",
        active: product.active !== false, productType: product.productType as "physical" | "digital",
        stockQuantity: product.stockQuantity || 0, minStock: product.minStock || 0,
        sizes: v?.sizes?.join(", ") || "", colors: v?.colors?.join(", ") || "", models: v?.models?.join(", ") || "",
      });
    } else {
      setForm({ name: "", description: "", category: "", price: "", internalCode: "", imageUrl: "", active: true, productType: "physical", stockQuantity: 0, minStock: 0, sizes: "", colors: "", models: "" });
    }
  };

  const mutation = useMutation({
    mutationFn: (data: any) => product ? apiRequest("PATCH", `/api/products/${product.id}`, data) : apiRequest("POST", "/api/products", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: product ? "Produto atualizado" : "Produto criado" });
      onOpenChange(false);
    },
    onError: (err: any) => { toast({ title: "Erro", description: err.message, variant: "destructive" }); },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const variations: any = {};
    if (form.sizes.trim()) variations.sizes = form.sizes.split(",").map(s => s.trim()).filter(Boolean);
    if (form.colors.trim()) variations.colors = form.colors.split(",").map(s => s.trim()).filter(Boolean);
    if (form.models.trim()) variations.models = form.models.split(",").map(s => s.trim()).filter(Boolean);

    mutation.mutate({
      name: form.name, description: form.description || null, category: form.category || null,
      price: form.price, internalCode: form.internalCode || null, imageUrl: form.imageUrl || null,
      active: form.active, productType: form.productType,
      stockQuantity: form.productType === "physical" ? form.stockQuantity : 0,
      minStock: form.productType === "physical" ? form.minStock : 0,
      variations: Object.keys(variations).length > 0 ? variations : null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (v) resetForm(); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? "Editar Produto" : "Novo Produto"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nome *</Label>
            <Input data-testid="input-product-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea data-testid="input-product-description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Categoria</Label>
              <Input data-testid="input-product-category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
            </div>
            <div>
              <Label>Preço *</Label>
              <Input data-testid="input-product-price" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Código Interno</Label>
              <Input data-testid="input-product-code" value={form.internalCode} onChange={e => setForm(f => ({ ...f, internalCode: e.target.value }))} />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={form.productType} onValueChange={(v: any) => setForm(f => ({ ...f, productType: v }))}>
                <SelectTrigger data-testid="select-product-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="physical">Físico</SelectItem>
                  <SelectItem value="digital">Digital</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>URL da Imagem</Label>
            <Input data-testid="input-product-image" value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} />
          </div>
          {form.productType === "physical" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Quantidade em Estoque</Label>
                <Input data-testid="input-product-stock" type="number" value={form.stockQuantity} onChange={e => setForm(f => ({ ...f, stockQuantity: parseInt(e.target.value) || 0 }))} />
              </div>
              <div>
                <Label>Estoque Mínimo</Label>
                <Input data-testid="input-product-min-stock" type="number" value={form.minStock} onChange={e => setForm(f => ({ ...f, minStock: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Variações (separar por vírgula)</Label>
            <Input data-testid="input-product-sizes" placeholder="Tamanhos: P, M, G, GG" value={form.sizes} onChange={e => setForm(f => ({ ...f, sizes: e.target.value }))} />
            <Input data-testid="input-product-colors" placeholder="Cores: Preto, Branco, Azul" value={form.colors} onChange={e => setForm(f => ({ ...f, colors: e.target.value }))} />
            <Input data-testid="input-product-models" placeholder="Modelos: Básico, Premium" value={form.models} onChange={e => setForm(f => ({ ...f, models: e.target.value }))} />
          </div>
          <div className="flex items-center gap-2">
            <Switch data-testid="switch-product-active" checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} />
            <Label>Produto ativo</Label>
          </div>
          <Button type="submit" className="w-full" data-testid="button-save-product" disabled={mutation.isPending}>
            {mutation.isPending ? "Salvando..." : product ? "Atualizar" : "Criar Produto"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
