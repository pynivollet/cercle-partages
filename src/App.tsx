import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthErrorBoundary } from "@/components/auth/AuthErrorBoundary";
import { LanguageProvider } from "@/i18n/LanguageContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import ScrollToTop from "@/components/ScrollToTop";
import Index from "./pages/Index";
import EventDetail from "./pages/EventDetail";
import Events from "./pages/Events";
import Presenters from "./pages/Presenters";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AcceptInvitation from "./pages/AcceptInvitation";
import PresenterProfile from "./pages/PresenterProfile";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import AdminReminders from "./pages/AdminReminders";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider>
          <AuthErrorBoundary>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <ScrollToTop />
              <Routes>
              <Route path="/connexion" element={<Login />} />
                <Route path="/inscription" element={<Signup />} />
                <Route path="/accept-invitation" element={<AcceptInvitation />} />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Index />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/rencontre/:id"
                  element={
                    <ProtectedRoute>
                      <EventDetail />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/evenements"
                  element={
                    <ProtectedRoute>
                      <Events />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/intervenants"
                  element={
                    <ProtectedRoute>
                      <Presenters />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/presentateur/:id"
                  element={
                    <ProtectedRoute>
                      <PresenterProfile />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profil"
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute requiredRoles={["admin"]}>
                      <Admin />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/rappels"
                  element={
                    <ProtectedRoute requiredRoles={["admin"]}>
                      <AdminReminders />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AuthErrorBoundary>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
  );
}

export default App;
