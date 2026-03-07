import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ALL_PERMISSIONS, PERMISSION_LABELS } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, KeyRound, Users } from "lucide-react";

type Employee = {
  id: number;
  username: string;
  name: string;
  role: string;
  permissions: string[] | null;
  createdAt: string;
};

export default function EmployeesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin";

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [tempPassOpen, setTempPassOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [tempPassword, setTempPassword] = useState("");

  const [newName, setNewName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPermissions, setNewPermissions] = useState<string[]>([]);

  const [editName, setEditName] = useState("");
  const [editPermissions, setEditPermissions] = useState<string[]>([]);

  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/employees", {
        name: newName,
        username: newUsername,
        password: newPassword,
        permissions: newPermissions,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      setCreateOpen(false);
      resetCreateForm();
      toast({ title: "Funcionário criado com sucesso" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao criar funcionário", description: err.message, variant: "destructive" });
    },
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEmployee) return;
      await apiRequest("PATCH", `/api/employees/${selectedEmployee.id}`, {
        name: editName,
        permissions: editPermissions,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      setEditOpen(false);
      toast({ title: "Funcionário atualizado com sucesso" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao atualizar", description: err.message, variant: "destructive" });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PATCH", `/api/employees/${id}/reset-password`);
      return res.json();
    },
    onSuccess: (data: any) => {
      setTempPassword(data.newPassword || data.temporaryPassword || data.password || "");
      setTempPassOpen(true);
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao redefinir senha", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/employees/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      setDeleteOpen(false);
      setSelectedEmployee(null);
      toast({ title: "Funcionário removido com sucesso" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao remover", description: err.message, variant: "destructive" });
    },
  });

  function resetCreateForm() {
    setNewName("");
    setNewUsername("");
    setNewPassword("");
    setNewPermissions([]);
  }

  function openEdit(emp: Employee) {
    setSelectedEmployee(emp);
    setEditName(emp.name);
    setEditPermissions(emp.permissions || []);
    setEditOpen(true);
  }

  function openDelete(emp: Employee) {
    setSelectedEmployee(emp);
    setDeleteOpen(true);
  }

  function togglePermission(list: string[], perm: string, setter: (v: string[]) => void) {
    if (list.includes(perm)) {
      setter(list.filter((p) => p !== perm));
    } else {
      setter([...list, perm]);
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="employees-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6" />
          <h1 className="text-2xl font-bold" data-testid="text-employees-title">Funcionários</h1>
        </div>
        {isAdmin && (
          <Button
            data-testid="button-new-employee"
            onClick={() => {
              resetCreateForm();
              setCreateOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Funcionário
          </Button>
        )}
      </div>

      {employees.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground" data-testid="text-no-employees">
            Nenhum funcionário cadastrado.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {employees.map((emp) => (
            <Card key={emp.id} data-testid={`card-employee-${emp.id}`}>
              <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                <div>
                  <CardTitle className="text-lg" data-testid={`text-employee-name-${emp.id}`}>
                    {emp.name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground" data-testid={`text-employee-username-${emp.id}`}>
                    @{emp.username}
                  </p>
                </div>
                <Badge variant={emp.role === "admin" ? "default" : "secondary"} data-testid={`badge-role-${emp.id}`}>
                  {emp.role === "admin" ? "Administrador" : "Funcionário"}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {emp.permissions && emp.permissions.length > 0 && (
                  <div className="flex flex-wrap gap-1" data-testid={`permissions-list-${emp.id}`}>
                    {emp.permissions.map((perm) => (
                      <Badge key={perm} variant="outline" className="text-xs" data-testid={`badge-permission-${emp.id}-${perm}`}>
                        {PERMISSION_LABELS[perm] || perm}
                      </Badge>
                    ))}
                  </div>
                )}
                {isAdmin && emp.role !== "admin" && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => openEdit(emp)} data-testid={`button-edit-${emp.id}`}>
                      <Pencil className="mr-1 h-3 w-3" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resetPasswordMutation.mutate(emp.id)}
                      disabled={resetPasswordMutation.isPending}
                      data-testid={`button-reset-password-${emp.id}`}
                    >
                      <KeyRound className="mr-1 h-3 w-3" />
                      Redefinir Senha
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => openDelete(emp)} data-testid={`button-delete-${emp.id}`}>
                      <Trash2 className="mr-1 h-3 w-3" />
                      Excluir
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent data-testid="dialog-create-employee">
          <DialogHeader>
            <DialogTitle>Novo Funcionário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">Nome</Label>
              <Input
                id="create-name"
                data-testid="input-create-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nome completo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-username">Usuário</Label>
              <Input
                id="create-username"
                data-testid="input-create-username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="nome.usuario"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-password">Senha</Label>
              <Input
                id="create-password"
                data-testid="input-create-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div className="space-y-2">
              <Label>Permissões</Label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_PERMISSIONS.map((perm) => (
                  <div key={perm} className="flex items-center gap-2">
                    <Checkbox
                      id={`create-perm-${perm}`}
                      data-testid={`checkbox-create-permission-${perm}`}
                      checked={newPermissions.includes(perm)}
                      onCheckedChange={() => togglePermission(newPermissions, perm, setNewPermissions)}
                    />
                    <Label htmlFor={`create-perm-${perm}`} className="text-sm font-normal cursor-pointer">
                      {PERMISSION_LABELS[perm]}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} data-testid="button-cancel-create">
              Cancelar
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !newName || !newUsername || !newPassword}
              data-testid="button-submit-create"
            >
              {createMutation.isPending ? "Criando..." : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent data-testid="dialog-edit-employee">
          <DialogHeader>
            <DialogTitle>Editar Funcionário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome</Label>
              <Input
                id="edit-name"
                data-testid="input-edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Permissões</Label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_PERMISSIONS.map((perm) => (
                  <div key={perm} className="flex items-center gap-2">
                    <Checkbox
                      id={`edit-perm-${perm}`}
                      data-testid={`checkbox-edit-permission-${perm}`}
                      checked={editPermissions.includes(perm)}
                      onCheckedChange={() => togglePermission(editPermissions, perm, setEditPermissions)}
                    />
                    <Label htmlFor={`edit-perm-${perm}`} className="text-sm font-normal cursor-pointer">
                      {PERMISSION_LABELS[perm]}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} data-testid="button-cancel-edit">
              Cancelar
            </Button>
            <Button
              onClick={() => editMutation.mutate()}
              disabled={editMutation.isPending || !editName}
              data-testid="button-submit-edit"
            >
              {editMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent data-testid="dialog-delete-employee">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir o funcionário <strong>{selectedEmployee?.name}</strong>? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} data-testid="button-cancel-delete">
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedEmployee && deleteMutation.mutate(selectedEmployee.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={tempPassOpen} onOpenChange={setTempPassOpen}>
        <DialogContent data-testid="dialog-temp-password">
          <DialogHeader>
            <DialogTitle>Senha Temporária</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              A senha foi redefinida. Informe a nova senha temporária ao funcionário:
            </p>
            <div className="flex items-center gap-2">
              <Input value={tempPassword} readOnly data-testid="input-temp-password" className="font-mono" />
              <Button
                variant="outline"
                size="sm"
                data-testid="button-copy-password"
                onClick={() => {
                  navigator.clipboard.writeText(tempPassword);
                  toast({ title: "Senha copiada!" });
                }}
              >
                Copiar
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setTempPassOpen(false)} data-testid="button-close-temp-password">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
