import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import presenterImage from "@/assets/presenter-portrait.jpg";

// Mock data - in production this would come from an API
const eventData = {
  id: "1",
  date: "16 Janvier 2025",
  time: "19h30",
  title: "L'architecture face au climat",
  presenter: {
    name: "Marie-Claire Dupont",
    role: "Architecte et urbaniste",
    bio: "Marie-Claire Dupont est architecte et urbaniste, spécialisée dans les questions d'adaptation climatique des villes. Elle a fondé l'agence Demain Architecture en 2015.",
    image: presenterImage,
  },
  theme: "Architecture & Écologie",
  location: "Paris, 7e arrondissement",
  address: "Adresse communiquée aux inscrits",
  description: `Comment l'architecture peut-elle répondre aux défis du changement climatique ? Marie-Claire Dupont nous propose une réflexion sur les nouvelles pratiques architecturales qui émergent face à l'urgence écologique.

  Cette présentation sera suivie d'un échange ouvert et d'un dîner partagé.`,
  format: "Présentation de 45 minutes, suivie d'un échange et d'un repas",
};

const EventDetail = () => {
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
            ← Retour aux rencontres
          </Link>
        </div>

        {/* Event Header */}
        <section className="editorial-container section-padding pt-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
            {/* Main Content */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="lg:col-span-2"
            >
              <p className="font-sans text-xs tracking-widest uppercase text-ochre mb-4">
                {eventData.theme}
              </p>
              <h1 className="text-headline text-foreground mb-8">
                {eventData.title}
              </h1>

              <div className="prose prose-lg max-w-none">
                <p className="text-lg text-muted-foreground leading-relaxed whitespace-pre-line">
                  {eventData.description}
                </p>
              </div>

              <div className="mt-12 pt-8 border-t border-border">
                <h3 className="font-serif text-xl mb-4">Format</h3>
                <p className="text-muted-foreground">{eventData.format}</p>
              </div>
            </motion.div>

            {/* Sidebar */}
            <motion.aside
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="lg:col-span-1"
            >
              <div className="sticky top-32 space-y-8">
                {/* Date & Time */}
                <div className="p-6 bg-muted/50 border border-border">
                  <p className="font-sans text-sm text-muted-foreground mb-2">
                    Date et heure
                  </p>
                  <p className="font-serif text-2xl text-foreground">
                    {eventData.date}
                  </p>
                  <p className="font-sans text-foreground mt-1">
                    {eventData.time}
                  </p>
                </div>

                {/* Location */}
                <div className="p-6 bg-muted/50 border border-border">
                  <p className="font-sans text-sm text-muted-foreground mb-2">
                    Lieu
                  </p>
                  <p className="font-serif text-lg text-foreground">
                    {eventData.location}
                  </p>
                  <p className="font-sans text-sm text-muted-foreground mt-1">
                    {eventData.address}
                  </p>
                </div>

                {/* CTA */}
                <Button variant="nightBlue" size="lg" className="w-full">
                  S'inscrire à la rencontre
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Places limitées • Sur invitation
                </p>
              </div>
            </motion.aside>
          </div>
        </section>

        {/* Presenter Section */}
        <section className="bg-muted/30 section-padding">
          <div className="editorial-container">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-12 items-center"
            >
              {/* Image */}
              <div className="md:col-span-1">
                <div className="aspect-[3/4] overflow-hidden">
                  <img
                    src={eventData.presenter.image}
                    alt={eventData.presenter.name}
                    className="w-full h-full object-cover grayscale"
                  />
                </div>
              </div>

              {/* Bio */}
              <div className="md:col-span-2">
                <p className="font-sans text-sm tracking-widest uppercase text-muted-foreground mb-4">
                  Présenté par
                </p>
                <h2 className="font-serif text-3xl text-foreground mb-2">
                  {eventData.presenter.name}
                </h2>
                <p className="font-sans text-ochre mb-6">
                  {eventData.presenter.role}
                </p>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {eventData.presenter.bio}
                </p>
                <div className="mt-8">
                  <Link
                    to={`/presentateur/${id}`}
                    className="font-sans text-sm text-foreground border-b border-foreground/30 pb-1 hover:border-foreground transition-colors"
                  >
                    Découvrir son profil complet
                  </Link>
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

export default EventDetail;
