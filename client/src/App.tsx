import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import DashboardLayout from "./components/DashboardLayout";
import { ThemeProvider } from "./contexts/ThemeContext";
import Agents from "./pages/Agents";
import Analytics from "./pages/Analytics";
import Channels from "./pages/Channels";
import Conversations from "./pages/Conversations";
import Home from "./pages/Home";
import Team from "./pages/Team";
import Billing from "./pages/Billing";
import Notifications from "./pages/Notifications";
import NotificationSettings from "./pages/NotificationSettings";
import Knowledge from "./pages/Knowledge";
import Settings from "./pages/Settings";
import Widget from "./pages/Widget";
import IndependentWidget from "./pages/IndependentWidget";
import PublicLanding from "./pages/PublicLanding";
import Access from "./pages/Access";
import Pricing from "./pages/Pricing";
import Quality from "./pages/Quality";
import IndependentStaging from "./pages/IndependentStaging";
import { hasIndependentSupabaseBrowserConfig } from "./lib/supabase";

function AppRoutes() {
  return (
    <Switch>
      <Route path="/widget/:agentId" component={hasIndependentSupabaseBrowserConfig() ? IndependentWidget : Widget} />
      <Route path="/" component={PublicLanding} />
      <Route path="/login" component={Access} />
      <Route path="/register" component={Access} />
      <Route path="/access" component={Access} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/external" component={IndependentStaging} />
      <Route path="/start" component={Home} />
      <Route path="*">
        <DashboardLayout>
          <Switch>
            <Route path={"/agents"} component={Agents} />
            <Route path={"/knowledge"} component={Knowledge} />
            <Route path={"/conversations"} component={Conversations} />
            <Route path={"/channels"} component={Channels} />
            <Route path={"/analytics"} component={Analytics} />
            <Route path={"/quality"} component={Quality} />
            <Route path={"/team"} component={Team} />
            <Route path={"/billing"} component={Billing} />
            <Route path={"/notifications"} component={Notifications} />
            <Route path={"/notifications/settings"} component={NotificationSettings} />
            <Route path={"/settings"} component={Settings} />
            <Route component={NotFound} />
          </Switch>
        </DashboardLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <AppRoutes />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
