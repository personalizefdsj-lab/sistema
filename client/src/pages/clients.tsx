import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { Client, Order } from "@shared/schema";
import { Plus, Search, Users, Phone, Mail, Edit2, MapPin, FileText } from "lucide-react";
import { ORDER_STATUS_LABELS, FINANCIAL_STATUS_LABELS } from "@shared/schema";
import { format } from "date-fns";

export default function ClientsPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const { data: clients = [], isLoading } = useQuery<Client[]>({ queryKey: ["/api/clients"] });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/clients", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setCreateOpen(false);
      toast({ title: "Cliente criado com sucesso" });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await apiRequest("PATCH", `/api/clients/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setEditClient(null);
      toast({ title: "Cliente atualizado" });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const filtered = clients.filter(c => {
    const q = search.replace(/[\s\-\.]/g, "").toLowerCase();
    return q === "" ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone && c.phone.replace(/[\s\-\.]/g, "").includes(q)) ||
      (c.document && c.document.replace(/[\s\-\.\/]/g, "").includes(q));
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    createMutation.mutate({
      name: form.get("name"),
      phone: form.get("phone") || null,
      email: form.get("email") || null,
      personType: form.get("personType") || null,
      document: form.get("document") || null,
      address: form.get("address") || null,
      neighborhood: form.get("neighborhood") || null,
      streetNumber: form.get("streetNumber") || null,
      city: form.get("city") || null,
      state: form.get("state") || null,
    });
  };

  const handleEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editClient) return;
    const form = new FormData(e.currentTarget);
    updateMutation.mutate({
      id: editClient.id,
      name: form.get("name"),
      phone: form.get("phone") || null,
      email: form.get("email") || null,
      personType: form.get("personType") || null,
      document: form.get("document") || null,
      address: form.get("address") || null,
      neighborhood: form.get("neighborhood") || null,
      streetNumber: form.get("streetNumber") || null,
      city: form.get("city") || null,
      state: form.get("state") || null,
    });
  };

  return (
    <div className="p-6 space-y-6" data-testid="clients-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Clientes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {clients.length} cliente{clients.length !== 1 ? "s" : ""} cadastrado{clients.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-client">
              <Plus className="w-4 h-4 mr-2" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Cliente</DialogTitle>
            </DialogHeader>
            <ClientForm onSubmit={handleCreate} isPending={createMutation.isPending} submitLabel="Criar Cliente" testIdPrefix="create" />
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, telefone ou documento..."
          className="pl-9"
          value={search}
          onChange={e => setSearch(e.target.value)}
          data-testid="input-search-clients"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground" data-testid="text-no-clients">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Nenhum cliente encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(client => (
            <Card
              key={client.id}
              className="cursor-pointer hover-elevate"
              onClick={() => setSelectedClient(client)}
              data-testid={`card-client-${client.id}`}
            >
              <CardContent className="py-4 px-5">
                <div className="flex items-start justify-between gap-1">
                  <div className="min-w-0">
                    <p className="font-medium truncate" data-testid={`text-client-name-${client.id}`}>
                      {client.name}
                    </p>
                    {client.phone && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                        <Phone className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{client.phone}</span>
                      </div>
                    )}
                    {client.email && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                        <Mail className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{client.email}</span>
                      </div>
                    )}
                    {client.document && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                        <FileText className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{client.document}</span>
                      </div>
                    )}
                    {(client as any).city && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{(client as any).city}{(client as any).state ? ` - ${(client as any).state}` : ""}</span>
                      </div>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => { e.stopPropagation(); setEditClient(client); }}
                    data-testid={`button-edit-client-${client.id}`}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editClient} onOpenChange={(v) => !v && setEditClient(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
          </DialogHeader>
          {editClient && (
            <ClientForm
              onSubmit={handleEdit}
              isPending={updateMutation.isPending}
              submitLabel="Salvar"
              testIdPrefix="edit"
              defaultValues={editClient}
            />
          )}
        </DialogContent>
      </Dialog>

      <ClientOrdersModal client={selectedClient} onClose={() => setSelectedClient(null)} />
    </div>
  );
}

function ClientForm({
  onSubmit,
  isPending,
  submitLabel,
  testIdPrefix,
  defaultValues,
}: {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isPending: boolean;
  submitLabel: string;
  testIdPrefix: string;
  defaultValues?: Client;
}) {
  const [personType, setPersonType] = useState(defaultValues?.personType || "");

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Nome *</Label>
        <Input name="name" required defaultValue={defaultValues?.name || ""} data-testid={`input-${testIdPrefix}-client-name`} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Tipo de Pessoa</Label>
          <Select name="personType" value={personType} onValueChange={setPersonType}>
            <SelectTrigger data-testid={`select-${testIdPrefix}-person-type`}>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fisica">Pessoa Física</SelectItem>
              <SelectItem value="juridica">Pessoa Jurídica</SelectItem>
            </SelectContent>
          </Select>
          <input type="hidden" name="personType" value={personType} />
        </div>
        <div className="space-y-2">
          <Label>{personType === "juridica" ? "CNPJ" : "CPF"}</Label>
          <Input
            name="document"
            defaultValue={defaultValues?.document || ""}
            placeholder={personType === "juridica" ? "00.000.000/0000-00" : "000.000.000-00"}
            data-testid={`input-${testIdPrefix}-client-document`}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Celular</Label>
          <Input name="phone" defaultValue={defaultValues?.phone || ""} placeholder="(00) 00000-0000" data-testid={`input-${testIdPrefix}-client-phone`} />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input name="email" type="email" defaultValue={defaultValues?.email || ""} data-testid={`input-${testIdPrefix}-client-email`} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Endereço</Label>
        <Input name="address" defaultValue={defaultValues?.address || ""} placeholder="Rua, Avenida..." data-testid={`input-${testIdPrefix}-client-address`} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label>Número</Label>
          <Input name="streetNumber" defaultValue={(defaultValues as any)?.streetNumber || ""} data-testid={`input-${testIdPrefix}-client-number`} />
        </div>
        <div className="col-span-2 space-y-2">
          <Label>Bairro</Label>
          <Input name="neighborhood" defaultValue={(defaultValues as any)?.neighborhood || ""} data-testid={`input-${testIdPrefix}-client-neighborhood`} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Cidade</Label>
          <Input name="city" defaultValue={(defaultValues as any)?.city || ""} data-testid={`input-${testIdPrefix}-client-city`} />
        </div>
        <div className="space-y-2">
          <Label>Estado</Label>
          <Input name="state" defaultValue={(defaultValues as any)?.state || ""} placeholder="UF" maxLength={2} data-testid={`input-${testIdPrefix}-client-state`} />
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={isPending} data-testid={`button-${testIdPrefix}-client`}>
        {isPending ? "Salvando..." : submitLabel}
      </Button>
    </form>
  );
}

function ClientOrdersModal({ client, onClose }: { client: Client | null; onClose: () => void }) {
  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ["/api/orders/client", client?.id],
    enabled: !!client,
  });

  if (!client) return null;

  return (
    <Dialog open={!!client} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pedidos de {client.name}</DialogTitle>
        </DialogHeader>
        {orders.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum pedido encontrado</p>
        ) : (
          <div className="space-y-3">
            {orders.map(order => (
              <div key={order.id} className="flex items-center justify-between gap-2 p-3 rounded-md bg-muted/50" data-testid={`client-order-${order.id}`}>
                <div>
                  <p className="font-mono text-sm font-medium">{order.code}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {format(new Date(order.createdAt), "dd/MM/yyyy")} - {ORDER_STATUS_LABELS[order.status]}
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {FINANCIAL_STATUS_LABELS[order.financialStatus]}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
