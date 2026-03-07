import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import type { Product, Client } from "@shared/schema";
import {
  Search, Plus, Minus, Trash2, ShoppingCart, User,
  PackageOpen, X, Check
} from "lucide-react";

type CartItem = {
  productId: number;
  name: string;
  unitPrice: number;
  quantity: number;
  imageUrl?: string | null;
};

export default function PdvPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showClientDialog, setShowClientDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: searchedClients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients", `?search=${clientSearch}`],
    enabled: clientSearch.length >= 2,
  });

  const filteredProducts = useMemo(() => {
    const active = products.filter(
      (p) => p.active && !products.some((child) => child.parentId === p.id)
    );
    if (!searchTerm) return active;
    const lower = searchTerm.toLowerCase();
    return active.filter(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        p.sku.toLowerCase().includes(lower)
    );
  }, [products, searchTerm]);

  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [cart]
  );

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          unitPrice: parseFloat(product.price),
          quantity: 1,
          imageUrl: product.imageUrl,
        },
      ];
    });
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) =>
          i.productId === productId
            ? { ...i, quantity: i.quantity + delta }
            : i
        )
        .filter((i) => i.quantity > 0)
    );
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  };

  const finalizeMutation = useMutation({
    mutationFn: async () => {
      let clientId = selectedClient?.id;

      if (!clientId) {
        const clientRes = await apiRequest("POST", "/api/clients", {
          name: "Cliente Balcão",
          phone: null,
          email: null,
        });
        const newClient = await clientRes.json();
        clientId = newClient.id;
      }

      const totalValue = cartTotal.toFixed(2);

      const orderRes = await apiRequest("POST", "/api/orders", {
        clientId,
        type: "order",
        totalValue,
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toFixed(2),
        })),
      });
      const order = await orderRes.json();

      await apiRequest("PATCH", `/api/orders/${order.id}`, {
        status: "finished",
      });

      await apiRequest("POST", "/api/financial", {
        type: "income",
        category: "venda",
        description: `Venda PDV - ${order.code}`,
        amount: totalValue,
        date: new Date().toISOString(),
      });

      return order;
    },
    onSuccess: (order) => {
      toast({
        title: "Venda finalizada",
        description: `Pedido ${order.code} criado com sucesso!`,
      });
      setCart([]);
      setSelectedClient(null);
      setShowConfirmDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/financial"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao finalizar venda",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFinalize = () => {
    if (cart.length === 0) {
      toast({
        title: "Carrinho vazio",
        description: "Adicione produtos ao carrinho antes de finalizar.",
        variant: "destructive",
      });
      return;
    }
    setShowConfirmDialog(true);
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="flex h-full" data-testid="pdv-page">
      <div className="flex-1 flex flex-col min-w-0 p-4 gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              data-testid="input-product-search"
              placeholder="Buscar produto por nome ou SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            data-testid="button-select-client"
            variant="outline"
            onClick={() => setShowClientDialog(true)}
          >
            <User className="mr-2 h-4 w-4" />
            {selectedClient ? selectedClient.name : "Selecionar Cliente"}
          </Button>
          {selectedClient && (
            <Button
              data-testid="button-clear-client"
              variant="ghost"
              size="icon"
              onClick={() => setSelectedClient(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {productsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-md" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <PackageOpen className="h-12 w-12" />
            <p>Nenhum produto encontrado</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filteredProducts.map((product) => (
                <Card
                  key={product.id}
                  data-testid={`card-product-${product.id}`}
                  className="cursor-pointer hover-elevate active-elevate-2 overflow-visible"
                  onClick={() => addToCart(product)}
                >
                  <CardContent className="p-3 flex flex-col gap-2">
                    {product.imageUrl ? (
                      <div className="aspect-square rounded-md overflow-hidden bg-muted">
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="aspect-square rounded-md bg-muted flex items-center justify-center">
                        <PackageOpen className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <p
                      className="text-sm font-medium line-clamp-2"
                      data-testid={`text-product-name-${product.id}`}
                    >
                      {product.name}
                    </p>
                    <Badge variant="secondary" className="w-fit no-default-active-elevate">
                      {formatCurrency(parseFloat(product.price))}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="w-80 lg:w-96 border-l flex flex-col bg-card">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Carrinho
            {cart.length > 0 && (
              <Badge variant="secondary" data-testid="badge-cart-count">
                {cart.reduce((s, i) => s + i.quantity, 0)}
              </Badge>
            )}
          </h2>
        </div>

        <div className="flex-1 overflow-auto p-4 flex flex-col gap-3">
          {cart.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <ShoppingCart className="h-10 w-10" />
              <p className="text-sm">Carrinho vazio</p>
            </div>
          ) : (
            cart.map((item) => (
              <Card key={item.productId} data-testid={`card-cart-item-${item.productId}`}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-medium truncate"
                        data-testid={`text-cart-item-name-${item.productId}`}
                      >
                        {item.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(item.unitPrice)} un.
                      </p>
                    </div>
                    <Button
                      data-testid={`button-remove-item-${item.productId}`}
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFromCart(item.productId)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-2">
                    <div className="flex items-center gap-1">
                      <Button
                        data-testid={`button-qty-minus-${item.productId}`}
                        variant="outline"
                        size="icon"
                        onClick={() => updateQuantity(item.productId, -1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span
                        className="w-8 text-center text-sm font-medium"
                        data-testid={`text-qty-${item.productId}`}
                      >
                        {item.quantity}
                      </span>
                      <Button
                        data-testid={`button-qty-plus-${item.productId}`}
                        variant="outline"
                        size="icon"
                        onClick={() => updateQuantity(item.productId, 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <p
                      className="text-sm font-semibold"
                      data-testid={`text-subtotal-${item.productId}`}
                    >
                      {formatCurrency(item.unitPrice * item.quantity)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="border-t p-4 flex flex-col gap-3">
          {selectedClient && (
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="truncate" data-testid="text-selected-client">
                {selectedClient.name}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-xl font-bold" data-testid="text-cart-total">
              {formatCurrency(cartTotal)}
            </span>
          </div>
          <Button
            data-testid="button-finalize-sale"
            className="w-full"
            size="lg"
            onClick={handleFinalize}
            disabled={cart.length === 0 || finalizeMutation.isPending}
          >
            <Check className="mr-2 h-4 w-4" />
            Finalizar Venda
          </Button>
        </div>
      </div>

      <Dialog open={showClientDialog} onOpenChange={setShowClientDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Selecionar Cliente</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                data-testid="input-client-search"
                placeholder="Buscar cliente por nome ou telefone..."
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="max-h-64 overflow-auto flex flex-col gap-1">
              {clientSearch.length < 2 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Digite ao menos 2 caracteres para buscar
                </p>
              ) : searchedClients.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum cliente encontrado
                </p>
              ) : (
                searchedClients.map((client) => (
                  <Button
                    key={client.id}
                    data-testid={`button-select-client-${client.id}`}
                    variant="ghost"
                    className="justify-start"
                    onClick={() => {
                      setSelectedClient(client);
                      setShowClientDialog(false);
                      setClientSearch("");
                    }}
                  >
                    <User className="mr-2 h-4 w-4" />
                    <span className="truncate">{client.name}</span>
                    {client.phone && (
                      <span className="ml-auto text-xs text-muted-foreground">
                        {client.phone}
                      </span>
                    )}
                  </Button>
                ))
              )}
            </div>
            <Button
              data-testid="button-no-client"
              variant="outline"
              onClick={() => {
                setSelectedClient(null);
                setShowClientDialog(false);
                setClientSearch("");
              }}
            >
              Continuar sem cliente (Cliente Balcão)
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Venda</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              {cart.map((item) => (
                <div
                  key={item.productId}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="truncate">
                    {item.quantity}x {item.name}
                  </span>
                  <span className="font-medium">
                    {formatCurrency(item.unitPrice * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t pt-3 flex items-center justify-between gap-2">
              <span className="font-semibold">Total</span>
              <span className="text-lg font-bold" data-testid="text-confirm-total">
                {formatCurrency(cartTotal)}
              </span>
            </div>
            {selectedClient && (
              <p className="text-sm text-muted-foreground">
                Cliente: {selectedClient.name}
              </p>
            )}
            {!selectedClient && (
              <p className="text-sm text-muted-foreground">
                Sem cliente selecionado — será criado como &quot;Cliente Balcão&quot;
              </p>
            )}
            <div className="flex gap-2">
              <Button
                data-testid="button-cancel-sale"
                variant="outline"
                className="flex-1"
                onClick={() => setShowConfirmDialog(false)}
              >
                Cancelar
              </Button>
              <Button
                data-testid="button-confirm-sale"
                className="flex-1"
                onClick={() => finalizeMutation.mutate()}
                disabled={finalizeMutation.isPending}
              >
                {finalizeMutation.isPending ? "Finalizando..." : "Confirmar Venda"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
