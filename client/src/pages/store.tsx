import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ShoppingCart, Plus, Minus, X, Store as StoreIcon, UserCircle, Lock } from "lucide-react";
import type { Product } from "@shared/schema";
import CheckoutPage from "./checkout";

type CartItem = { product: Product; quantity: number; variation?: string };

export default function PublicStore() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [storeError, setStoreError] = useState<"not_found" | "plan_restricted" | null>(null);
  const { data: company, isLoading: companyLoading } = useQuery<any>({
    queryKey: ["/api/store", slug],
    queryFn: async () => {
      const r = await fetch(`/api/store/${slug}`);
      if (r.status === 403) { setStoreError("plan_restricted"); throw new Error("plan_restricted"); }
      if (!r.ok) { setStoreError("not_found"); throw new Error("not_found"); }
      setStoreError(null);
      return r.json();
    },
    retry: false,
  });

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/store", slug, "products"],
    queryFn: () => fetch(`/api/store/${slug}/products`).then(r => r.json()),
    enabled: !!company,
  });

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
  const filtered = products.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "all" || p.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const addToCart = (product: Product, variation?: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id && i.variation === variation);
      if (existing) return prev.map(i => i.product.id === product.id && i.variation === variation ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product, quantity: 1, variation }];
    });
  };

  const updateCartQuantity = (productId: number, variation: string | undefined, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.product.id === productId && i.variation === variation) {
        const newQty = i.quantity + delta;
        return newQty > 0 ? { ...i, quantity: newQty } : i;
      }
      return i;
    }).filter(i => i.quantity > 0));
  };

  const removeFromCart = (productId: number, variation?: string) => {
    setCart(prev => prev.filter(i => !(i.product.id === productId && i.variation === variation)));
  };

  const cartTotal = cart.reduce((sum, i) => sum + parseFloat(i.product.price) * i.quantity, 0);
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  if (companyLoading) return <div className="flex items-center justify-center min-h-screen"><p className="text-lg">Carregando loja...</p></div>;
  if (storeError === "plan_restricted") return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-amber-600" />
        </div>
        <h1 className="text-xl font-bold mb-2" data-testid="text-store-unavailable">Loja Online Indisponível</h1>
        <p className="text-muted-foreground mb-4">
          Esta loja ainda não está ativa. O plano atual da empresa não inclui a loja online.
        </p>
        <p className="text-sm text-muted-foreground">
          Entre em contato com a empresa para mais informações.
        </p>
      </div>
    </div>
  );
  if (storeError === "not_found") return <div className="flex items-center justify-center min-h-screen"><p className="text-lg text-destructive">Loja não encontrada</p></div>;

  if (showCheckout) {
    return <CheckoutPage slug={slug!} cart={cart} company={company} onBack={() => setShowCheckout(false)} onSuccess={() => { setCart([]); setShowCheckout(false); }} />;
  }

  const primaryColor = company?.primaryColor || "#3B82F6";

  return (
    <div className="min-h-screen bg-background">
      {company?.bannerUrl && (
        <div className="w-full h-48 md:h-64 overflow-hidden">
          <img src={company.bannerUrl} alt="Banner" className="w-full h-full object-cover" />
        </div>
      )}

      <header className="border-b sticky top-0 bg-background z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {company?.logoUrl ? (
              <img src={company.logoUrl} alt={company.name} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
                <StoreIcon className="w-5 h-5 text-white" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold" data-testid="text-store-name">{company?.name}</h1>
              {company?.description && <p className="text-sm text-muted-foreground">{company.description}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`/portal/${slug}`}
              data-testid="link-client-portal"
              className="inline-flex items-center justify-center gap-1.5 rounded-md border border-input bg-background px-3 h-9 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
            >
              <UserCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Meus Pedidos</span>
            </a>
            <Button variant="outline" className="relative" data-testid="button-open-cart" onClick={() => setShowCart(!showCart)}>
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full text-xs flex items-center justify-center text-white" style={{ backgroundColor: primaryColor }}>
                  {cartCount}
                </span>
              )}
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input data-testid="input-store-search" placeholder="Buscar produto..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          {categories.length > 0 && (
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48" data-testid="select-store-category">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categories.map(c => <SelectItem key={c} value={c!}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        {selectedProduct ? (
          <ProductDetail product={selectedProduct} primaryColor={primaryColor} onBack={() => setSelectedProduct(null)} onAddToCart={addToCart} />
        ) : (
          <>
            {productsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[1,2,3,4].map(i => <Card key={i} className="animate-pulse"><CardContent className="h-64" /></Card>)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">Nenhum produto encontrado</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filtered.map(product => (
                  <Card key={product.id} data-testid={`card-store-product-${product.id}`} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedProduct(product)}>
                    <CardContent className="p-0">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="w-full h-40 object-cover rounded-t-lg" />
                      ) : (
                        <div className="w-full h-40 bg-muted flex items-center justify-center rounded-t-lg">
                          <StoreIcon className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                      <div className="p-3 space-y-1">
                        <h3 className="font-medium text-sm truncate" data-testid={`text-store-product-name-${product.id}`}>{product.name}</h3>
                        {product.category && <Badge variant="secondary" className="text-xs">{product.category}</Badge>}
                        <p className="text-lg font-bold" style={{ color: primaryColor }} data-testid={`text-store-product-price-${product.id}`}>
                          R$ {parseFloat(product.price).toFixed(2)}
                        </p>
                        <Button size="sm" className="w-full mt-2" style={{ backgroundColor: primaryColor }} data-testid={`button-add-to-cart-${product.id}`}
                          onClick={e => { e.stopPropagation(); addToCart(product); }}>
                          <Plus className="w-3 h-3 mr-1" /> Adicionar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {showCart && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowCart(false)}>
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-background shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-bold">Carrinho</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowCart(false)} data-testid="button-close-cart"><X className="w-5 h-5" /></Button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto" style={{ maxHeight: "calc(100vh - 180px)" }}>
              {cart.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Carrinho vazio</p>
              ) : (
                <div className="space-y-3">
                  {cart.map((item, idx) => (
                    <div key={`${item.product.id}-${item.variation}-${idx}`} className="flex items-center gap-3 border rounded-lg p-3" data-testid={`cart-item-${item.product.id}`}>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.product.name}</p>
                        {item.variation && <p className="text-xs text-muted-foreground">{item.variation}</p>}
                        <p className="text-sm font-bold" style={{ color: primaryColor }}>R$ {(parseFloat(item.product.price) * item.quantity).toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="outline" className="h-7 w-7" data-testid={`button-cart-minus-${item.product.id}`}
                          onClick={() => updateCartQuantity(item.product.id, item.variation, -1)}>
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center text-sm">{item.quantity}</span>
                        <Button size="icon" variant="outline" className="h-7 w-7" data-testid={`button-cart-plus-${item.product.id}`}
                          onClick={() => updateCartQuantity(item.product.id, item.variation, 1)}>
                          <Plus className="w-3 h-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" data-testid={`button-cart-remove-${item.product.id}`}
                          onClick={() => removeFromCart(item.product.id, item.variation)}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {cart.length > 0 && (
              <div className="p-4 border-t space-y-3">
                <div className="flex items-center justify-between text-lg font-bold">
                  <span>Total</span>
                  <span data-testid="text-cart-total">R$ {cartTotal.toFixed(2)}</span>
                </div>
                <Button className="w-full" style={{ backgroundColor: primaryColor }} data-testid="button-checkout"
                  onClick={() => { setShowCart(false); setShowCheckout(true); }}>
                  Finalizar Compra
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ProductDetail({ product, primaryColor, onBack, onAddToCart }: { product: Product; primaryColor: string; onBack: () => void; onAddToCart: (p: Product, v?: string) => void }) {
  const [selectedVariation, setSelectedVariation] = useState("");
  const variations = product.variations as any;

  const allVariations: string[] = [];
  if (variations?.sizes) allVariations.push(...variations.sizes.map((s: string) => `Tamanho: ${s}`));
  if (variations?.colors) allVariations.push(...variations.colors.map((s: string) => `Cor: ${s}`));
  if (variations?.models) allVariations.push(...variations.models.map((s: string) => `Modelo: ${s}`));

  return (
    <div className="max-w-2xl mx-auto">
      <Button variant="ghost" onClick={onBack} className="mb-4" data-testid="button-back-to-store">← Voltar</Button>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="w-full rounded-lg" />
          ) : (
            <div className="w-full h-64 bg-muted flex items-center justify-center rounded-lg">
              <StoreIcon className="w-16 h-16 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="space-y-4">
          <h2 className="text-2xl font-bold" data-testid="text-product-detail-name">{product.name}</h2>
          {product.category && <Badge variant="secondary">{product.category}</Badge>}
          <p className="text-3xl font-bold" style={{ color: primaryColor }} data-testid="text-product-detail-price">
            R$ {parseFloat(product.price).toFixed(2)}
          </p>
          {product.description && <p className="text-muted-foreground">{product.description}</p>}
          {allVariations.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Variações</p>
              <div className="flex flex-wrap gap-2">
                {allVariations.map(v => (
                  <Badge key={v} variant={selectedVariation === v ? "default" : "outline"} className="cursor-pointer" data-testid={`badge-variation-${v}`}
                    onClick={() => setSelectedVariation(v === selectedVariation ? "" : v)}>
                    {v}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          <Button className="w-full" size="lg" style={{ backgroundColor: primaryColor }} data-testid="button-add-detail"
            onClick={() => { onAddToCart(product, selectedVariation || undefined); }}>
            <ShoppingCart className="w-5 h-5 mr-2" /> Adicionar ao Carrinho
          </Button>
        </div>
      </div>
    </div>
  );
}
