import { useAuth } from "@/lib/auth";
import { useLocation, Link } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  MessageSquare,
  LogOut,
  Package,
  Shield,
  ShoppingBag,
  Warehouse,
  TrendingUp,
  ExternalLink,
  Lock,
  Settings,
  UserCog,
  DollarSign,
  Monitor,
} from "lucide-react";

export function AppSidebar() {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const isSuperAdmin = user?.role === "superadmin";
  const isAdmin = user?.role === "admin";
  const companySlug = (user as any)?.companySlug;
  const permissions = (user as any)?.permissions as string[] | null;

  const hasPermission = (perm: string) => {
    if (isSuperAdmin || isAdmin) return true;
    return permissions?.includes(perm) ?? false;
  };

  const { data: company } = useQuery<any>({
    queryKey: ["/api/company"],
    enabled: !isSuperAdmin,
  });

  const allAdminItems = [
    { title: "Dashboard", url: "/", icon: LayoutDashboard, perm: null },
    { title: "PDV", url: "/pdv", icon: Monitor, perm: "pdv" },
    { title: "Pedidos", url: "/orders", icon: ClipboardList, perm: "orders" },
    { title: "Clientes", url: "/clients", icon: Users, perm: "clients" },
    { title: "Produtos", url: "/products", icon: ShoppingBag, perm: "products" },
    { title: "Estoque", url: "/stock", icon: Warehouse, perm: "stock" },
    { title: "Financeiro", url: "/financial", icon: DollarSign, perm: "financial" },
    { title: "Vendas Online", url: "/sales", icon: TrendingUp, perm: null },
    { title: "Conversas", url: "/conversations", icon: MessageSquare, perm: "conversations" },
  ];

  const adminItems = allAdminItems.filter(item => item.perm === null || hasPermission(item.perm));

  const managementItems = [
    ...(isAdmin ? [{ title: "Funcionários", url: "/employees", icon: UserCog }] : []),
    { title: "Configurações", url: "/settings", icon: Settings },
  ].filter(item => isAdmin || hasPermission("settings"));

  const superAdminItems = [
    { title: "Empresas", url: "/admin", icon: Shield },
  ];

  const items = isSuperAdmin ? superAdminItems : adminItems;

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          {company?.logoUrl ? (
            <img src={company.logoUrl} alt="" className="w-9 h-9 rounded-md object-cover flex-shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
              <Package className="w-5 h-5 text-primary-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{company?.name || "Gestor de Pedidos"}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.name}</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{isSuperAdmin ? "Administração" : "Menu"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild data-active={location === item.url}>
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {!isSuperAdmin && managementItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Gestão</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {managementItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild data-active={location === item.url}>
                      <Link href={item.url}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        {!isSuperAdmin && companySlug && (
          <SidebarGroup>
            <SidebarGroupLabel>Links Públicos</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <a href={`/portal/${companySlug}`} target="_blank" rel="noopener noreferrer" data-testid="link-sidebar-portal">
                      <ExternalLink className="w-4 h-4" />
                      <span>Portal do Cliente</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    {company?.plan === "basic" ? (
                      <div className="flex items-center gap-2 opacity-60 cursor-default" data-testid="link-sidebar-store-locked">
                        <Lock className="w-4 h-4" />
                        <span className="flex-1">Loja Online</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">Pro</Badge>
                      </div>
                    ) : (
                      <a href={`/loja/${companySlug}`} target="_blank" rel="noopener noreferrer" data-testid="link-sidebar-store">
                        <ShoppingBag className="w-4 h-4" />
                        <span>Loja Online</span>
                      </a>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="p-4">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => logout()}
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
