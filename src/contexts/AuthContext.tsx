import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  isLoading: boolean;
  isAdmin: boolean;
  isPresenter: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
  handleAuthError: (error: unknown) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

// Public routes that don't require authentication
const PUBLIC_ROUTES = ["/connexion", "/inscription", "/accept-invitation"];

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(true);
  
  // Track if initial load is complete to avoid race conditions
  const initialLoadComplete = useRef(false);

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    
    if (error) {
      console.error("Error fetching profile:", error);
      return null;
    }
    
    setProfile(data);
    return data;
  }, []);

  const fetchRoles = useCallback(async (userId: string): Promise<AppRole[]> => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      
      if (error) {
        console.error("Error fetching roles:", error);
        return [];
      }
      
      const userRoles = data ? data.map((r) => r.role) : [];
      setRoles(userRoles);
      return userRoles;
    } catch (err) {
      console.error("Exception in fetchRoles:", err);
      return [];
    }
  }, []);

  const clearAuthState = useCallback(() => {
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
  }, []);

  const forceSignOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error during force sign out:", error);
    }
    clearAuthState();
    
    // Redirect to login if not already on a public route
    const currentPath = window.location.pathname;
    if (!PUBLIC_ROUTES.some(route => currentPath.startsWith(route))) {
      window.location.href = "/connexion";
    }
  }, [clearAuthState]);

  // Global error handler for auth-related errors (401, 403, session_not_found)
  const handleAuthError = useCallback((error: unknown) => {
    if (error && typeof error === "object") {
      const err = error as { status?: number; code?: string; message?: string };
      
      // Check for session/auth errors
      if (
        err.status === 401 ||
        err.code === "session_not_found" ||
        err.code === "PGRST301" ||
        err.message?.includes("JWT") ||
        err.message?.includes("session") ||
        err.message?.includes("not authenticated")
      ) {
        console.warn("Auth error detected, forcing sign out:", err);
        forceSignOut();
      }
    }
  }, [forceSignOut]);

  // Validate session
  const validateSession = useCallback(async () => {
    try {
      const { data: { session: currentSession }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error("Session validation error:", error);
        await forceSignOut();
        return null;
      }

      if (!currentSession) {
        clearAuthState();
        return null;
      }

      // Check if session is expired
      if (currentSession.expires_at) {
        const expiresAt = new Date(currentSession.expires_at * 1000);
        if (expiresAt < new Date()) {
          console.warn("Session expired, forcing sign out");
          await forceSignOut();
          return null;
        }
      }

      return currentSession;
    } catch (error) {
      console.error("Error validating session:", error);
      await forceSignOut();
      return null;
    }
  }, [clearAuthState, forceSignOut]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      setRolesLoading(true);
      try {
        await Promise.all([fetchProfile(user.id), fetchRoles(user.id)]);
      } finally {
        setRolesLoading(false);
      }
    }
  }, [user, fetchProfile, fetchRoles]);

  useEffect(() => {
    let mounted = true;

    // CRITICAL: Set up auth state listener FIRST (before checking session)
    // This ensures we don't miss any auth events during initialization
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        if (!mounted) return;

        console.log("Auth state change:", event, !!currentSession);

        // Handle sign out immediately
        if (event === "SIGNED_OUT") {
          clearAuthState();
          setAuthLoading(false);
          setRolesLoading(false);
          return;
        }

        // Update session and user synchronously
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          // CRITICAL: Use setTimeout(0) to defer Supabase calls
          // This prevents deadlocks in the auth state change callback
          setRolesLoading(true);
          setTimeout(() => {
            if (!mounted) return;
            Promise.all([
              fetchProfile(currentSession.user.id),
              fetchRoles(currentSession.user.id)
            ]).finally(() => {
              if (mounted) {
                setRolesLoading(false);
              }
            });
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
          setRolesLoading(false);
        }
        
        // Only set authLoading to false after initial load
        if (initialLoadComplete.current) {
          setAuthLoading(false);
        }
      }
    );

    // THEN check for existing session
    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (error) {
          console.error("Error getting session:", error);
          await forceSignOut();
          return;
        }

        if (initialSession?.user) {
          setSession(initialSession);
          setUser(initialSession.user);
          // Wait for profile and roles to be fetched
          await Promise.all([
            fetchProfile(initialSession.user.id),
            fetchRoles(initialSession.user.id)
          ]);
        } else {
          clearAuthState();
        }
      } catch (err) {
        console.error("Initialization error:", err);
      } finally {
        if (mounted) {
          initialLoadComplete.current = true;
          setAuthLoading(false);
          setRolesLoading(false);
        }
      }
    };

    initializeAuth();

    // Periodic session validation (every 5 minutes)
    const validationInterval = setInterval(() => {
      validateSession();
    }, 5 * 60 * 1000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearInterval(validationInterval);
    };
  }, [clearAuthState, fetchProfile, fetchRoles, forceSignOut, validateSession]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    clearAuthState();
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/connexion?type=recovery`,
    });
    return { error: error as Error | null };
  };

  const isAdmin = roles.includes("admin");
  const isPresenter = roles.includes("presenter") || (profile?.is_presenter ?? false);

  // Combined loading state: wait for both auth AND roles to be resolved
  const isLoading = authLoading || (user !== null && rolesLoading);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        roles,
        isLoading,
        isAdmin,
        isPresenter,
        signIn,
        signOut,
        resetPassword,
        refreshProfile,
        handleAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
