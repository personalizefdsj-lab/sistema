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
} from "lucide-react";

export function AppSidebar() {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const isSuperAdmin = user?.role === "superadmin";

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
