import { motion } from "framer-motion";
import heroImage from "@/assets/hero-gathering.jpg";
import logoImage from "@/assets/hero-background.png";
import { useLanguage } from "@/i18n/LanguageContext";

const Hero = () => {
  const { t } = useLanguage();

  return (
    <section className="relative min-h-screen flex items-center">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroImage}
          alt={t.footer.aboutText}
          className="w-full h-full object-cover object-center opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background" />
      </div>

      {/* Content */}
      <div className="editorial-container relative z-10 pt-32 pb-20">
        <div className="max-w-3xl">
          <motion.img
            src={logoImage}
            alt="Logo Cercle Partages"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="w-80 md:w-[28rem] lg:w-[32rem] h-auto mb-10"
          />
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-display text-foreground mb-4"
          >
            Cercle Partages
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-2xl md:text-3xl font-serif italic text-muted-foreground mb-8"
          >
            {t.hero.slogan}
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="text-xl md:text-2xl font-serif italic text-muted-foreground leading-relaxed max-w-xl"
          >
            {t.hero.description}
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1 }}
            className="mt-12 flex items-center gap-8"
          >
            <a
              href="#calendar"
              className="font-sans text-sm tracking-wide text-foreground border-b border-foreground/30 pb-1 hover:border-foreground transition-colors"
            >
              {t.hero.discoverEvents}
            </a>
          </motion.div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.5 }}
        className="absolute bottom-12 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="w-px h-16 bg-gradient-to-b from-foreground/30 to-transparent"
        />
      </motion.div>
    </section>
  );
};

export default Hero;
