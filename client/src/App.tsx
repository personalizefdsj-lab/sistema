import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ThemeProvider } from "@/components/theme-provider";
import { Skeleton } from "@/components/ui/skeleton";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import OrdersPage from "@/pages/orders";
import ClientsPage from "@/pages/clients";
import ConversationsPage from "@/pages/conversations";
import AdminPage from "@/pages/admin";
import ProductsPage from "@/pages/products";
import StockPage from "@/pages/stock";
import SalesDashboardPage from "@/pages/sales-dashboard";
import PublicStore from "@/pages/store";
import TrackingPage from "@/pages/tracking";
import ClientPortal from "@/pages/client-portal";
import SettingsPage from "@/pages/settings";
import EmployeesPage from "@/pages/employees";
import FinancialPage from "@/pages/financial";
import InvoicesPage from "@/pages/invoices";
import PdvPage from "@/pages/pdv";

function ProtectedRouter() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="space-y-4 w-64">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  if (user.role === "superadmin") {
    return (
      <AppLayout>
        <Switch>
          <Route path="/admin" component={AdminPage} />
          <Route path="/">
            <Redirect to="/admin" />
          </Route>
          <Route component={NotFound} />
        </Switch>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/orders" component={OrdersPage} />
        <Route path="/clients" component={ClientsPage} />
        <Route path="/conversations" component={ConversationsPage} />
        <Route path="/products" component={ProductsPage} />
        <Route path="/stock" component={StockPage} />
        <Route path="/sales" component={SalesDashboardPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/employees" component={EmployeesPage} />
        <Route path="/financial" component={FinancialPage} />
        <Route path="/invoices" component={InvoicesPage} />
        <Route path="/pdv" component={PdvPage} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function AppLayout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center gap-2 p-2 border-b flex-shrink-0">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
          </header>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <Switch>
              <Route path="/loja/:slug" component={PublicStore} />
              <Route path="/portal/:slug" component={ClientPortal} />
              <Route path="/rastrear/:code" component={TrackingPage} />
              <Route path="/rastrear" component={TrackingPage} />
              <Route>
                <ProtectedRouter />
              </Route>
            </Switch>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
