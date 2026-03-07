import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Package, Building2, ArrowRight, ArrowLeft, Mail, KeyRound, CheckCircle2 } from "lucide-react";

export default function AuthPage() {
  const { login, register } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [loginLoading, setLoginLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<"email" | "code" | "success">("email");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotCode, setForgotCode] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoginLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      await login(form.get("username") as string, form.get("password") as string);
      navigate("/");
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setRegisterLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      await register({
        companyName: form.get("companyName"),
        companyPhone: form.get("companyPhone"),
        adminName: form.get("adminName"),
        adminUsername: form.get("adminUsername"),
        adminPassword: form.get("adminPassword"),
        adminEmail: form.get("adminEmail"),
      });
      navigate("/");
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleForgotSubmitEmail = async () => {
    if (!forgotEmail) return;
    setForgotLoading(true);
    try {
      await apiRequest("POST", "/api/auth/forgot-password", { email: forgotEmail });
      setForgotStep("code");
      toast({ title: "Código enviado", description: "Verifique seu e-mail para o código de recuperação." });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotResetPassword = async () => {
    if (!forgotCode || !forgotNewPassword) return;
    setForgotLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/reset-password", {
        email: forgotEmail,
        code: forgotCode,
        newPassword: forgotNewPassword,
      });
      const data = await res.json();
      if (data.success) {
        setForgotStep("success");
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setForgotLoading(false);
    }
  };

  const openForgotPassword = () => {
    setForgotStep("email");
    setForgotEmail("");
    setForgotCode("");
    setForgotNewPassword("");
    setForgotOpen(true);
  };

  return (
    <div className="min-h-screen flex" data-testid="auth-page">
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center">
              <Package className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Gestor de Pedidos</h1>
              <p className="text-sm text-muted-foreground">Gerencie seus pedidos com facilidade</p>
            </div>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login" data-testid="tab-login">Entrar</TabsTrigger>
              <TabsTrigger value="register" data-testid="tab-register">Criar Conta</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Acessar sua conta</CardTitle>
                  <CardDescription>Entre com suas credenciais para acessar o sistema</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-username">Usuário</Label>
                      <Input id="login-username" name="username" required data-testid="input-login-username" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Senha</Label>
                      <Input id="login-password" name="password" type="password" required data-testid="input-login-password" />
                    </div>
                    <Button type="submit" className="w-full" disabled={loginLoading} data-testid="button-login">
                      {loginLoading ? "Entrando..." : "Entrar"}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                    <button
                      type="button"
                      onClick={openForgotPassword}
                      className="w-full text-xs text-center text-primary hover:underline mt-2 cursor-pointer"
                      data-testid="link-forgot-password"
                    >
                      Esqueceu a senha?
                    </button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>Criar nova empresa</CardTitle>
                  <CardDescription>Configure sua empresa e comece a gerenciar seus pedidos</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reg-company">Nome da Empresa</Label>
                      <Input id="reg-company" name="companyName" required data-testid="input-company-name" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-phone">Telefone da Empresa</Label>
                      <Input id="reg-phone" name="companyPhone" data-testid="input-company-phone" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-name">Seu Nome</Label>
                      <Input id="reg-name" name="adminName" required data-testid="input-admin-name" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-email">Seu E-mail</Label>
                      <Input id="reg-email" name="adminEmail" type="email" placeholder="usado para recuperação de senha" data-testid="input-admin-email" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-username">Usuário</Label>
                      <Input id="reg-username" name="adminUsername" required data-testid="input-admin-username" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-password">Senha</Label>
                      <Input id="reg-password" name="adminPassword" type="password" required minLength={6} data-testid="input-admin-password" />
                    </div>
                    <Button type="submit" className="w-full" disabled={registerLoading} data-testid="button-register">
                      {registerLoading ? "Criando..." : "Criar Empresa"}
                      <Building2 className="w-4 h-4 ml-2" />
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 bg-primary items-center justify-center p-12">
        <div className="max-w-lg text-primary-foreground">
          <Package className="w-16 h-16 mb-6 opacity-90" />
          <h2 className="text-3xl font-bold mb-4">Gerencie seus pedidos de forma inteligente</h2>
          <p className="text-lg opacity-90 mb-6">
            Plataforma completa para gestão de pedidos, clientes e finanças. 
            Visualize seus pedidos em lista ou kanban, acompanhe pagamentos e 
            comunique-se com seus clientes.
          </p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 opacity-80">
              <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
              Gestão de Pedidos
            </div>
            <div className="flex items-center gap-2 opacity-80">
              <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
              Controle Financeiro
            </div>
            <div className="flex items-center gap-2 opacity-80">
              <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
              Kanban Visual
            </div>
            <div className="flex items-center gap-2 opacity-80">
              <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
              Multi-empresa
            </div>
          </div>
        </div>
      </div>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-forgot-password">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {forgotStep === "success" ? (
                <><CheckCircle2 className="w-5 h-5 text-emerald-600" /> Senha Alterada</>
              ) : (
                <><KeyRound className="w-5 h-5" /> Recuperar Senha</>
              )}
            </DialogTitle>
          </DialogHeader>

          {forgotStep === "email" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Informe o e-mail cadastrado na sua conta. Enviaremos um código de 6 dígitos para recuperação.
              </p>
              <div className="space-y-2">
                <Label htmlFor="forgot-email">E-mail</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="seu@email.com"
                  data-testid="input-forgot-email"
                />
              </div>
              <Button
                className="w-full"
                onClick={handleForgotSubmitEmail}
                disabled={forgotLoading || !forgotEmail}
                data-testid="button-forgot-send-code"
              >
                {forgotLoading ? "Enviando..." : "Enviar Código"}
                <Mail className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {forgotStep === "code" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Digite o código de 6 dígitos enviado para <strong>{forgotEmail}</strong> e escolha uma nova senha.
              </p>
              <div className="space-y-2">
                <Label htmlFor="forgot-code">Código de Verificação</Label>
                <Input
                  id="forgot-code"
                  value={forgotCode}
                  onChange={(e) => setForgotCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="text-center text-2xl tracking-[0.5em] font-mono"
                  data-testid="input-forgot-code"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="forgot-new-password">Nova Senha</Label>
                <Input
                  id="forgot-new-password"
                  type="password"
                  value={forgotNewPassword}
                  onChange={(e) => setForgotNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
                  data-testid="input-forgot-new-password"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setForgotStep("email")}
                  data-testid="button-forgot-back"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Voltar
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleForgotResetPassword}
                  disabled={forgotLoading || forgotCode.length !== 6 || forgotNewPassword.length < 6}
                  data-testid="button-forgot-reset"
                >
                  {forgotLoading ? "Alterando..." : "Alterar Senha"}
                </Button>
              </div>
              <button
                type="button"
                onClick={handleForgotSubmitEmail}
                className="w-full text-xs text-center text-primary hover:underline cursor-pointer"
                disabled={forgotLoading}
                data-testid="link-forgot-resend"
              >
                Reenviar código
              </button>
            </div>
          )}

          {forgotStep === "success" && (
            <div className="space-y-4 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <p className="text-sm text-muted-foreground">
                Sua senha foi alterada com sucesso! Você já pode fazer login com a nova senha.
              </p>
              <Button
                className="w-full"
                onClick={() => setForgotOpen(false)}
                data-testid="button-forgot-close"
              >
                Voltar ao Login
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
