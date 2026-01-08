import { Session } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";

const formSchema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type PageState =
  | "loading"
  | "ready"
  | "invalid_or_expired";

export default function AcceptInvitation() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [pageState, setPageState] = useState<PageState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectAfterSuccess = useMemo(() => "/evenements", []);

  useEffect(() => {
    const getSessionFromUrl = async () => {
      // Supabase JS v2 does not expose getSessionFromUrl on the client instance.
      // We replicate the behavior expected for native invitation links.
      const hash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : window.location.hash;
      const params = new URLSearchParams(hash);

      const errorCode = params.get("error_code");
      const errorDescription = params.get("error_description");
      if (errorCode) {
        return {
          data: { session: null as Session | null },
          error: new Error(errorDescription || errorCode),
        };
      }

      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      if (!accessToken || !refreshToken) {
        return { data: { session: null as Session | null }, error: null };
      }

      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      // Clean URL hash for nicer UX
      window.history.replaceState(null, "", window.location.pathname);

      return { data: { session: data.session }, error };
    };

    const init = async () => {
      try {
        // 1) Parse session from URL for native Supabase invite links
        const { data, error } = await getSessionFromUrl();

        if (error) {
          const message = error.message?.toLowerCase().includes("expired")
            ? t.acceptInvitation.errors.expired
            : t.acceptInvitation.errors.invalid;

          setErrorMessage(message);
          setPageState("invalid_or_expired");
          return;
        }

        // If invite link is valid, we will have a session.
        if (data.session?.user) {
          setUserEmail(data.session.user.email ?? null);
          setPageState("ready");
          return;
        }

        // 2) If user is already authenticated, go to the app
        const { data: existing } = await supabase.auth.getSession();
        if (existing.session?.user) {
          navigate(redirectAfterSuccess, { replace: true });
          return;
        }

        // 3) Otherwise, the link is invalid / already used / missing
        setErrorMessage(t.acceptInvitation.errors.invalid);
        setPageState("invalid_or_expired");
      } catch {
        setErrorMessage(t.acceptInvitation.errors.generic);
        setPageState("invalid_or_expired");
      }
    };

    init();
  }, [navigate, redirectAfterSuccess, t.acceptInvitation.errors.expired, t.acceptInvitation.errors.generic, t.acceptInvitation.errors.invalid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = formSchema.safeParse({ firstName, lastName, password, confirmPassword });
    if (!result.success) {
      const firstIssue = result.error.issues[0];
      let msg: string = t.acceptInvitation.errors.generic;
      if (firstIssue.path?.[0] === "confirmPassword") {
        msg = t.acceptInvitation.errors.passwordMismatch;
      } else if (firstIssue.path?.[0] === "password") {
        msg = t.acceptInvitation.errors.passwordTooShort;
      } else if (firstIssue.path?.[0] === "firstName" || firstIssue.path?.[0] === "lastName") {
        msg = t.acceptInvitation.errors.nameRequired;
      }
      toast.error(msg);
      return;
    }

    setIsSubmitting(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error(t.acceptInvitation.errors.generic);
        return;
      }

      // 1) Update password and user_metadata
      const { error: updateError } = await supabase.auth.updateUser({
        password,
        data: {
          first_name: firstName,
          last_name: lastName,
        },
      });

      if (updateError) {
        toast.error(t.acceptInvitation.errors.updateFailed);
        return;
      }

      // 2) Upsert profile in profiles table with first_name and last_name
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
        toast.error(t.common.error);
        return;
      }

      toast.success(t.acceptInvitation.success);
      navigate(redirectAfterSuccess, { replace: true });
    } catch {
      toast.error(t.acceptInvitation.errors.generic);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (pageState === "loading") {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse">
          <p className="font-serif text-2xl text-foreground">Cercle Partages</p>
          <p className="text-muted-foreground text-sm mt-2">{t.common.loading}</p>
        </div>
      </main>
    );
  }

  if (pageState === "invalid_or_expired") {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-8">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full"
          aria-labelledby="accept-invitation-title"
        >
          <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
            <AlertCircle className="w-7 h-7 text-destructive" />
          </div>

          <h1 id="accept-invitation-title" className="font-serif text-2xl text-foreground">
            {t.acceptInvitation.title}
          </h1>
          <p className="text-muted-foreground mt-3">{errorMessage}</p>

          <div className="mt-8">
            <Link to="/connexion">
              <Button variant="outline">{t.nav.login}</Button>
            </Link>
          </div>
        </motion.section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background flex">
      <section className="w-full lg:w-1/2 flex items-center justify-center p-8 md:p-16">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="w-full max-w-md"
        >
          <Link to="/" className="block mb-14" aria-label="Cercle Partages">
            <span className="font-serif text-2xl text-foreground">Cercle Partages</span>
          </Link>

          <header className="mb-10">
            <h1 className="font-serif text-2xl text-foreground">{t.acceptInvitation.title}</h1>
            <p className="text-muted-foreground text-sm mt-2">
              {userEmail ? t.acceptInvitation.subtitleWithEmail.replace("{email}", userEmail) : t.acceptInvitation.subtitle}
            </p>
          </header>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="font-sans text-sm">
                  {t.auth.firstName}
                </Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder={t.auth.firstName}
                  className="h-12 bg-transparent border-border focus:border-foreground"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  autoComplete="given-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="font-sans text-sm">
                  {t.auth.lastName}
                </Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder={t.auth.lastName}
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
                  placeholder={t.acceptInvitation.passwordPlaceholder}
                  className="h-12 bg-transparent border-border focus:border-foreground pr-12"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? t.acceptInvitation.hidePassword : t.acceptInvitation.showPassword}
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
                  placeholder={t.acceptInvitation.confirmPasswordPlaceholder}
                  className="h-12 bg-transparent border-border focus:border-foreground pr-12"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showConfirmPassword ? t.acceptInvitation.hidePassword : t.acceptInvitation.showPassword}
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
              {isSubmitting ? t.common.loading : t.acceptInvitation.submit}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {t.acceptInvitation.haveAccount}{" "}
            <Link to="/connexion" className="hover:text-foreground transition-colors underline">
              {t.nav.login}
            </Link>
          </p>
        </motion.div>
      </section>

      <aside className="hidden lg:block lg:w-1/2 bg-night-blue relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center p-16">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
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
        <div className="absolute top-0 right-0 w-96 h-96 border border-primary-foreground/10 rounded-full translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 border border-primary-foreground/10 rounded-full -translate-x-1/2 translate-y-1/2" />
      </aside>
    </main>
  );
}
