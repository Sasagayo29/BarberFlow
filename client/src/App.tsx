import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardLayout from "./components/DashboardLayout";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AgendaPage from "./pages/AgendaPage";
import BarbershopsPage from "./pages/BarbershopsPage";
import ProfilePage from "./pages/ProfilePage";
import SocialMediaPage from "./pages/SocialMediaPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import ReportsPage from "./pages/ReportsPage";
import DashboardPage from "./pages/DashboardPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { ClientDashboard } from "./pages/ClientDashboard";
import { AdminDataManagement } from "./pages/AdminDataManagement";
import { ClientBooking } from "./pages/ClientBooking";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import ServicesPage from "./pages/ServicesPage";
import SettingsPage from "./pages/SettingsPage";
import TeamPage from "./pages/TeamPage";
import { ComponentType } from "react";
import { Route, Switch } from "wouter";

function DashboardShell({ component: Component }: { component: ComponentType }) {
  return (
    <DashboardLayout>
      <Component />
    </DashboardLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard">
        {() => <DashboardShell component={DashboardPage} />}
      </Route>
      <Route path="/agenda">
        {() => <DashboardShell component={AgendaPage} />}
      </Route>
      <Route path="/servicos">
        {() => <DashboardShell component={ServicesPage} />}
      </Route>
      <Route path="/equipa">
        {() => <DashboardShell component={TeamPage} />}
      </Route>
      <Route path="/configuracoes">
        {() => <DashboardShell component={SettingsPage} />}
      </Route>
      <Route path="/barbearias">
        {() => <DashboardShell component={BarbershopsPage} />}
      </Route>
      <Route path="/perfil">
        {() => <DashboardShell component={ProfilePage} />}
      </Route>
      <Route path="/redes-sociais">
        {() => <DashboardShell component={SocialMediaPage} />}
      </Route>
      <Route path="/analytics">
        {() => <DashboardShell component={AnalyticsPage} />}
      </Route>
      <Route path="/relatorios">
        {() => <DashboardShell component={ReportsPage} />}
      </Route>
      <Route path="/meu-painel" component={ClientDashboard} />
      <Route path="/admin/dados" component={AdminDataManagement} />
      <Route path="/agendar" component={ClientBooking} />
      <Route path="/checkout" component={CheckoutPage} />
      <Route path="/pagamento-confirmado" component={CheckoutPage} />
      <Route path="/pagamento-cancelado" component={CheckoutPage} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
