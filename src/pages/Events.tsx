import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpDown, Calendar, List, MapPin, Table2 } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useLanguage } from "@/i18n/LanguageContext";
import { getPublishedEvents, EventWithPresenter } from "@/services/events";
import { Skeleton } from "@/components/ui/skeleton";
import { getProfileDisplayName } from "@/lib/profileName";
import { formatDay, formatMonth, formatYear, formatShortDate } from "@/lib/dateUtils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type SortField = "date" | "category" | "location" | "title" | "presenter";
type SortOrder = "asc" | "desc";
type ViewMode = "list" | "table";

const Events = () => {
  const { t, language } = useLanguage();
  const [events, setEvents] = useState<EventWithPresenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [viewMode, setViewMode] = useState<ViewMode>("list");

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

  const isUpcoming = (dateString: string) => {
    return new Date(dateString) >= new Date();
  };

  // Split and sort events
  const { upcomingEvents, pastEvents } = useMemo(() => {
    const now = new Date();
    
    const upcoming = events
      .filter((event) => new Date(event.event_date) >= now)
      .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
    
    const past = events
      .filter((event) => new Date(event.event_date) < now)
      .sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime());
    
    return { upcomingEvents: upcoming, pastEvents: past };
  }, [events]);

  // For table view sorting
  const sortedTableEvents = useMemo(() => {
    const allEvents = [...upcomingEvents, ...pastEvents];
    
    return allEvents.sort((a, b) => {
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
        case "title":
          comparison = a.title.localeCompare(b.title);
          break;
        case "presenter":
          comparison = getProfileDisplayName(a.presenter, "").localeCompare(getProfileDisplayName(b.presenter, ""));
          break;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [upcomingEvents, pastEvents, sortField, sortOrder]);

  const handleTableSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead 
      className="cursor-pointer hover:bg-muted/50 transition-colors select-none"
      onClick={() => handleTableSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown className={`w-3 h-3 ${sortField === field ? "text-primary" : "text-muted-foreground/50"}`} />
      </div>
    </TableHead>
  );

  const EventCard = ({ event, index }: { event: EventWithPresenter; index: number }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Link
        to={`/rencontre/${event.id}`}
        className="block group"
      >
        <div className="p-4 sm:p-6 border border-border/50 rounded-lg hover:border-primary/30 hover:bg-muted/30 transition-all duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
            {/* Date */}
            <div className="flex-shrink-0 flex sm:flex-col items-center sm:items-start gap-2 sm:gap-0 sm:w-20">
              <div className="text-xl sm:text-2xl font-serif text-foreground">
                {formatDay(event.event_date, language)}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground uppercase tracking-wide">
                {formatMonth(event.event_date, language)} {formatYear(event.event_date, language)}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {event.category && (
                <span className="text-xs text-muted-foreground mb-1 block">
                  {getCategoryLabel(event.category)}
                </span>
              )}
              <h3 className="font-serif text-lg sm:text-xl text-foreground group-hover:text-primary transition-colors">
                {event.title}
              </h3>
              {event.presenter && (
                <p className="text-sm text-muted-foreground mt-1">
                  {getProfileDisplayName(event.presenter)}
                </p>
              )}
            </div>

            {/* Location */}
            {event.location && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground sm:w-40">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{event.location}</span>
              </div>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );

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

          {/* View Mode Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="flex justify-end mb-8"
          >
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <TabsList>
                <TabsTrigger value="list" className="flex items-center gap-2">
                  <List className="w-4 h-4" />
                  <span className="hidden sm:inline">{t.events.viewList}</span>
                </TabsTrigger>
                <TabsTrigger value="table" className="flex items-center gap-2">
                  <Table2 className="w-4 h-4" />
                  <span className="hidden sm:inline">{t.events.viewTable}</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </motion.div>

          {/* Events Content */}
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : viewMode === "list" ? (
            /* List View with Sections */
            <div className="space-y-12">
              {/* Upcoming Events Section */}
              <section>
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    <h2 className="font-serif text-2xl text-foreground">{t.calendar.upcomingSection}</h2>
                  </div>
                  <span className="text-sm text-muted-foreground bg-primary/10 text-primary px-3 py-1 rounded-full">
                    {upcomingEvents.length}
                  </span>
                </div>
                
                {upcomingEvents.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center border border-dashed border-border rounded-lg">
                    {t.calendar.noUpcoming}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {upcomingEvents.map((event, index) => (
                      <EventCard key={event.id} event={event} index={index} />
                    ))}
                  </div>
                )}
              </section>

              {/* Past Events Section */}
              {pastEvents.length > 0 && (
                <section>
                  <div className="flex items-center gap-4 mb-6 pt-8 border-t border-border">
                    <h2 className="font-serif text-2xl text-muted-foreground">{t.calendar.pastSection}</h2>
                    <span className="text-sm bg-muted text-muted-foreground px-3 py-1 rounded-full">
                      {pastEvents.length}
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    {pastEvents.map((event, index) => (
                      <EventCard key={event.id} event={event} index={index} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          ) : (
            /* Table View */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="border border-border rounded-lg overflow-x-auto"
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHeader field="date">{t.events.dateAndTime}</SortableHeader>
                    <TableHead>{t.admin.status}</TableHead>
                    <SortableHeader field="category">{t.categories.title}</SortableHeader>
                    <SortableHeader field="title">{t.events.titleLabel}</SortableHeader>
                    <SortableHeader field="presenter">{t.nav.presenters}</SortableHeader>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedTableEvents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        {t.calendar.noEvents}
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedTableEvents.map((event) => (
                      <TableRow 
                        key={event.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => window.location.href = `/rencontre/${event.id}`}
                      >
                        <TableCell className="font-medium whitespace-nowrap">
                          {formatShortDate(event.event_date, language)}
                        </TableCell>
                        <TableCell>
                          {isUpcoming(event.event_date) ? (
                            <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full whitespace-nowrap">
                              {t.events.statusUpcoming}
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded-full whitespace-nowrap">
                              {t.events.statusPast}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {getCategoryLabel(event.category)}
                        </TableCell>
                        <TableCell className="font-serif">
                          {event.title}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {getProfileDisplayName(event.presenter)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </motion.div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Events;
