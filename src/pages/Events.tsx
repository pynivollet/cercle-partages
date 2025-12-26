import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowUpDown, Calendar, Filter, MapPin, Tag } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useLanguage } from "@/i18n/LanguageContext";
import { getPublishedEvents, EventWithPresenter } from "@/services/events";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SortField = "date" | "category" | "location";
type SortOrder = "asc" | "desc";
type StatusFilter = "all" | "upcoming" | "past";

const Events = () => {
  const { t } = useLanguage();
  const [events, setEvents] = useState<EventWithPresenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    const fetchEvents = async () => {
      const { data } = await getPublishedEvents();
      if (data) {
        setEvents(data);
      }
      setLoading(false);
    };
    fetchEvents();
  }, []);

  const getCategoryLabel = (category: string | null): string => {
    if (!category) return "";
    const key = category as keyof typeof t.categories;
    return t.categories[key] || category;
  };

  const filteredAndSortedEvents = useMemo(() => {
    const now = new Date();
    
    // Filter by status
    const filtered = events.filter((event) => {
      const eventDate = new Date(event.event_date);
      switch (statusFilter) {
        case "upcoming":
          return eventDate >= now;
        case "past":
          return eventDate < now;
        default:
          return true;
      }
    });

    // Sort
    return filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "date":
          comparison = new Date(a.event_date).getTime() - new Date(b.event_date).getTime();
          break;
        case "category":
          comparison = (a.category || "").localeCompare(b.category || "");
          break;
        case "location":
          comparison = (a.location || "").localeCompare(b.location || "");
          break;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [events, sortField, sortOrder, statusFilter]);

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
  };

  const isUpcoming = (dateString: string) => {
    return new Date(dateString) >= new Date();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 pb-16">
        <div className="editorial-container">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">
              {t.nav.events}
            </h1>
            <p className="text-muted-foreground max-w-2xl">
              {t.archives.description}
            </p>
          </motion.div>

          {/* Filters and Sort Controls */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="flex flex-wrap gap-4 mb-8 items-center"
          >
            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="upcoming">À venir</SelectItem>
                  <SelectItem value="past">Passés</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="h-6 w-px bg-border hidden sm:block" />

            {/* Sort */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Trier par :</span>
              <Select value={sortField} onValueChange={(value) => setSortField(value as SortField)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Date
                    </div>
                  </SelectItem>
                  <SelectItem value="category">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      Catégorie
                    </div>
                  </SelectItem>
                  <SelectItem value="location">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Lieu
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSortOrder}
              className="flex items-center gap-2"
            >
              <ArrowUpDown className="w-4 h-4" />
              {sortOrder === "asc" ? "Croissant" : "Décroissant"}
            </Button>
          </motion.div>

          {/* Events List */}
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : filteredAndSortedEvents.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">
              {statusFilter === "upcoming" ? "Aucun événement à venir" : statusFilter === "past" ? "Aucun événement passé" : t.calendar.noEvents}
            </p>
          ) : (
            <div className="space-y-4">
              {filteredAndSortedEvents.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Link
                    to={`/rencontre/${event.id}`}
                    className="block group"
                  >
                    <div className="p-6 border border-border/50 rounded-lg hover:border-primary/30 hover:bg-muted/30 transition-all duration-300">
                      <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
                        {/* Date */}
                        <div className="flex-shrink-0 text-center md:text-left md:w-24">
                          <div className="text-2xl font-serif text-foreground">
                            {format(new Date(event.event_date), "dd", { locale: fr })}
                          </div>
                          <div className="text-sm text-muted-foreground uppercase tracking-wide">
                            {format(new Date(event.event_date), "MMM yyyy", { locale: fr })}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {isUpcoming(event.event_date) ? (
                              <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                                À venir
                              </span>
                            ) : (
                              <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded-full">
                                Passé
                              </span>
                            )}
                            {event.category && (
                              <span className="text-xs text-muted-foreground">
                                {getCategoryLabel(event.category)}
                              </span>
                            )}
                          </div>
                          <h3 className="font-serif text-xl text-foreground group-hover:text-primary transition-colors truncate">
                            {event.title}
                          </h3>
                          {event.presenter && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {event.presenter.first_name} {event.presenter.last_name}
                            </p>
                          )}
                        </div>

                        {/* Location */}
                        {event.location && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground md:w-48">
                            <MapPin className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">{event.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Events;
