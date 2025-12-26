import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";

const Header = () => {
  const location = useLocation();

  const navItems = [
    { label: "Accueil", path: "/" },
    { label: "Rencontres", path: "/rencontres" },
    { label: "Archives", path: "/archives" },
  ];

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
          </ul>

          {/* Login Link */}
          <Link
            to="/connexion"
            className="text-sm font-sans text-muted-foreground hover:text-foreground transition-colors"
          >
            Connexion
          </Link>
        </nav>
      </div>
    </motion.header>
  );
};

export default Header;
