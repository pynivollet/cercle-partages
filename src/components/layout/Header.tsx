import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Globe, Menu, X } from "lucide-react";

const Header = () => {
  const location = useLocation();
  const { user, isAdmin, signOut } = useAuth();
  const { t, language, toggleLanguage } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: t.nav.home, path: "/" },
    { label: t.nav.events, path: "/evenements" },
    { label: "Intervenants", path: "/intervenants" },
  ];

  const handleLogout = async () => {
    await signOut();
    setMobileMenuOpen(false);
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

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
            onClick={closeMobileMenu}
          >
            Cercle Partages
          </Link>

          {/* Desktop Navigation */}
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

            {/* Desktop Auth */}
            <div className="hidden md:block">
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

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-foreground"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </nav>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden bg-background border-t border-border/50"
          >
            <div className="editorial-container py-4">
              <ul className="space-y-2">
                {navItems.map((item) => (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      onClick={closeMobileMenu}
                      className={`block py-2 text-sm font-sans transition-colors ${
                        location.pathname === item.path
                          ? "text-foreground font-medium"
                          : "text-muted-foreground"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
                {isAdmin && (
                  <li>
                    <Link
                      to="/admin"
                      onClick={closeMobileMenu}
                      className={`block py-2 text-sm font-sans transition-colors ${
                        location.pathname === "/admin"
                          ? "text-foreground font-medium"
                          : "text-muted-foreground"
                      }`}
                    >
                      {t.nav.admin}
                    </Link>
                  </li>
                )}
                <li className="pt-2 border-t border-border/50">
                  {user ? (
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left py-2 text-sm font-sans text-muted-foreground"
                    >
                      {t.nav.logout}
                    </button>
                  ) : (
                    <Link
                      to="/connexion"
                      onClick={closeMobileMenu}
                      className="block py-2 text-sm font-sans text-muted-foreground"
                    >
                      {t.nav.login}
                    </Link>
                  )}
                </li>
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
};

export default Header;
