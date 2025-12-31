import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Lock, Check } from "lucide-react";

const Profile = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile, isLoading: authLoading } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();

  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const { firstName: initialFirstName, lastName: initialLastName } = {
    firstName: profile?.first_name || "",
    lastName: profile?.last_name || "",
  };

  // Profile form schema
  const profileSchema = z.object({
    firstName: z.string().min(1, t.acceptInvitation.errors.nameRequired),
    lastName: z.string().min(1, t.acceptInvitation.errors.nameRequired),
  });

  // Password form schema
  const passwordSchema = z
    .object({
      currentPassword: z.string().min(1, t.auth.passwordRequired),
      newPassword: z.string().min(8, t.auth.passwordTooShort),
      confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: t.auth.passwordMismatch,
      path: ["confirmPassword"],
    });

  type ProfileFormData = z.infer<typeof profileSchema>;
  type PasswordFormData = z.infer<typeof passwordSchema>;

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: initialFirstName,
      lastName: initialLastName,
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (profile) {
      profileForm.reset({
        firstName: profile.first_name || "",
        lastName: profile.last_name || "",
      });
    }
  }, [profile, profileForm]);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/connexion", { replace: true });
    }
  }, [authLoading, user, navigate]);

  const handleProfileSubmit = async (data: ProfileFormData) => {
    if (!user) return;

    setIsUpdatingProfile(true);
    setProfileSuccess(false);

    try {
      // Update user metadata
      const { error: metaError } = await supabase.auth.updateUser({
        data: {
          first_name: data.firstName,
          last_name: data.lastName,
        },
      });

      if (metaError) throw metaError;

      // Upsert profiles table (row may not exist yet)
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            first_name: data.firstName,
            last_name: data.lastName,
          },
          { onConflict: "id" }
        );

      if (profileError) throw profileError;

      await refreshProfile();
      setProfileSuccess(true);

      toast({
        title: t.profile.profileUpdated,
      });

      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (error: any) {
      toast({
        title: t.common.error,
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handlePasswordSubmit = async (data: PasswordFormData) => {
    setIsUpdatingPassword(true);
    setPasswordSuccess(false);

    try {
      const { error } = await supabase.auth.updateUser({
        password: data.newPassword,
      });

      if (error) throw error;

      setPasswordSuccess(true);
      passwordForm.reset();

      toast({
        title: t.profile.passwordUpdated,
      });

      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (error: any) {
      toast({
        title: t.common.error,
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="editorial-container max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-2">
              {t.profile.title}
            </h1>
            <p className="text-muted-foreground mb-10">
              {user?.email}
            </p>

            {/* Profile Information Section */}
            <section className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <User className="w-5 h-5 text-muted-foreground" />
                </div>
                <h2 className="font-serif text-xl text-foreground">
                  {t.profile.personalInfo}
                </h2>
              </div>

              <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">{t.auth.firstName}</Label>
                    <Input
                      id="firstName"
                      {...profileForm.register("firstName")}
                      className="bg-background"
                    />
                    {profileForm.formState.errors.firstName && (
                      <p className="text-sm text-destructive">
                        {profileForm.formState.errors.firstName.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">{t.auth.lastName}</Label>
                    <Input
                      id="lastName"
                      {...profileForm.register("lastName")}
                      className="bg-background"
                    />
                    {profileForm.formState.errors.lastName && (
                      <p className="text-sm text-destructive">
                        {profileForm.formState.errors.lastName.message}
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isUpdatingProfile}
                  className="w-full sm:w-auto"
                >
                  {isUpdatingProfile ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t.common.loading}
                    </>
                  ) : profileSuccess ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      {t.profile.saved}
                    </>
                  ) : (
                    t.common.save
                  )}
                </Button>
              </form>
            </section>

            {/* Password Section */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <Lock className="w-5 h-5 text-muted-foreground" />
                </div>
                <h2 className="font-serif text-xl text-foreground">
                  {t.profile.changePassword}
                </h2>
              </div>

              <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">{t.profile.currentPassword}</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    {...passwordForm.register("currentPassword")}
                    className="bg-background"
                  />
                  {passwordForm.formState.errors.currentPassword && (
                    <p className="text-sm text-destructive">
                      {passwordForm.formState.errors.currentPassword.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">{t.profile.newPassword}</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder={t.acceptInvitation.passwordPlaceholder}
                    {...passwordForm.register("newPassword")}
                    className="bg-background"
                  />
                  {passwordForm.formState.errors.newPassword && (
                    <p className="text-sm text-destructive">
                      {passwordForm.formState.errors.newPassword.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t.auth.confirmPassword}</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder={t.acceptInvitation.confirmPasswordPlaceholder}
                    {...passwordForm.register("confirmPassword")}
                    className="bg-background"
                  />
                  {passwordForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-destructive">
                      {passwordForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="w-full sm:w-auto"
                >
                  {isUpdatingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t.common.loading}
                    </>
                  ) : passwordSuccess ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      {t.profile.saved}
                    </>
                  ) : (
                    t.profile.updatePassword
                  )}
                </Button>
              </form>
            </section>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Profile;
