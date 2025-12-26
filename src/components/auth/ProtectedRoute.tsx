import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: AppRole[];
}

function ProtectedRoute({ children, requiredRoles = [] }: ProtectedRouteProps) {
  const { user, roles, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse">
          <p className="font-serif text-2xl text-foreground">Cercle Partages</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/connexion" state={{ from: location }} replace />;
  }

  if (requiredRoles.length > 0 && !requiredRoles.some((role) => roles.includes(role))) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
