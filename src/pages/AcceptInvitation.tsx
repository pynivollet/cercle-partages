import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const passwordSchema = z.object({
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

type InvitationState = "loading" | "valid" | "invalid" | "expired" | "already_confirmed";

const AcceptInvitation = () => {
  const [invitationState, setInvitationState] = useState<InvitationState>("loading");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleInvitationToken = async () => {
      try {
        // Get session from URL hash (Supabase puts tokens in the URL hash)
        const { data, error } = await supabase.auth.getSession();
        
        // Check URL hash for tokens
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        const type = hashParams.get("type");
        const errorCode = hashParams.get("error_code");
        const errorDescription = hashParams.get("error_description");

        // Handle URL errors
        if (errorCode) {
          console.error("Invitation error:", errorCode, errorDescription);
          if (errorCode === "otp_expired") {
            setInvitationState("expired");
            setErrorMessage("Ce lien d'invitation a expiré. Veuillez demander une nouvelle invitation.");
          } else {
            setInvitationState("invalid");
            setErrorMessage(errorDescription || "Lien d'invitation invalide.");
          }
          return;
        }

        // If we have tokens in the URL, set the session
        if (accessToken && refreshToken) {
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.error("Session error:", sessionError);
            if (sessionError.message.includes("expired")) {
              setInvitationState("expired");
              setErrorMessage("Ce lien d'invitation a expiré. Veuillez demander une nouvelle invitation.");
            } else {
              setInvitationState("invalid");
              setErrorMessage("Impossible de valider l'invitation. Veuillez réessayer.");
            }
            return;
          }

          if (sessionData.user) {
            setUserEmail(sessionData.user.email || null);
            
            // Check if user has already set a password (email_confirmed_at is set)
            if (sessionData.user.email_confirmed_at && sessionData.user.last_sign_in_at) {
              // User has already confirmed and signed in before
              const confirmDate = new Date(sessionData.user.email_confirmed_at);
              const signInDate = new Date(sessionData.user.last_sign_in_at);
              
              // If last sign in is significantly after confirmation, user is already set up
              if (signInDate.getTime() - confirmDate.getTime() > 60000) {
                setInvitationState("already_confirmed");
                setTimeout(() => navigate("/"), 2000);
                return;
              }
            }
            
            setInvitationState("valid");
            // Clear the hash from URL for cleaner UX
            window.history.replaceState(null, "", window.location.pathname);
          }
        } else if (data.session?.user) {
          // Already have a session, check if this is a fresh invite flow
          setUserEmail(data.session.user.email || null);
          setInvitationState("valid");
        } else {
          // No tokens and no session
          setInvitationState("invalid");
          setErrorMessage("Aucun lien d'invitation valide trouvé. Veuillez utiliser le lien envoyé par email.");
        }
      } catch (err) {
        console.error("Error processing invitation:", err);
        setInvitationState("invalid");
        setErrorMessage("Une erreur est survenue lors du traitement de l'invitation.");
      }
    };

    handleInvitationToken();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = passwordSchema.safeParse({ password, confirmPassword });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsSubmitting(true);
    try {
      // Update the user's password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        console.error("Password update error:", updateError);
        toast.error("Erreur lors de la définition du mot de passe. Veuillez réessayer.");
        return;
      }

      // Get the current user to update profile if needed
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Ensure profile exists with user info
        const { error: profileError } = await supabase
          .from("profiles")
          .upsert({ 
            id: user.id,
            updated_at: new Date().toISOString()
          }, { 
            onConflict: "id" 
          });

        if (profileError) {
          console.error("Profile update error:", profileError);
          // Don't block the flow for profile issues
        }
      }

      toast.success("Votre compte est activé ! Bienvenue au Cercle Partages.");
      navigate("/");
    } catch (error) {
      console.error("Submission error:", error);
      toast.error("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (invitationState === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Vérification de l'invitation...</p>
        </motion.div>
      </div>
    );
  }

  // Error states
  if (invitationState === "invalid" || invitationState === "expired") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md text-center"
        >
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="font-serif text-2xl text-foreground mb-4">
            {invitationState === "expired" ? "Invitation expirée" : "Invitation invalide"}
          </h1>
          <p className="text-muted-foreground mb-8">
            {errorMessage}
          </p>
          <Link to="/connexion">
            <Button variant="outline">
              Retour à la connexion
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  // Already confirmed state
  if (invitationState === "already_confirmed") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md text-center"
        >
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="font-serif text-2xl text-foreground mb-4">
            Compte déjà activé
          </h1>
          <p className="text-muted-foreground mb-4">
            Votre compte est déjà configuré. Redirection en cours...
          </p>
        </motion.div>
      </div>
    );
  }

  // Valid invitation - show password form
  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 md:p-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="w-full max-w-md"
        >
          {/* Logo */}
          <Link to="/" className="block mb-16">
            <h1 className="font-serif text-2xl text-foreground">
              Cercle Partages
            </h1>
          </Link>

          {/* Title */}
          <div className="mb-12">
            <h2 className="font-serif text-2xl text-foreground mb-2">
              Finaliser votre inscription
            </h2>
            <p className="text-muted-foreground text-sm">
              {userEmail 
                ? `Bienvenue ! Définissez votre mot de passe pour ${userEmail}`
                : "Définissez votre mot de passe pour accéder au Cercle Partages"
              }
            </p>
          </div>

          {/* Password Form */}
          <motion.form
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
            onSubmit={handleSubmit}
          >
            <div className="space-y-2">
              <Label htmlFor="password" className="font-sans text-sm">
                Mot de passe
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Minimum 8 caractères"
                  className="h-12 bg-transparent border-border focus:border-foreground pr-12"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="font-sans text-sm">
                Confirmer le mot de passe
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirmez votre mot de passe"
                  className="h-12 bg-transparent border-border focus:border-foreground pr-12"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <Button 
              variant="nightBlue" 
              size="lg" 
              className="w-full mt-8"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Création en cours..." : "Rejoindre le Cercle"}
            </Button>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Déjà un compte ?{" "}
              <Link to="/connexion" className="hover:text-foreground transition-colors underline">
                Se connecter
              </Link>
            </p>
          </motion.form>
        </motion.div>
      </div>

      {/* Right Panel - Visual */}
      <div className="hidden lg:block lg:w-1/2 bg-night-blue relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center p-16">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="text-center"
          >
            <p className="font-serif text-5xl text-primary-foreground leading-tight mb-8">
              Bienvenue au Cercle
            </p>
            <p className="font-sans text-primary-foreground/70 text-lg max-w-md mx-auto">
              Rejoignez notre communauté d'esprits curieux pour des échanges enrichissants.
            </p>
          </motion.div>
        </div>
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 border border-primary-foreground/10 rounded-full translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 border border-primary-foreground/10 rounded-full -translate-x-1/2 translate-y-1/2" />
      </div>
    </div>
  );
};

export default AcceptInvitation;
