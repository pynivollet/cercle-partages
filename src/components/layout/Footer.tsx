import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";

const Footer = () => {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-border bg-background">
      <div className="editorial-container section-padding">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16">
          {/* Brand */}
          <div>
            <h3 className="font-serif text-2xl mb-4">Cercle Partages</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">{t.hero.slogan}</p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="font-sans text-sm font-medium mb-4 text-foreground">{t.footer.navigation}</h4>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/evenements"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t.nav.events}
                </Link>
              </li>
              <li>
                <Link
                  to="/intervenants"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t.nav.presenters}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-sans text-sm font-medium mb-4 text-foreground">{t.footer.contact}</h4>
            <div className="text-sm text-muted-foreground leading-relaxed">
              <p>{t.footer.invitationOnly}</p>
              <p className="mt-2">{t.footer.contactPerson}</p>
            </div>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            © {new Date().getFullYear()} Cercle Partages. {t.footer.rights}.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
