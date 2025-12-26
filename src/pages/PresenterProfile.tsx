import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import presenterImage from "@/assets/presenter-portrait.jpg";

const presenterData = {
  id: "1",
  name: "Marie-Claire Dupont",
  role: "Architecte et urbaniste",
  image: presenterImage,
  bio: `Marie-Claire Dupont est architecte et urbaniste, diplômée de l'École nationale supérieure d'architecture de Paris-Belleville. 

Après quinze années passées dans de grandes agences parisiennes, elle fonde en 2015 l'agence Demain Architecture, spécialisée dans les questions d'adaptation climatique des villes et des bâtiments.

Son travail explore la relation entre architecture, environnement et usages sociaux. Elle enseigne également à l'ENSA Paris-Malaquais et intervient régulièrement dans des conférences internationales.`,
  expertise: ["Architecture durable", "Urbanisme climatique", "Rénovation énergétique"],
  pastPresentations: [
    {
      id: "1",
      date: "16 Janvier 2025",
      title: "L'architecture face au climat",
    },
    {
      id: "prev-1",
      date: "12 Mars 2024",
      title: "Habiter la ville de demain",
    },
  ],
};

const PresenterProfile = () => {
  const { id } = useParams();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 md:pt-32">
        {/* Breadcrumb */}
        <div className="editorial-container mb-8">
          <Link
            to="/"
            className="font-sans text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Retour
          </Link>
        </div>

        <section className="editorial-container section-padding pt-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
            {/* Image */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="lg:col-span-1"
            >
              <div className="aspect-[3/4] overflow-hidden sticky top-32">
                <img
                  src={presenterData.image}
                  alt={presenterData.name}
                  className="w-full h-full object-cover grayscale"
                />
              </div>
            </motion.div>

            {/* Content */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="lg:col-span-2"
            >
              <p className="font-sans text-sm tracking-widest uppercase text-muted-foreground mb-4">
                Intervenant
              </p>
              <h1 className="text-headline text-foreground mb-2">
                {presenterData.name}
              </h1>
              <p className="font-sans text-xl text-ochre mb-12">
                {presenterData.role}
              </p>

              {/* Bio */}
              <div className="prose prose-lg max-w-none mb-12">
                <p className="text-lg text-muted-foreground leading-relaxed whitespace-pre-line">
                  {presenterData.bio}
                </p>
              </div>

              {/* Expertise */}
              <div className="mb-12 pb-12 border-b border-border">
                <h3 className="font-serif text-xl mb-4">Domaines d'expertise</h3>
                <div className="flex flex-wrap gap-3">
                  {presenterData.expertise.map((item) => (
                    <span
                      key={item}
                      className="px-4 py-2 bg-muted text-sm text-foreground"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              {/* Past Presentations */}
              <div>
                <h3 className="font-serif text-xl mb-6">
                  Présentations au Cercle
                </h3>
                <div className="space-y-4">
                  {presenterData.pastPresentations.map((presentation) => (
                    <Link
                      key={presentation.id}
                      to={`/rencontre/${presentation.id}`}
                      className="block group py-4 border-b border-border hover:bg-muted/30 transition-colors -mx-4 px-4"
                    >
                      <p className="font-sans text-sm text-muted-foreground mb-1">
                        {presentation.date}
                      </p>
                      <p className="font-serif text-lg text-foreground group-hover:text-primary transition-colors">
                        {presentation.title}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default PresenterProfile;
