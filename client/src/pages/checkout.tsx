import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CheckCircle, ShoppingBag } from "lucide-react";
import type { Product } from "@shared/schema";

type CartItem = { product: Product; quantity: number; variation?: string };

interface CheckoutPageProps {
  slug: string;
  cart: CartItem[];
  company: any;
  onBack: () => void;
  onSuccess: () => void;
}

export default function CheckoutPage({ slug, cart, company, onBack, onSuccess }: CheckoutPageProps) {
  const { toast } = useToast();
  const [orderCode, setOrderCode] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "" });

  const total = cart.reduce((sum, i) => sum + parseFloat(i.product.price) * i.quantity, 0);
  const primaryColor = company?.primaryColor || "#3B82F6";

  const checkoutMutation = useMutation({
    mutationFn: () => fetch(`/api/store/${slug}/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name, phone: form.phone, email: form.email || null, address: form.address || null,
        items: cart.map(i => ({ productId: i.product.id, quantity: i.quantity, variation: i.variation || null })),
      }),
    }).then(r => { if (!r.ok) throw new Error("Erro ao finalizar compra"); return r.json(); }),
    onSuccess: (data) => {
      setOrderCode(data.code);
      toast({ title: "Pedido realizado!", description: `Código: ${data.code}` });
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  if (orderCode) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 space-y-4">
            <CheckCircle className="w-16 h-16 mx-auto" style={{ color: primaryColor }} />
            <h2 className="text-2xl font-bold">Pedido Realizado!</h2>
            <p className="text-muted-foreground">Seu pedido foi criado com sucesso</p>
            <div className="bg-muted rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Código do pedido</p>
              <p className="text-2xl font-mono font-bold" data-testid="text-order-code">{orderCode}</p>
            </div>
            <p className="text-sm text-muted-foreground">Guarde este código para acompanhar seu pedido</p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onSuccess} data-testid="button-continue-shopping">Continuar Comprando</Button>
              <Button className="flex-1" style={{ backgroundColor: primaryColor }} data-testid="button-track-order"
                onClick={() => window.open(`/rastrear/${orderCode}`, "_blank")}>
                Acompanhar Pedido
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-back-checkout">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Finalizar Compra</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Seus Dados</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Nome *</Label>
                <Input data-testid="input-checkout-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div>
                <Label>WhatsApp *</Label>
                <Input data-testid="input-checkout-phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} required placeholder="(00) 00000-0000" />
              </div>
              <div>
                <Label>Email</Label>
                <Input data-testid="input-checkout-email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <Label>Endereço</Label>
                <Input data-testid="input-checkout-address" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Resumo do Pedido</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {cart.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium text-sm">{item.product.name}</p>
                    {item.variation && <p className="text-xs text-muted-foreground">{item.variation}</p>}
                    <p className="text-xs text-muted-foreground">{item.quantity}x R$ {parseFloat(item.product.price).toFixed(2)}</p>
                  </div>
                  <p className="font-medium">R$ {(parseFloat(item.product.price) * item.quantity).toFixed(2)}</p>
                </div>
              ))}
              <div className="flex items-center justify-between pt-3 text-lg font-bold border-t">
                <span>Total</span>
                <span data-testid="text-checkout-total" style={{ color: primaryColor }}>R$ {total.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          <Button className="w-full" size="lg" style={{ backgroundColor: primaryColor }} data-testid="button-confirm-checkout"
            disabled={!form.name || !form.phone || checkoutMutation.isPending}
            onClick={() => checkoutMutation.mutate()}>
            <ShoppingBag className="w-5 h-5 mr-2" />
            {checkoutMutation.isPending ? "Processando..." : "Confirmar Pedido"}
          </Button>
        </div>
      </div>
    </div>
  );
}
