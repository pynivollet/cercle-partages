import { motion } from "framer-motion";
import { Link } from "react-router-dom";

interface Event {
  id: string;
  date: string;
  month: string;
  year: string;
  title: string;
  presenter: string;
  theme: string;
  location: string;
}

const upcomingEvents: Event[] = [
  {
    id: "1",
    date: "16",
    month: "Janvier",
    year: "2025",
    title: "L'architecture face au climat",
    presenter: "Marie-Claire Dupont",
    theme: "Architecture & Écologie",
    location: "Paris, 7e",
  },
  {
    id: "2",
    date: "06",
    month: "Février",
    year: "2025",
    title: "La transmission du savoir artisanal",
    presenter: "Jean-Pierre Moreau",
    theme: "Culture & Métiers",
    location: "Paris, 3e",
  },
  {
    id: "3",
    date: "27",
    month: "Février",
    year: "2025",
    title: "Art contemporain et mémoire collective",
    presenter: "Sophie Laurent",
    theme: "Art & Société",
    location: "Paris, 11e",
  },
];

const EventCalendar = () => {
  return (
    <section id="calendar" className="section-padding bg-muted/30">
      <div className="editorial-container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-16"
        >
          <p className="font-sans text-sm tracking-widest uppercase text-muted-foreground mb-4">
            Calendrier
          </p>
          <h2 className="text-headline text-foreground">
            Prochaines rencontres
          </h2>
        </motion.div>

        <div className="space-y-1">
          {upcomingEvents.map((event, index) => (
            <motion.article
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <Link
                to={`/rencontre/${event.id}`}
                className="group block py-8 md:py-10 border-t border-border hover:bg-background/50 transition-colors"
              >
                <div className="grid grid-cols-12 gap-4 md:gap-8 items-start">
                  {/* Date */}
                  <div className="col-span-3 md:col-span-2">
                    <span className="font-serif text-4xl md:text-5xl text-foreground leading-none">
                      {event.date}
                    </span>
                    <p className="font-sans text-sm text-muted-foreground mt-1">
                      {event.month}
                    </p>
                  </div>

                  {/* Content */}
                  <div className="col-span-9 md:col-span-7">
                    <p className="font-sans text-xs tracking-wide uppercase text-ochre mb-2">
                      {event.theme}
                    </p>
                    <h3 className="font-serif text-xl md:text-2xl text-foreground group-hover:text-primary transition-colors mb-2">
                      {event.title}
                    </h3>
                    <p className="font-sans text-sm text-muted-foreground">
                      Une présentation par {event.presenter}
                    </p>
                  </div>

                  {/* Location */}
                  <div className="col-span-12 md:col-span-3 md:text-right">
                    <p className="font-sans text-sm text-muted-foreground">
                      {event.location}
                    </p>
                  </div>
                </div>
              </Link>
            </motion.article>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 pt-8 border-t border-border"
        >
          <Link
            to="/archives"
            className="font-sans text-sm tracking-wide text-muted-foreground hover:text-foreground transition-colors"
          >
            Voir les archives →
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default EventCalendar;
