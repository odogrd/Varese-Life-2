import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Login from "./pages/login";
import Dashboard from "./pages/dashboard";
import Fonti from "./pages/fonti";
import Eventi from "./pages/eventi";
import Prompts from "./pages/prompt";
import NewsletterList from "./pages/newsletter";
import Templates from "./pages/template";
import Impostazioni from "./pages/impostazioni";
import Utenti from "./pages/utenti";
import NotFound from "./pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/fonti" component={Fonti} />
      <Route path="/eventi" component={Eventi} />
      <Route path="/prompt" component={Prompts} />
      <Route path="/newsletter" component={NewsletterList} />
      <Route path="/template" component={Templates} />
      <Route path="/impostazioni" component={Impostazioni} />
      <Route path="/utenti" component={Utenti} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
