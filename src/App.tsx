import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import MainLayout from "./components/MainLayout";
import Dashboard from "./pages/Dashboard";
import Banorte from "./pages/Banorte";
import MiCedula from "./pages/MiCedula";
import StorePage from "./pages/StorePage";
import Notificaciones from "./pages/Notificaciones";
import Emergencias from "./pages/Emergencias";
import Inventario from "./pages/Inventario";
import Expediente from "./pages/Expediente";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import HQLogin from "./pages/HQLogin";
import HQDashboard from "./pages/HQDashboard";
import AdminLogin from "./pages/AdminLogin";
import AdminPanel from "./pages/AdminPanel";
import PortalBuscados from "./pages/PortalBuscados";
import PortalCasas from "./pages/PortalCasas";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/hq-login" element={<HQLogin />} />
      <Route path="/hq-dashboard" element={<HQDashboard />} />
      <Route path="/ad-login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminPanel />} />
      <Route path="/buscados" element={<PortalBuscados />} />
      <Route path="/casas" element={<PortalCasas />} />
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/banorte" element={<Banorte />} />
        <Route path="/cedula" element={<MiCedula />} />
        <Route path="/store" element={<StorePage />} />
        <Route path="/notificaciones" element={<Notificaciones />} />
        <Route path="/emergencias" element={<Emergencias />} />
        <Route path="/inventario" element={<Inventario />} />
        <Route path="/expediente" element={<Expediente />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
