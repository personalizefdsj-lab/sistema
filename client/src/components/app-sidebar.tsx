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
} from "lucide-react";

export function AppSidebar() {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const isSuperAdmin = user?.role === "superadmin";
  const companySlug = (user as any)?.companySlug;

  const { data: company } = useQuery<any>({
    queryKey: ["/api/company"],
    enabled: !isSuperAdmin,
  });

  const adminItems = [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Pedidos", url: "/orders", icon: ClipboardList },
    { title: "Clientes", url: "/clients", icon: Users },
    { title: "Produtos", url: "/products", icon: ShoppingBag },
    { title: "Estoque", url: "/stock", icon: Warehouse },
    { title: "Vendas Online", url: "/sales", icon: TrendingUp },
    { title: "Conversas", url: "/conversations", icon: MessageSquare },
  ];

  const superAdminItems = [
    { title: "Empresas", url: "/admin", icon: Shield },
  ];

  const items = isSuperAdmin ? superAdminItems : adminItems;

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
            <Package className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">Gestor de Pedidos</p>
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
