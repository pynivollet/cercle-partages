import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

const Header = () => {
  const location = useLocation();
  const { user, isAdmin, signOut } = useAuth();
  const { t, language, toggleLanguage } = useLanguage();

  const navItems = [
    { label: t.nav.home, path: "/" },
    { label: t.nav.events, path: "/evenements" },
    { label: "Intervenants", path: "/intervenants" },
  ];

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/50"
    >
      <div className="editorial-container">
        <nav className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link 
            to="/" 
            className="font-serif text-xl md:text-2xl tracking-tight text-foreground hover:text-primary transition-colors"
          >
            Cercle Partages
          </Link>

          {/* Navigation */}
          <ul className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`text-sm font-sans tracking-wide transition-colors relative ${
                    location.pathname === item.path
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                  {location.pathname === item.path && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute -bottom-1 left-0 right-0 h-px bg-foreground"
                      transition={{ duration: 0.3 }}
                    />
                  )}
                </Link>
              </li>
            ))}
            {isAdmin && (
              <li>
                <Link
                  to="/admin"
                  className={`text-sm font-sans tracking-wide transition-colors relative ${
                    location.pathname === "/admin"
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.nav.admin}
                  {location.pathname === "/admin" && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute -bottom-1 left-0 right-0 h-px bg-foreground"
                      transition={{ duration: 0.3 }}
                    />
                  )}
                </Link>
              </li>
            )}
          </ul>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1 text-sm font-sans text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Toggle language"
            >
              <Globe className="w-4 h-4" />
              <span className="uppercase">{language}</span>
            </button>

            {/* Auth */}
            {user ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-sm font-sans text-muted-foreground hover:text-foreground"
              >
                {t.nav.logout}
              </Button>
            ) : (
              <Link
                to="/connexion"
                className="text-sm font-sans text-muted-foreground hover:text-foreground transition-colors"
              >
                {t.nav.login}
              </Link>
            )}
          </div>
        </nav>
      </div>
    </motion.header>
  );
};

export default Header;
