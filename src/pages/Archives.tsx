import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { getPastEvents, EventWithPresenter } from "@/services/events";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

interface GroupedEvents {
  [year: string]: EventWithPresenter[];
}

const Archives = () => {
  const [groupedByYear, setGroupedByYear] = useState<GroupedEvents>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      const { data, error } = await getPastEvents();
      if (data && !error) {
        const grouped = data.reduce((acc, event) => {
          const year = format(new Date(event.event_date), "yyyy");
          if (!acc[year]) {
            acc[year] = [];
          }
          acc[year].push(event);
          return acc;
        }, {} as GroupedEvents);
        setGroupedByYear(grouped);
      }
      setLoading(false);
    };
    fetchEvents();
  }, []);

  const formatEventDate = (dateString: string) => {
    return format(new Date(dateString), "dd MMMM", { locale: fr });
  };

  const getPresenterName = (presenter: EventWithPresenter["presenter"]) => {
    if (!presenter) return "Intervenant";
    const first = (presenter.first_name ?? "").trim();
    const last = (presenter.last_name ?? "").trim();
    return `${first} ${last}`.trim() || "Intervenant";
  };

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

          {loading ? (
            <div className="space-y-16">
              {Array.from({ length: 2 }).map((_, yearIndex) => (
                <div key={yearIndex} className="mb-16">
                  <Skeleton className="h-10 w-24 mb-8" />
                  <div className="space-y-1">
                    {Array.from({ length: 3 }).map((_, eventIndex) => (
                      <div key={eventIndex} className="py-6 border-t border-border">
                        <div className="grid grid-cols-12 gap-4 items-start">
                          <div className="col-span-3 md:col-span-2">
                            <Skeleton className="h-4 w-20" />
                          </div>
                          <div className="col-span-9 md:col-span-7">
                            <Skeleton className="h-3 w-32 mb-2" />
                            <Skeleton className="h-6 w-full mb-2" />
                            <Skeleton className="h-4 w-40" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : Object.keys(groupedByYear).length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">Aucune rencontre passée pour le moment.</p>
            </div>
          ) : (
            Object.entries(groupedByYear)
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
                              <p className="font-sans text-sm text-muted-foreground capitalize">
                                {formatEventDate(event.event_date)}
                              </p>
                            </div>
                            <div className="col-span-9 md:col-span-7">
                              {event.topic && (
                                <p className="font-sans text-xs tracking-wide uppercase text-ochre mb-1">
                                  {event.topic}
                                </p>
                              )}
                              <h3 className="font-serif text-lg text-foreground group-hover:text-primary transition-colors">
                                {event.title}
                              </h3>
                              <p className="font-sans text-sm text-muted-foreground mt-1">
                                {getPresenterName(event.presenter)}
                              </p>
                            </div>
                          </div>
                        </Link>
                      </motion.article>
                    ))}
                  </div>
                </motion.div>
              ))
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Archives;
