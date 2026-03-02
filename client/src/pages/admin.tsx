import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import type { Company } from "@shared/schema";
import { Building2, Shield, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";

export default function AdminPage() {
  const { toast } = useToast();
  const { data: companies = [], isLoading } = useQuery<Company[]>({
    queryKey: ["/api/admin/companies"],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await apiRequest("PATCH", `/api/admin/companies/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/companies"] });
      toast({ title: "Empresa atualizada" });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/companies/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/companies"] });
      toast({ title: "Empresa excluída" });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const activeCount = companies.filter(c => c.status === "active").length;

  return (
    <div className="p-6 space-y-6" data-testid="admin-page">
      <div>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-semibold">Super Admin</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie todas as empresas da plataforma
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total de Empresas</p>
            <p className="text-3xl font-bold mt-1" data-testid="text-total-companies">{companies.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Empresas Ativas</p>
            <p className="text-3xl font-bold mt-1 text-emerald-600 dark:text-emerald-400" data-testid="text-active-companies">
              {activeCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Empresas Suspensas</p>
            <p className="text-3xl font-bold mt-1 text-amber-600 dark:text-amber-400" data-testid="text-suspended-companies">
              {companies.length - activeCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : companies.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground" data-testid="text-no-companies">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Nenhuma empresa cadastrada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {companies.map(company => (
            <Card key={company.id} data-testid={`card-company-${company.id}`}>
              <CardContent className="py-4 px-5">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium" data-testid={`text-company-name-${company.id}`}>
                          {company.name}
                        </p>
                        {company.status === "active" ? (
                          <Badge variant="secondary" className="text-xs">
                            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                            Ativa
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            <XCircle className="w-3 h-3 mr-1 text-amber-600" />
                            Suspensa
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs capitalize">
                          {company.plan}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Criada em {format(new Date(company.createdAt), "dd/MM/yyyy")}
                        {company.phone && ` · ${company.phone}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={company.status}
                      onValueChange={(v) => updateMutation.mutate({ id: company.id, status: v })}
                    >
                      <SelectTrigger className="w-32" data-testid={`select-status-${company.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Ativa</SelectItem>
                        <SelectItem value="suspended">Suspensa</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={company.plan}
                      onValueChange={(v) => updateMutation.mutate({ id: company.id, plan: v })}
                    >
                      <SelectTrigger className="w-36" data-testid={`select-plan-${company.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic">Básico</SelectItem>
                        <SelectItem value="professional">Profissional</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                      </SelectContent>
                    </Select>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" data-testid={`button-delete-company-${company.id}`}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir empresa?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Todos os dados de {company.name} serão removidos permanentemente. Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate(company.id)}
                            data-testid={`button-confirm-delete-${company.id}`}
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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
