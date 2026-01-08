import { motion } from "framer-motion";
import architectureImage from "@/assets/architecture-detail.jpg";
import { useLanguage } from "@/i18n/LanguageContext";

const Philosophy = () => {
  const { t } = useLanguage();

  return (
    <section className="section-padding">
      <div className="editorial-container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          {/* Text */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <p className="font-sans text-sm tracking-widest uppercase text-muted-foreground mb-6">
              {t.philosophy.title}
            </p>
            <h2 className="text-headline text-foreground mb-8">
              {t.philosophy.headline}
            </h2>
            <div className="space-y-6 text-muted-foreground">
              <p className="text-lg leading-relaxed">
                {t.philosophy.description1}
              </p>
              <p className="text-lg leading-relaxed">
                {t.philosophy.description2}
              </p>
            </div>
          </motion.div>

          {/* Image */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="aspect-square overflow-hidden">
              <img
                src={architectureImage}
                alt="Espace architectural"
                className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700"
              />
            </div>
            <div className="absolute -bottom-6 -left-6 w-32 h-32 border border-ochre/30" />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Philosophy;
