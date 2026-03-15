import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Company } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, Save, Lock, Mail, FileText } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function SettingsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [userEmail, setUserEmail] = useState("");

  const { data: company, isLoading } = useQuery<Company>({
    queryKey: ["/api/company"],
  });

  const [form, setForm] = useState({
    name: "",
    cnpj: "",
    phone: "",
    address: "",
    neighborhood: "",
    city: "",
    state: "",
    zipCode: "",
    description: "",
    primaryColor: "#3B82F6",
  });

  const [fiscalForm, setFiscalForm] = useState({
    inscricaoEstadual: "",
    regimeTributario: "",
    ambienteFiscal: "homologacao",
    serieNfe: "1",
    focusnfeToken: "",
    certificadoSenha: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (company) {
      setForm({
        name: company.name || "",
        cnpj: company.cnpj || "",
        phone: company.phone || "",
        address: company.address || "",
        neighborhood: company.neighborhood || "",
        city: company.city || "",
        state: company.state || "",
        zipCode: company.zipCode || "",
        description: company.description || "",
        primaryColor: company.primaryColor || "#3B82F6",
      });
      setFiscalForm({
        inscricaoEstadual: (company as any).inscricaoEstadual || "",
        regimeTributario: (company as any).regimeTributario ? String((company as any).regimeTributario) : "",
        ambienteFiscal: (company as any).ambienteFiscal || "homologacao",
        serieNfe: (company as any).serieNfe ? String((company as any).serieNfe) : "1",
        focusnfeToken: (company as any).focusnfeToken || "",
        certificadoSenha: (company as any).certificadoSenha || "",
      });
    }
  }, [company]);

  const updateMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await apiRequest("PATCH", "/api/company", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company"] });
      toast({ title: "Configurações salvas com sucesso" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    },
  });

  const logoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("logo", file);
      const res = await fetch("/api/company/logo", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erro ao enviar logo");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company"] });
      toast({ title: "Logo atualizado com sucesso" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao enviar logo", description: err.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    if (user?.email) setUserEmail(user.email);
  }, [user]);

  const emailMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest("PATCH", "/api/auth/update-email", { email });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "E-mail atualizado com sucesso" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao atualizar e-mail", description: err.message, variant: "destructive" });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await apiRequest("PATCH", "/api/auth/change-password", data);
      return res.json();
    },
    onSuccess: () => {
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast({ title: "Senha alterada com sucesso" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao alterar senha", description: err.message, variant: "destructive" });
    },
  });

  const fiscalMutation = useMutation({
    mutationFn: async (data: typeof fiscalForm) => {
      const payload: any = {
        inscricaoEstadual: data.inscricaoEstadual || null,
        regimeTributario: data.regimeTributario ? parseInt(data.regimeTributario) : null,
        ambienteFiscal: data.ambienteFiscal,
        serieNfe: parseInt(data.serieNfe) || 1,
        focusnfeToken: data.focusnfeToken || null,
        certificadoSenha: data.certificadoSenha || null,
      };
      const res = await apiRequest("PATCH", "/api/company", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company"] });
      toast({ title: "Configurações fiscais salvas" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao salvar configurações fiscais", description: err.message, variant: "destructive" });
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(form);
  };

  const handleFiscalSave = (e: React.FormEvent) => {
    e.preventDefault();
    fiscalMutation.mutate(fiscalForm);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) logoMutation.mutate(file);
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ title: "As senhas não coincidem", variant: "destructive" });
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast({ title: "A nova senha deve ter pelo menos 6 caracteres", variant: "destructive" });
      return;
    }
    passwordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="loading-settings">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto overflow-auto h-full">
      <h1 className="text-2xl font-bold" data-testid="text-settings-title">Configurações da Empresa</h1>

      <Card>
        <CardHeader>
          <CardTitle>Logo da Empresa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            {company?.logoUrl && (
              <img
                src={company.logoUrl}
                alt="Logo da empresa"
                className="h-20 w-20 object-contain rounded-md border"
                data-testid="img-company-logo"
              />
            )}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
                data-testid="input-logo-file"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={logoMutation.isPending}
                data-testid="button-upload-logo"
              >
                {logoMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Enviar Logo
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSave}>
        <Card>
          <CardHeader>
            <CardTitle>Dados da Empresa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Empresa</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  data-testid="input-company-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  value={form.cnpj}
                  onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                  data-testid="input-cnpj"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  data-testid="input-phone"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Cor Principal</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="primaryColor"
                    type="color"
                    value={form.primaryColor}
                    onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                    className="w-12 p-1"
                    data-testid="input-primary-color"
                  />
                  <Input
                    value={form.primaryColor}
                    onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                    className="flex-1"
                    data-testid="input-primary-color-text"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Endereço</Label>
              <Input
                id="address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                data-testid="input-address"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="neighborhood">Bairro</Label>
                <Input
                  id="neighborhood"
                  value={form.neighborhood}
                  onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
                  data-testid="input-neighborhood"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  data-testid="input-city"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">Estado</Label>
                <Input
                  id="state"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  data-testid="input-state"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="zipCode">CEP</Label>
                <Input
                  id="zipCode"
                  value={form.zipCode}
                  onChange={(e) => setForm({ ...form, zipCode: e.target.value })}
                  data-testid="input-zip-code"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                data-testid="input-description"
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={updateMutation.isPending} data-testid="button-save-company">
                {updateMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Salvar Configurações
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            E-mail de Recuperação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Este e-mail será usado para recuperar sua senha caso você a esqueça.
          </p>
          <div className="flex gap-3 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="userEmail">E-mail</Label>
              <Input
                id="userEmail"
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="seu@email.com"
                data-testid="input-user-email"
              />
            </div>
            <Button
              onClick={() => emailMutation.mutate(userEmail)}
              disabled={emailMutation.isPending}
              data-testid="button-save-email"
            >
              {emailMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Salvar
            </Button>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleFiscalSave}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Configurações Fiscais (NF-e)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="inscricaoEstadual">Inscrição Estadual</Label>
                <Input
                  id="inscricaoEstadual"
                  value={fiscalForm.inscricaoEstadual}
                  onChange={(e) => setFiscalForm({ ...fiscalForm, inscricaoEstadual: e.target.value })}
                  placeholder="Ex: 123456789"
                  data-testid="input-inscricao-estadual"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="regimeTributario">Regime Tributário</Label>
                <Select
                  value={fiscalForm.regimeTributario}
                  onValueChange={(v) => setFiscalForm({ ...fiscalForm, regimeTributario: v })}
                >
                  <SelectTrigger data-testid="select-regime-tributario">
                    <SelectValue placeholder="Selecione o regime" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Simples Nacional</SelectItem>
                    <SelectItem value="2">2 - Simples Nacional (Excesso)</SelectItem>
                    <SelectItem value="3">3 - Regime Normal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ambienteFiscal">Ambiente</Label>
                <Select
                  value={fiscalForm.ambienteFiscal}
                  onValueChange={(v) => setFiscalForm({ ...fiscalForm, ambienteFiscal: v })}
                >
                  <SelectTrigger data-testid="select-ambiente-fiscal">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="homologacao">Homologação (Testes)</SelectItem>
                    <SelectItem value="producao">Produção</SelectItem>
                  </SelectContent>
                </Select>
                {fiscalForm.ambienteFiscal === "homologacao" && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">Modo de testes - notas não terão valor fiscal</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="serieNfe">Série NF-e</Label>
                <Input
                  id="serieNfe"
                  type="number"
                  min="1"
                  value={fiscalForm.serieNfe}
                  onChange={(e) => setFiscalForm({ ...fiscalForm, serieNfe: e.target.value })}
                  data-testid="input-serie-nfe"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="focusnfeToken">Token da API Fiscal (Focus NFe)</Label>
              <Input
                id="focusnfeToken"
                type="password"
                value={fiscalForm.focusnfeToken}
                onChange={(e) => setFiscalForm({ ...fiscalForm, focusnfeToken: e.target.value })}
                placeholder="Token fornecido pelo Focus NFe"
                data-testid="input-focusnfe-token"
              />
              <p className="text-xs text-muted-foreground">Obtenha em focusnfe.com.br</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="certificadoSenha">Senha do Certificado Digital (A1)</Label>
              <Input
                id="certificadoSenha"
                type="password"
                value={fiscalForm.certificadoSenha}
                onChange={(e) => setFiscalForm({ ...fiscalForm, certificadoSenha: e.target.value })}
                placeholder="Senha do certificado .pfx/.p12"
                data-testid="input-certificado-senha"
              />
            </div>

            {(company as any)?.proximoNumeroNfe && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Próximo número NF-e:</span>
                <Badge variant="outline" data-testid="text-proximo-numero-nfe">{(company as any).proximoNumeroNfe}</Badge>
              </div>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={fiscalMutation.isPending} data-testid="button-save-fiscal">
                {fiscalMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Salvar Configurações Fiscais
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      <form onSubmit={handlePasswordChange}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Alterar Senha
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Senha Atual</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  data-testid="input-current-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova Senha</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  data-testid="input-new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  data-testid="input-confirm-password"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={passwordMutation.isPending} data-testid="button-change-password">
                {passwordMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Lock className="mr-2 h-4 w-4" />
                )}
                Alterar Senha
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}