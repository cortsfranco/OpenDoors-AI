import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { useState } from "react";
import Sidebar from "@/components/Layout/Sidebar";
import Header from "@/components/Layout/Header";
import Dashboard from "@/pages/Dashboard";
import Upload from "@/pages/Upload";
import Invoices from "@/pages/Invoices";
import InvoicesSeparated from "@/pages/InvoicesSeparated";
import Clients from "@/pages/Clients";
import Reports from "@/pages/Reports";
import Analytics from "@/pages/Analytics";
import Files from "@/pages/Files";
import ImportPage from "@/pages/ImportPage";
import Trash from "@/pages/Trash";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ActivityLogs from "@/pages/ActivityLogs";
import ProfileSettings from "@/pages/ProfileSettings";
import AdminPanel from "@/pages/AdminPanel";
import ReviewQueue from "@/pages/ReviewQueue";
import NotFound from "@/pages/not-found";
import { useAuth } from "@/hooks/useAuth";
import { WebSocketProvider } from "@/hooks/useWebSocket";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/upload" component={Upload} />
      <Route path="/invoices" component={Invoices} />
      <Route path="/invoices-separated" component={InvoicesSeparated} />
      <Route path="/review-queue" component={ReviewQueue} />
      <Route path="/clients" component={Clients} />
      <Route path="/reports" component={Reports} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/files" component={Files} />
      <Route path="/import" component={ImportPage} />
      <Route path="/trash" component={Trash} />
      <Route path="/activity-logs" component={ActivityLogs} />
      <Route path="/profile" component={ProfileSettings} />
      <Route path="/admin" component={AdminPanel} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedApp() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, isLoading, isAuthenticated } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  // Allow access to register page without authentication
  if (!isAuthenticated && location === '/register') {
    return <Register />;
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <div className="flex h-screen bg-background relative">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 fixed md:relative z-50 h-screen left-0 top-0`}>
        <Sidebar />
      </div>
      
      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <div className="flex-1 overflow-auto">
          <Router />
        </div>
      </main>
      
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WebSocketProvider>
          <AuthenticatedApp />
          <Toaster />
        </WebSocketProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
