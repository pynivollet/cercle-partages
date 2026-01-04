import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { isAuthError } from "@/lib/supabaseErrorHandler";

/**
 * Component that sets up global auth error handling
 * Must be placed inside AuthProvider
 */
export function AuthErrorBoundary({ children }: { children: React.ReactNode }) {
  const { handleAuthError, session } = useAuth();

  // Listen for fetch errors globally to catch auth issues
  useEffect(() => {
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        
        // Check for auth errors in responses
        if (response.status === 401 || response.status === 403) {
          const url = typeof args[0] === "string" ? args[0] : args[0] instanceof Request ? args[0].url : "";
          // Only handle Supabase API errors
          if (url.includes("supabase")) {
            handleAuthError({ status: response.status });
          }
        }
        
        return response;
      } catch (error) {
        if (isAuthError(error)) {
          handleAuthError(error);
        }
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [handleAuthError]);

  return <>{children}</>;
}
