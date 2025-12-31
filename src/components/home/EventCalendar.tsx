import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { getUpcomingEvents, EventWithPresenter } from "@/services/events";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/i18n/LanguageContext";

const EventCalendar = () => {
  const { t } = useLanguage();
  const [events, setEvents] = useState<EventWithPresenter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      const { data, error } = await getUpcomingEvents();
      if (data && !error) {
        setEvents(data);
      }
      setLoading(false);
    };
    fetchEvents();
  }, []);

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      day: format(date, "dd", { locale: fr }),
      month: format(date, "MMMM", { locale: fr }),
      year: format(date, "yyyy", { locale: fr }),
    };
  };

  const getPresenterName = (presenter: EventWithPresenter["presenter"]) => {
    if (!presenter) return "Intervenant à confirmer";
    const first = (presenter.first_name ?? "").trim();
    const last = (presenter.last_name ?? "").trim();
    return `${first} ${last}`.trim() || "Intervenant";
  };

  const getCategoryLabel = (category: string | null) => {
    if (!category) return null;
    return t.categories[category as keyof typeof t.categories] || category;
  };

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
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="py-8 md:py-10 border-t border-border">
                <div className="grid grid-cols-12 gap-4 md:gap-8 items-start">
                  <div className="col-span-3 md:col-span-2">
                    <Skeleton className="h-12 w-16" />
                    <Skeleton className="h-4 w-20 mt-2" />
                  </div>
                  <div className="col-span-9 md:col-span-7">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-8 w-full mb-2" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                  <div className="col-span-12 md:col-span-3">
                    <Skeleton className="h-4 w-24 ml-auto" />
                  </div>
                </div>
              </div>
            ))
          ) : events.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">Aucune rencontre à venir pour le moment.</p>
            </div>
          ) : (
            events.map((event, index) => {
              const dateInfo = formatEventDate(event.event_date);
              return (
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
                          {dateInfo.day}
                        </span>
                        <p className="font-sans text-sm text-muted-foreground mt-1 capitalize">
                          {dateInfo.month}
                        </p>
                      </div>

                      {/* Content */}
                      <div className="col-span-9 md:col-span-7">
                        {getCategoryLabel(event.category) && (
                          <p className="font-sans text-xs tracking-wide uppercase text-ochre mb-2">
                            {getCategoryLabel(event.category)}
                          </p>
                        )}
                        <h3 className="font-serif text-xl md:text-2xl text-foreground group-hover:text-primary transition-colors mb-2">
                          {event.title}
                        </h3>
                        <p className="font-sans text-sm text-muted-foreground">
                          Une présentation par {getPresenterName(event.presenter)}
                        </p>
                      </div>

                      {/* Location */}
                      <div className="col-span-12 md:col-span-3 md:text-right">
                        {event.location && (
                          <p className="font-sans text-sm text-muted-foreground">
                            {event.location}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.article>
              );
            })
          )}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 pt-8 border-t border-border"
        >
          <Link
            to="/evenements"
            className="font-sans text-sm tracking-wide text-muted-foreground hover:text-foreground transition-colors"
          >
            Voir tous les événements →
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default EventCalendar;
