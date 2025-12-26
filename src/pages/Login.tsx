import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { validateInvitationToken } from "@/services/invitations";
import { toast } from "sonner";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

const signupSchema = z.object({
  inviteCode: z.string().min(1),
  email: z.string().trim().email(),
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const Login = () => {
  const [isInvitation, setIsInvitation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { signIn, signUp, user } = useAuth();
  const { t } = useLanguage();

  // Login form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Signup form state
  const [inviteCode, setInviteCode] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // Check for invitation token in URL
  useEffect(() => {
    const invitation = searchParams.get("invitation");
    if (invitation) {
      setInviteCode(invitation);
      setIsInvitation(true);
    }
  }, [searchParams]);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = signupSchema.safeParse({
      inviteCode,
      email: signupEmail,
      password: signupPassword,
      confirmPassword,
      firstName,
      lastName,
    });

    if (!validation.success) {
      const firstError = validation.error.errors[0];
      if (firstError.path.includes("confirmPassword")) {
        toast.error(t.auth.passwordMismatch);
      } else if (firstError.path.includes("password")) {
        toast.error(t.auth.passwordTooShort);
      } else if (firstError.path.includes("email")) {
        toast.error(t.auth.emailRequired);
      } else {
        toast.error(t.auth.error);
      }
      return;
    }

    setIsLoading(true);
    try {
      // Validate invitation token first
      const { valid, error: inviteError } = await validateInvitationToken(inviteCode);
      if (!valid) {
        toast.error(inviteError || t.auth.invalidInvitation);
        setIsLoading(false);
        return;
      }

      const { error } = await signUp(signupEmail, signupPassword, inviteCode, {
        first_name: firstName,
        last_name: lastName,
      });

      if (error) {
        toast.error(error.message || t.auth.error);
      } else {
        toast.success(t.auth.accountCreated);
        navigate("/");
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

          {/* Toggle */}
          <div className="flex gap-8 mb-12 border-b border-border">
            <button
              onClick={() => setIsInvitation(false)}
              className={`pb-4 font-sans text-sm transition-colors relative ${
                !isInvitation
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.auth.login}
              {!isInvitation && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-px bg-foreground"
                />
              )}
            </button>
            <button
              onClick={() => setIsInvitation(true)}
              className={`pb-4 font-sans text-sm transition-colors relative ${
                isInvitation
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.auth.invitation}
              {isInvitation && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-px bg-foreground"
                />
              )}
            </button>
          </div>

          {!isInvitation ? (
            /* Login Form */
            <motion.form
              key="login"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
              onSubmit={handleLogin}
            >
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

              <div className="space-y-2">
                <Label htmlFor="password" className="font-sans text-sm">
                  {t.auth.password}
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="h-12 bg-transparent border-border focus:border-foreground"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <Button 
                variant="nightBlue" 
                size="lg" 
                className="w-full mt-8"
                disabled={isLoading}
              >
                {isLoading ? t.common.loading : t.auth.loginButton}
              </Button>

              <p className="text-center text-sm text-muted-foreground mt-6">
                <a href="#" className="hover:text-foreground transition-colors">
                  {t.auth.forgotPassword}
                </a>
              </p>
            </motion.form>
          ) : (
            /* Invitation Form */
            <motion.form
              key="invitation"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
              onSubmit={handleSignup}
            >
              <p className="text-muted-foreground mb-8">
                {t.auth.invitationDescription}
              </p>

              <div className="space-y-2">
                <Label htmlFor="inviteCode" className="font-sans text-sm">
                  {t.auth.inviteCode}
                </Label>
                <Input
                  id="inviteCode"
                  type="text"
                  placeholder="XXXX-XXXX-XXXX"
                  className="h-12 bg-transparent border-border focus:border-foreground font-mono tracking-widest"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="font-sans text-sm">
                    {t.auth.firstName}
                  </Label>
                  <Input
                    id="firstName"
                    type="text"
                    className="h-12 bg-transparent border-border focus:border-foreground"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="font-sans text-sm">
                    {t.auth.lastName}
                  </Label>
                  <Input
                    id="lastName"
                    type="text"
                    className="h-12 bg-transparent border-border focus:border-foreground"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signupEmail" className="font-sans text-sm">
                  {t.auth.email}
                </Label>
                <Input
                  id="signupEmail"
                  type="email"
                  placeholder="votre@email.com"
                  className="h-12 bg-transparent border-border focus:border-foreground"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signupPassword" className="font-sans text-sm">
                  {t.auth.password}
                </Label>
                <Input
                  id="signupPassword"
                  type="password"
                  placeholder="••••••••"
                  className="h-12 bg-transparent border-border focus:border-foreground"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="font-sans text-sm">
                  {t.auth.confirmPassword}
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  className="h-12 bg-transparent border-border focus:border-foreground"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>

              <Button 
                variant="nightBlue" 
                size="lg" 
                className="w-full mt-8"
                disabled={isLoading}
              >
                {isLoading ? t.common.loading : t.auth.signupButton}
              </Button>
            </motion.form>
          )}
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
