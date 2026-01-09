import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/i18n/LanguageContext";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const signupSchema = z
  .object({
    firstName: z.string().min(1, "Le prénom est requis"),
    lastName: z.string().min(1, "Le nom est requis"),
    password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

const Signup = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Handle invitation token from URL
  useEffect(() => {
    const handleInviteToken = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const type = hashParams.get("type");
      
      // Check for invite or signup type (Supabase uses both)
      if (accessToken && (type === "invite" || type === "signup" || type === "recovery")) {
        try {
          // Set the session with both tokens
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || "",
          });

          if (error) {
            console.error("Session error:", error);
            toast.error("Lien d'invitation invalide ou expiré");
            navigate("/connexion");
            return;
          }

        if (data.user) {
            setAccessToken(accessToken);
            setUserEmail(data.user.email || null);
            
            // Nettoyer l'URL pour enlever les tokens de l'historique du navigateur
            if (window.history.replaceState) {
              window.history.replaceState(null, "", window.location.pathname);
            }
          }
        } catch (e) {
          console.error("Error setting session:", e);
          toast.error("Erreur lors de la validation de l'invitation");
          navigate("/connexion");
        }
      } else {
        // Check if user is already logged in (came from a direct link)
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setAccessToken(session.access_token);
          setUserEmail(session.user.email || null);
        } else {
          toast.error("Lien d'invitation invalide ou expiré");
          navigate("/connexion");
        }
      }
    };

    handleInviteToken();
  }, [navigate]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = signupSchema.safeParse({ firstName, lastName, password, confirmPassword });
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast.error(firstError.message);
      return;
    }

    if (!accessToken) {
      toast.error("Token d'invitation invalide");
      return;
    }

    setIsLoading(true);
    try {
      // Session should already be set from useEffect

      // Update the user's password + metadata
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
        data: {
          first_name: firstName,
          last_name: lastName,
        },
      });

      if (updateError) {
        console.error("Update error:", updateError);
        toast.error("Erreur lors de la création du compte");
        return;
      }

      // Upsert profile (row may not exist)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error: profileError } = await supabase
          .from("profiles")
          .upsert(
            {
              id: user.id,
              first_name: firstName,
              last_name: lastName,
            },
            { onConflict: "id" }
          );

        if (profileError) {
          console.error("Profile upsert error:", profileError);
          toast.error("Erreur lors de la sauvegarde du profil");
          return;
        }
      }

      toast.success(t.auth.accountCreated);
      navigate("/");
    } catch (error) {
      console.error("Signup error:", error);
      toast.error(t.auth.error);
    } finally {
      setIsLoading(false);
    }
  };

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
              Créer votre compte
            </h2>
            <p className="text-muted-foreground text-sm">
              {userEmail ? `Bienvenue ! Finalisez votre inscription pour ${userEmail}` : "Finalisez votre inscription"}
            </p>
          </div>

          {/* Signup Form */}
          <motion.form
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
            onSubmit={handleSignup}
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="font-sans text-sm">
                  Prénom
                </Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="Jean"
                  className="h-12 bg-transparent border-border focus:border-foreground"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  autoComplete="given-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="font-sans text-sm">
                  Nom
                </Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Dupont"
                  className="h-12 bg-transparent border-border focus:border-foreground"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  autoComplete="family-name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="font-sans text-sm">
                {t.auth.password}
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
                {t.auth.confirmPassword}
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
              disabled={isLoading || !accessToken}
            >
              {isLoading ? t.common.loading : t.auth.signupButton}
            </Button>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Déjà un compte ?{" "}
              <Link to="/connexion" className="hover:text-foreground transition-colors">
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

export default Signup;
