import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Login = () => {
  const [isInvitation, setIsInvitation] = useState(false);

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
              Connexion
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
              Invitation
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
            >
              <div className="space-y-2">
                <Label htmlFor="email" className="font-sans text-sm">
                  Adresse email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="votre@email.com"
                  className="h-12 bg-transparent border-border focus:border-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="font-sans text-sm">
                  Mot de passe
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="h-12 bg-transparent border-border focus:border-foreground"
                />
              </div>

              <Button variant="nightBlue" size="lg" className="w-full mt-8">
                Se connecter
              </Button>

              <p className="text-center text-sm text-muted-foreground mt-6">
                <a href="#" className="hover:text-foreground transition-colors">
                  Mot de passe oublié ?
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
            >
              <p className="text-muted-foreground mb-8">
                Vous avez reçu un code d'invitation ? Utilisez-le pour créer votre compte membre.
              </p>

              <div className="space-y-2">
                <Label htmlFor="inviteCode" className="font-sans text-sm">
                  Code d'invitation
                </Label>
                <Input
                  id="inviteCode"
                  type="text"
                  placeholder="XXXX-XXXX-XXXX"
                  className="h-12 bg-transparent border-border focus:border-foreground font-mono tracking-widest"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="inviteEmail" className="font-sans text-sm">
                  Adresse email
                </Label>
                <Input
                  id="inviteEmail"
                  type="email"
                  placeholder="votre@email.com"
                  className="h-12 bg-transparent border-border focus:border-foreground"
                />
              </div>

              <Button variant="nightBlue" size="lg" className="w-full mt-8">
                Valider l'invitation
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
              L'appétit pour l'altérité
            </p>
            <p className="font-sans text-primary-foreground/70 text-lg max-w-md mx-auto">
              Un cercle d'échanges autour de l'architecture, l'écologie, l'art, 
              la culture et la vie professionnelle.
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
