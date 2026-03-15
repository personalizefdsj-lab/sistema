import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Plus, Package, Search, Pencil, Trash2, Eye, EyeOff,
  ChevronDown, ChevronRight, Layers, Tag
} from "lucide-react";
import type { Product } from "@shared/schema";

export default function ProductsPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [expandedParents, setExpandedParents] = useState<Set<number>>(new Set());

  const { data: products = [], isLoading } = useQuery<Product[]>({ queryKey: ["/api/products"] });

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

  const parentProducts = useMemo(() => products.filter(p => !p.parentId), [products]);
  const childrenMap = useMemo(() => {
    const map: Record<number, Product[]> = {};
    products.forEach(p => {
      if (p.parentId) {
        if (!map[p.parentId]) map[p.parentId] = [];
        map[p.parentId].push(p);
      }
    });
    return map;
  }, [products]);

  const filtered = parentProducts.filter(p => {
    const children = childrenMap[p.id] || [];
    const allNames = [p.name, ...children.map(c => c.name)].join(" ").toLowerCase();
    const matchSearch = !search || allNames.includes(search.toLowerCase());
    const matchCat = categoryFilter === "all" || p.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const toggleExpand = (id: number) => {
    setExpandedParents(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

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
        <div className="space-y-3">
          {filtered.map(product => {
            const children = childrenMap[product.id] || [];
            const hasChildren = children.length > 0;
            const isExpanded = expandedParents.has(product.id);

            return (
              <div key={product.id}>
                <Card data-testid={`card-product-${product.id}`} className={`${!product.active ? "opacity-60" : ""}`}>
                  <CardContent className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      {hasChildren && (
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0"
                          onClick={() => toggleExpand(product.id)}
                          data-testid={`button-expand-product-${product.id}`}
                        >
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </Button>
                      )}
                      {!hasChildren && <div className="w-8" />}

                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="w-12 h-12 object-cover rounded-md flex-shrink-0" />
                      ) : (
                        <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center flex-shrink-0">
                          <Package className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold truncate" data-testid={`text-product-name-${product.id}`}>{product.name}</span>
                          {hasChildren && (
                            <Badge variant="secondary" className="gap-1">
                              <Layers className="w-3 h-3" />
                              {children.length} variações
                            </Badge>
                          )}
                          {product.category && <Badge variant="outline">{product.category}</Badge>}
                          {!product.active && <Badge variant="destructive">Inativo</Badge>}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span>SKU: {product.sku}</span>
                          {!hasChildren && product.productType === "physical" && (
                            <span className={`${(product.stockQuantity || 0) <= (product.minStock || 0) ? "text-destructive font-medium" : ""}`}>
                              Estoque: {product.stockQuantity || 0}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <p className="font-semibold" data-testid={`text-product-price-${product.id}`}>
                          R$ {parseFloat(product.price).toFixed(2)}
                        </p>
                        {product.wholesalePrice && (
                          <p className="text-xs text-muted-foreground">
                            Atacado: R$ {parseFloat(product.wholesalePrice).toFixed(2)}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-1 ml-2 flex-shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-toggle-product-${product.id}`}
                          onClick={() => toggleMutation.mutate(product)}>
                          {product.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-edit-product-${product.id}`}
                          onClick={() => { setEditProduct(product); setDialogOpen(true); }}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" data-testid={`button-delete-product-${product.id}`}
                          onClick={() => { if (confirm(hasChildren ? `Remover "${product.name}" e suas ${children.length} variações?` : "Remover produto?")) deleteMutation.mutate(product.id); }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {hasChildren && isExpanded && (
                  <div className="ml-8 mt-1 space-y-1">
                    {children.map(child => (
                      <Card key={child.id} data-testid={`card-product-child-${child.id}`} className={`border-l-4 border-l-primary/30 ${!child.active ? "opacity-60" : ""}`}>
                        <CardContent className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <Tag className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium" data-testid={`text-product-name-${child.id}`}>
                                  {child.variationLabel || child.name}
                                </span>
                                {!child.active && <Badge variant="destructive" className="text-xs">Inativo</Badge>}
                              </div>
                              <span className="text-xs text-muted-foreground">SKU: {child.sku}</span>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-semibold">R$ {parseFloat(child.price).toFixed(2)}</p>
                              {child.wholesalePrice && (
                                <p className="text-[10px] text-muted-foreground">Atac: R$ {parseFloat(child.wholesalePrice).toFixed(2)}</p>
                              )}
                            </div>
                            {child.productType === "physical" && (
                              <span className={`text-xs flex-shrink-0 ${(child.stockQuantity || 0) <= (child.minStock || 0) ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                                Est: {child.stockQuantity || 0}
                              </span>
                            )}
                            <div className="flex gap-1 flex-shrink-0">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleMutation.mutate(child)}>
                                {child.active ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" data-testid={`button-edit-child-${child.id}`}
                                onClick={() => { setEditProduct(child); setDialogOpen(true); }}>
                                <Pencil className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ProductDialog open={dialogOpen} onOpenChange={setDialogOpen} product={editProduct} />
    </div>
  );
}

function ProductDialog({ open, onOpenChange, product }: { open: boolean; onOpenChange: (v: boolean) => void; product: Product | null }) {
  const { toast } = useToast();
  const isChild = !!product?.parentId;

  const [form, setForm] = useState({
    name: "", description: "", category: "", price: "", wholesalePrice: "", wholesaleMinQty: 1,
    internalCode: "", imageUrl: "",
    active: true, productType: "physical" as "physical" | "digital",
    stockQuantity: 0, minStock: 0,
    sizes: "", colors: "", models: "",
    generateChildren: true,
    ncm: "", cfop: "", unidade: "UN",
  });

  const [childPreviews, setChildPreviews] = useState<{ label: string; price: string; wholesalePrice: string; stock: number }[]>([]);

  useEffect(() => {
    if (!open) return;
    if (product) {
      const v = product.variations as any;
      setForm({
        name: product.name, description: product.description || "", category: product.category || "",
        price: product.price, wholesalePrice: product.wholesalePrice || "",
        wholesaleMinQty: product.wholesaleMinQty || 1,
        internalCode: product.internalCode || "", imageUrl: product.imageUrl || "",
        active: product.active !== false, productType: product.productType as "physical" | "digital",
        stockQuantity: product.stockQuantity || 0, minStock: product.minStock || 0,
        sizes: v?.sizes?.join(", ") || "", colors: v?.colors?.join(", ") || "", models: v?.models?.join(", ") || "",
        generateChildren: false,
        ncm: (product as any).ncm || "", cfop: (product as any).cfop || "", unidade: (product as any).unidade || "UN",
      });
      setChildPreviews([]);
    } else {
      setForm({
        name: "", description: "", category: "", price: "", wholesalePrice: "", wholesaleMinQty: 1,
        internalCode: "", imageUrl: "", active: true, productType: "physical",
        stockQuantity: 0, minStock: 0, sizes: "", colors: "", models: "",
        generateChildren: true,
        ncm: "", cfop: "", unidade: "UN",
      });
      setChildPreviews([]);
    }
  }, [open, product]);

  useEffect(() => {
    if (!product && form.generateChildren) {
      const dims: string[][] = [];
      const parseDim = (s: string) => s.split(",").map(v => v.trim()).filter(Boolean);
      if (form.sizes.trim()) dims.push(parseDim(form.sizes));
      if (form.colors.trim()) dims.push(parseDim(form.colors));
      if (form.models.trim()) dims.push(parseDim(form.models));

      if (dims.length === 0) { setChildPreviews([]); return; }

      const cartesian = (arrays: string[][]): string[][] => {
        if (arrays.length === 0) return [[]];
        const [first, ...rest] = arrays;
        const restCombos = cartesian(rest);
        return first.flatMap(item => restCombos.map(combo => [item, ...combo]));
      };

      const combos = cartesian(dims);
      setChildPreviews(combos.map(c => ({
        label: c.join(" / "),
        price: form.price,
        wholesalePrice: form.wholesalePrice,
        stock: form.stockQuantity,
      })));
    } else {
      setChildPreviews([]);
    }
  }, [form.sizes, form.colors, form.models, form.price, form.wholesalePrice, form.stockQuantity, form.generateChildren, product]);

  const updateChildPreview = (index: number, field: string, value: any) => {
    setChildPreviews(prev => prev.map((cp, i) => i === index ? { ...cp, [field]: value } : cp));
  };

  const mutation = useMutation({
    mutationFn: (data: any) => product ? apiRequest("PATCH", `/api/products/${product.id}`, data) : apiRequest("POST", "/api/products", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: product ? "Produto atualizado" : "Produto criado com sucesso" });
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

    const childOverrides: Record<string, any> = {};
    if (form.generateChildren && childPreviews.length > 0) {
      childPreviews.forEach(cp => {
        if (cp.price !== form.price || cp.wholesalePrice !== form.wholesalePrice || cp.stock !== form.stockQuantity) {
          childOverrides[cp.label] = {};
          if (cp.price !== form.price) childOverrides[cp.label].price = cp.price;
          if (cp.wholesalePrice !== form.wholesalePrice) childOverrides[cp.label].wholesalePrice = cp.wholesalePrice;
          if (cp.stock !== form.stockQuantity) childOverrides[cp.label].stockQuantity = cp.stock;
        }
      });
    }

    mutation.mutate({
      name: form.name, description: form.description || null, category: form.category || null,
      price: form.price, wholesalePrice: form.wholesalePrice || null,
      wholesaleMinQty: form.wholesaleMinQty || 1,
      internalCode: form.internalCode || null, imageUrl: form.imageUrl || null,
      active: form.active, productType: form.productType,
      stockQuantity: form.productType === "physical" ? form.stockQuantity : 0,
      minStock: form.productType === "physical" ? form.minStock : 0,
      variations: Object.keys(variations).length > 0 ? variations : null,
      generateChildren: !product && form.generateChildren && childPreviews.length > 0,
      childOverrides: Object.keys(childOverrides).length > 0 ? childOverrides : undefined,
      ncm: form.ncm || null, cfop: form.cfop || null, unidade: form.unidade || "UN",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {product ? (isChild ? `Editar Variação: ${product.variationLabel || product.name}` : "Editar Produto") : "Novo Produto"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nome *</Label>
            <Input data-testid="input-product-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          {!isChild && (
            <div>
              <Label>Descrição</Label>
              <Textarea data-testid="input-product-description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            {!isChild && (
              <div>
                <Label>Categoria</Label>
                <Input data-testid="input-product-category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
              </div>
            )}
            <div>
              <Label>Preço Varejo *</Label>
              <Input data-testid="input-product-price" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} required placeholder="0.00" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Preço Atacado</Label>
              <Input data-testid="input-product-wholesale-price" value={form.wholesalePrice} onChange={e => setForm(f => ({ ...f, wholesalePrice: e.target.value }))} placeholder="0.00" />
            </div>
            <div>
              <Label>Qtd Mínima Atacado</Label>
              <Input data-testid="input-product-wholesale-qty" type="number" value={form.wholesaleMinQty} onChange={e => setForm(f => ({ ...f, wholesaleMinQty: parseInt(e.target.value) || 1 }))} min={1} />
            </div>
          </div>
          {!isChild && (
            <>
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
            </>
          )}
          <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
            <Label className="text-sm font-semibold">Dados Fiscais (NF-e)</Label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">NCM</Label>
                <Input data-testid="input-product-ncm" value={form.ncm} onChange={e => setForm(f => ({ ...f, ncm: e.target.value }))} placeholder="00000000" />
              </div>
              <div>
                <Label className="text-xs">CFOP</Label>
                <Input data-testid="input-product-cfop" value={form.cfop} onChange={e => setForm(f => ({ ...f, cfop: e.target.value }))} placeholder="5102" />
              </div>
              <div>
                <Label className="text-xs">Unidade</Label>
                <Input data-testid="input-product-unidade" value={form.unidade} onChange={e => setForm(f => ({ ...f, unidade: e.target.value }))} placeholder="UN" />
              </div>
            </div>
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
          {!isChild && !product && (
            <>
              <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Variações (Gerar sub-produtos automaticamente)</Label>
                  <div className="flex items-center gap-2">
                    <Switch data-testid="switch-generate-children" checked={form.generateChildren} onCheckedChange={v => setForm(f => ({ ...f, generateChildren: v }))} />
                    <Label className="text-xs">Gerar</Label>
                  </div>
                </div>
                <Input data-testid="input-product-sizes" placeholder="Tamanhos: P, M, G, GG" value={form.sizes} onChange={e => setForm(f => ({ ...f, sizes: e.target.value }))} />
                <Input data-testid="input-product-colors" placeholder="Cores: Preto, Branco, Azul" value={form.colors} onChange={e => setForm(f => ({ ...f, colors: e.target.value }))} />
                <Input data-testid="input-product-models" placeholder="Modelos: Básico, Premium" value={form.models} onChange={e => setForm(f => ({ ...f, models: e.target.value }))} />
              </div>

              {form.generateChildren && childPreviews.length > 0 && (
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <Layers className="w-4 h-4" />
                      {childPreviews.length} sub-produtos serão criados
                    </Label>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {childPreviews.map((cp, i) => (
                      <div key={cp.label} className="flex items-center gap-2 p-2 bg-muted/50 rounded text-sm" data-testid={`preview-child-${i}`}>
                        <Tag className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium flex-1 truncate">{form.name} {cp.label}</span>
                        <Input
                          className="w-24 h-7 text-xs"
                          placeholder="Varejo"
                          value={cp.price}
                          onChange={e => updateChildPreview(i, "price", e.target.value)}
                        />
                        <Input
                          className="w-24 h-7 text-xs"
                          placeholder="Atacado"
                          value={cp.wholesalePrice}
                          onChange={e => updateChildPreview(i, "wholesalePrice", e.target.value)}
                        />
                        {form.productType === "physical" && (
                          <Input
                            className="w-20 h-7 text-xs"
                            type="number"
                            placeholder="Est."
                            value={cp.stock}
                            onChange={e => updateChildPreview(i, "stock", parseInt(e.target.value) || 0)}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          {!isChild && product && (
            <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
              <Label className="text-sm font-medium">Variações (separar por vírgula)</Label>
              <Input data-testid="input-product-sizes" placeholder="Tamanhos: P, M, G, GG" value={form.sizes} onChange={e => setForm(f => ({ ...f, sizes: e.target.value }))} />
              <Input data-testid="input-product-colors" placeholder="Cores: Preto, Branco, Azul" value={form.colors} onChange={e => setForm(f => ({ ...f, colors: e.target.value }))} />
              <Input data-testid="input-product-models" placeholder="Modelos: Básico, Premium" value={form.models} onChange={e => setForm(f => ({ ...f, models: e.target.value }))} />
            </div>
          )}
          <div className="flex items-center gap-2">
            <Switch data-testid="switch-product-active" checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} />
            <Label>Produto ativo</Label>
          </div>
          <Button type="submit" className="w-full" data-testid="button-save-product" disabled={mutation.isPending}>
            {mutation.isPending ? "Salvando..." : product ? "Atualizar" : (childPreviews.length > 0 ? `Criar Produto + ${childPreviews.length} Variações` : "Criar Produto")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
