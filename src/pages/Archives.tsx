import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

interface ArchivedEvent {
  id: string;
  date: string;
  year: string;
  title: string;
  presenter: string;
  theme: string;
}

const archivedEvents: ArchivedEvent[] = [
  {
    id: "archive-1",
    date: "12 Novembre",
    year: "2024",
    title: "L'art de la fermentation",
    presenter: "Thomas Bernard",
    theme: "Gastronomie & Culture",
  },
  {
    id: "archive-2",
    date: "24 Octobre",
    year: "2024",
    title: "Photographie et mémoire urbaine",
    presenter: "Catherine Leroy",
    theme: "Art & Société",
  },
  {
    id: "archive-3",
    date: "05 Septembre",
    year: "2024",
    title: "Le jardin comme refuge",
    presenter: "Antoine Mercier",
    theme: "Écologie & Bien-être",
  },
  {
    id: "archive-4",
    date: "18 Juin",
    year: "2024",
    title: "L'économie du lien",
    presenter: "Isabelle Fontaine",
    theme: "Société & Économie",
  },
  {
    id: "archive-5",
    date: "02 Mai",
    year: "2024",
    title: "Habiter autrement",
    presenter: "Philippe Martin",
    theme: "Architecture & Urbanisme",
  },
  {
    id: "archive-6",
    date: "14 Mars",
    year: "2024",
    title: "La lenteur comme philosophie",
    presenter: "Hélène Dubois",
    theme: "Philosophie & Vie",
  },
];

const groupedByYear = archivedEvents.reduce((acc, event) => {
  if (!acc[event.year]) {
    acc[event.year] = [];
  }
  acc[event.year].push(event);
  return acc;
}, {} as Record<string, ArchivedEvent[]>);

const Archives = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 md:pt-32">
        <section className="editorial-container section-padding">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-16"
          >
            <p className="font-sans text-sm tracking-widest uppercase text-muted-foreground mb-4">
              Archives
            </p>
            <h1 className="text-headline text-foreground">
              Rencontres passées
            </h1>
            <p className="text-lg text-muted-foreground mt-6 max-w-2xl">
              Retrouvez ici l'ensemble des rencontres organisées par le Cercle Partages. 
              Chaque présentation est une invitation à la découverte et à la réflexion.
            </p>
          </motion.div>

          {Object.entries(groupedByYear)
            .sort(([a], [b]) => Number(b) - Number(a))
            .map(([year, events], yearIndex) => (
              <motion.div
                key={year}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: yearIndex * 0.1 }}
                className="mb-16"
              >
                <h2 className="font-serif text-4xl text-foreground/20 mb-8">
                  {year}
                </h2>
                <div className="space-y-1">
                  {events.map((event, index) => (
                    <motion.article
                      key={event.id}
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: index * 0.05 }}
                    >
                      <Link
                        to={`/rencontre/${event.id}`}
                        className="group block py-6 border-t border-border hover:bg-muted/30 transition-colors"
                      >
                        <div className="grid grid-cols-12 gap-4 items-start">
                          <div className="col-span-3 md:col-span-2">
                            <p className="font-sans text-sm text-muted-foreground">
                              {event.date}
                            </p>
                          </div>
                          <div className="col-span-9 md:col-span-7">
                            <p className="font-sans text-xs tracking-wide uppercase text-ochre mb-1">
                              {event.theme}
                            </p>
                            <h3 className="font-serif text-lg text-foreground group-hover:text-primary transition-colors">
                              {event.title}
                            </h3>
                            <p className="font-sans text-sm text-muted-foreground mt-1">
                              {event.presenter}
                            </p>
                          </div>
                        </div>
                      </Link>
                    </motion.article>
                  ))}
                </div>
              </motion.div>
            ))}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Archives;
