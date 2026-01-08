import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

const Login = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, resetPassword, user } = useAuth();
  const { t, language } = useLanguage();

  // Login form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const isRecoveryMode = searchParams.get("type") === "recovery";

  // Redirect if already logged in
  useEffect(() => {
    if (user && searchParams.get("type") !== "recovery") {
      navigate("/");
    }
  }, [user, navigate, searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isRecoveryMode) {
      if (password !== confirmPassword) {
        toast.error(t.auth.passwordMismatch);
        return;
      }
      if (password.length < 8) {
        toast.error(t.auth.passwordTooShort);
        return;
      }

      setIsLoading(true);
      try {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) {
          toast.error(error.message);
        } else {
          toast.success(t.profile.passwordUpdated);
          navigate("/");
        }
      } catch {
        toast.error(t.auth.error);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      toast.error(t.auth.invalidCredentials);
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        toast.error(t.auth.invalidCredentials);
      } else {
        toast.success(t.auth.loginSuccess);
        navigate("/");
      }
    } catch {
      toast.error(t.auth.error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error(t.auth.emailRequired);
      return;
    }

    const emailValidation = z.string().email().safeParse(email);
    if (!emailValidation.success) {
      toast.error(t.auth.invalidCredentials);
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await resetPassword(email);
      if (error) {
        toast.error(error.message || t.auth.error);
      } else {
        toast.success(t.auth.resetPasswordSuccess);
      }
    } catch {
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
              {isRecoveryMode ? (language === "fr" ? "Réinitialiser le mot de passe" : "Reset password") : t.auth.login}
            </h2>
            <p className="text-muted-foreground text-sm">
              {isRecoveryMode 
                ? (language === "fr" ? "Veuillez définir votre nouveau mot de passe" : "Please set your new password")
                : (language === "fr" ? "Accès réservé aux membres invités" : "Access reserved for invited members")}
            </p>
          </div>

          {/* Login Form */}
          <motion.form
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
            onSubmit={handleLogin}
          >
            {!isRecoveryMode && (
              <div className="space-y-2">
                <Label htmlFor="email" className="font-sans text-sm">
                  {t.auth.email}
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="votre@email.com"
                  className="h-12 bg-transparent border-border focus:border-foreground"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password" className="font-sans text-sm">
                {isRecoveryMode ? t.auth.password : t.auth.password}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder=""
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

            {isRecoveryMode && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="font-sans text-sm">
                  {t.auth.confirmPassword}
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder=""
                    className="h-12 bg-transparent border-border focus:border-foreground pr-12"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <Button 
              variant="nightBlue" 
              size="lg" 
              className="w-full mt-8"
              disabled={isLoading}
            >
              {isLoading ? t.common.loading : (isRecoveryMode ? (language === "fr" ? "Mettre à jour" : "Update") : t.auth.loginButton)}
            </Button>

            {!isRecoveryMode && (
              <p className="text-center text-sm text-muted-foreground mt-6">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="hover:text-foreground transition-colors"
                  disabled={isLoading}
                >
                  {t.auth.forgotPassword}
                </button>
              </p>
            )}
            
            {isRecoveryMode && (
              <p className="text-center text-sm text-muted-foreground mt-6">
                <Link to="/connexion" className="hover:text-foreground transition-colors">
                  {t.common.back}
                </Link>
              </p>
            )}
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
              {t.hero.slogan}
            </p>
            <p className="font-sans text-primary-foreground/70 text-lg max-w-md mx-auto">
              {t.hero.description}
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

export default Login;
