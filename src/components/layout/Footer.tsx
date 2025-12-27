import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-background">
      <div className="editorial-container section-padding">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16">
          {/* Brand */}
          <div>
            <h3 className="font-serif text-2xl mb-4">Cercle Partages</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              L'appétit pour l'altérité
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="font-sans text-sm font-medium mb-4 text-foreground">
              Navigation
            </h4>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/evenements"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Événements
                </Link>
              </li>
              <li>
                <Link
                  to="/intervenants"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Intervenants
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-sans text-sm font-medium mb-4 text-foreground">
              Contact
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Le Cercle Partages est accessible sur invitation uniquement.
              <br />
              Pour toute demande, veuillez contacter un membre du cercle.
            </p>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            © {new Date().getFullYear()} Cercle Partages. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
