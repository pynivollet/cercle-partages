import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getEventById,
  registerForEvent,
  cancelRegistration,
  EventDetails,
  EventPresenterInfo,
} from "@/services/events";
import { getEventDocuments, EventDocument } from "@/services/eventDocuments";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { toast } from "sonner";
import { FileText, Users } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

const EventDetail = () => {
  const { t, language } = useLanguage();
  const { id } = useParams();
  const { user } = useAuth();
  const [event, setEvent] = useState<EventDetails | null>(null);
  const [documents, setDocuments] = useState<EventDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [attendeeCount, setAttendeeCount] = useState<string>("1");

  const dateLocale = language === "fr" ? fr : enUS;

  useEffect(() => {
    const fetchEvent = async () => {
      if (!id) return;

      // Fetch event details via RPC (includes presenters, registration count, user registration)
      const { data, error } = await getEventById(id);

      if (data && !error) {
        setEvent(data);

        // Fetch documents for authenticated users
        if (user) {
          const { data: docs } = await getEventDocuments(id);
          if (docs) setDocuments(docs);
        }
      }
      setLoading(false);
    };
    fetchEvent();
  }, [id, user]);

  const handleRegister = async () => {
    if (!user) {
      toast.error(t.auth.login);
      return;
    }
    if (!event) return;

    setRegistering(true);
    const { error, capacityError } = await registerForEvent(event.id, parseInt(attendeeCount));

    if (error) {
      if (capacityError) {
        toast.error(error.message);
      } else {
        toast.error(t.events.registrationError);
      }
    } else {
      toast.success(t.events.registrationSuccess);
      // Refresh event data via RPC
      const { data } = await getEventById(event.id);
      if (data) setEvent(data);
    }
    setRegistering(false);
  };

  const handleCancelRegistration = async () => {
    if (!user || !event) return;

    setRegistering(true);
    const { error } = await cancelRegistration(event.id);

    if (error) {
      toast.error(t.auth.error);
    } else {
      toast.success(t.events.unregistrationSuccess);
      // Refresh event data via RPC
      const { data } = await getEventById(event.id);
      if (data) setEvent(data);
    }
    setRegistering(false);
  };

  const formatEventDate = (dateString: string) => {
    return format(new Date(dateString), "dd MMMM yyyy", { locale: dateLocale });
  };

  const formatEventTime = (dateString: string) => {
    return format(new Date(dateString), "HH'h'mm", { locale: dateLocale });
  };

  const getPresenterName = (presenter: EventPresenterInfo) => {
    const firstName = presenter.first_name || "";
    const lastName = presenter.last_name || "";
    return `${firstName} ${lastName}`.trim() || t.presenter.title;
  };

  const getInitials = (presenter: EventPresenterInfo) => {
    const firstName = presenter.first_name || "";
    const lastName = presenter.last_name || "";
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "?";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 md:pt-32">
          <div className="editorial-container section-padding">
            <Skeleton className="h-6 w-32 mb-8" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
              <div className="lg:col-span-2">
                <Skeleton className="h-4 w-40 mb-4" />
                <Skeleton className="h-16 w-full mb-8" />
                <Skeleton className="h-32 w-full" />
              </div>
              <div className="lg:col-span-1 space-y-8">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 md:pt-32">
          <div className="editorial-container section-padding text-center">
            <h1 className="text-2xl text-foreground mb-4">{t.common.error}</h1>
            <Link to="/" className="text-primary hover:underline">
              {t.nav.home}
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const isRegistered = !!event.user_registration;
  const isPastEvent = new Date(event.event_date) < new Date();

  // Use presenters from RPC response
  const presenters = event.presenters || [];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 md:pt-32">
        {/* Breadcrumb */}
        <div className="editorial-container mb-8">
          <Link
            to="/evenements"
            className="font-sans text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← {t.events.backToEvents}
          </Link>
        </div>

        {/* Event Header */}
        {event.image_url && (
          <div className="editorial-container mb-12">
            <div className="aspect-[21/9] overflow-hidden bg-muted">
              <img
                src={event.image_url}
                alt={event.title}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        <section className="editorial-container section-padding pt-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
            {/* Main Content */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="lg:col-span-2"
            >
              {event.topic && (
                <p className="font-sans text-xs tracking-widest uppercase text-ochre mb-4">
                  {event.topic}
                </p>
              )}
              <h1 className="text-headline text-foreground mb-8">{event.title}</h1>

              {event.description && (
                <div className="prose prose-lg max-w-none">
                  <p className="text-lg text-muted-foreground leading-relaxed whitespace-pre-line">
                    {event.description}
                  </p>
                </div>
              )}


              {/* Documents section - only for authenticated users */}
              {user && documents.length > 0 && (
                <div className="mt-12 pt-8 border-t border-border">
                  <h3 className="font-serif text-xl mb-4">{t.events.documentation}</h3>
                  <div className="space-y-3">
                    {documents.map((doc) => (
                      <a
                        key={doc.id}
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-4 bg-muted/50 border border-border hover:bg-muted transition-colors"
                      >
                        <FileText className="w-6 h-6 text-destructive shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium truncate">{doc.file_name}</p>
                          <p className="text-xs text-muted-foreground">{t.events.clickToOpen}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
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
                  <p className="font-sans text-sm text-muted-foreground mb-2">{t.events.dateAndTime}</p>
                  <p className="font-serif text-2xl text-foreground capitalize">
                    {formatEventDate(event.event_date)}
                  </p>
                  <p className="font-sans text-foreground mt-1">{formatEventTime(event.event_date)}</p>
                </div>

                {/* Location */}
                <div className="p-6 bg-muted/50 border border-border">
                  <p className="font-sans text-sm text-muted-foreground mb-2">{t.events.location}</p>
                  <p className="font-serif text-lg text-foreground">{event.location || "À confirmer"}</p>
                  <p className="font-sans text-sm text-muted-foreground mt-1">{t.events.addressPrivate}</p>
                </div>

                {/* CTA */}
                {!isPastEvent && (
                  <>
                    {isRegistered ? (
                      <div className="space-y-4">
                        <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                          <p className="text-sm text-foreground font-medium flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            {language === "fr" 
                              ? `Inscrit pour ${event.user_registration?.attendee_count || 1} personne${(event.user_registration?.attendee_count || 1) > 1 ? "s" : ""}`
                              : `Registered for ${event.user_registration?.attendee_count || 1} person${(event.user_registration?.attendee_count || 1) > 1 ? "s" : ""}`
                            }
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="lg"
                          className="w-full"
                          onClick={handleCancelRegistration}
                          disabled={registering}
                        >
                          {registering ? t.common.loading : t.events.unregister}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Attendee count selector */}
                        <div className="flex items-center gap-3">
                          <Users className="w-5 h-5 text-muted-foreground" />
                          <Select value={attendeeCount} onValueChange={setAttendeeCount}>
                            <SelectTrigger className="flex-1 bg-background">
                              <SelectValue placeholder="Nombre de personnes" />
                            </SelectTrigger>
                            <SelectContent className="bg-background border border-border z-50">
                              {[1, 2, 3, 4, 5, 6].map((num) => (
                                <SelectItem key={num} value={num.toString()}>
                                  {num} {language === "fr" ? `personne${num > 1 ? "s" : ""}` : `person${num > 1 ? "s" : ""}`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          variant="nightBlue"
                          size="lg"
                          className="w-full"
                          onClick={handleRegister}
                          disabled={registering}
                        >
                          {registering ? t.common.loading : t.events.register}
                        </Button>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground text-center">
                      {event.participant_limit
                        ? `${event.registrations_count || 0}/${event.participant_limit} ${t.events.registered}`
                        : `${t.events.limitedPlaces} • ${t.events.byInvitation}`}
                    </p>
                  </>
                )}
              </div>
            </motion.aside>
          </div>
        </section>

        {/* Presenters Section */}
        {presenters.length > 0 && (
          <section className="bg-muted/30 section-padding">
            <div className="editorial-container">
              <p className="font-sans text-sm tracking-widest uppercase text-muted-foreground mb-8">{t.events.presentedBy}</p>
              <div className="space-y-16">
                {presenters.map((presenter, index) => (
                  <motion.div
                    key={presenter.id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: index * 0.1 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-12 items-center"
                  >
                    {/* Image */}
                    <div className="md:col-span-1">
                      <div className="aspect-[3/4] overflow-hidden bg-muted">
                        {presenter.avatar_url ? (
                          <img
                            src={presenter.avatar_url}
                            alt={getPresenterName(presenter)}
                            className="w-full h-full object-cover grayscale"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <span className="text-6xl font-serif">{getInitials(presenter)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bio */}
                    <div className="md:col-span-2">
                      <h2 className="font-serif text-3xl text-foreground mb-2">{getPresenterName(presenter)}</h2>
                      {presenter.bio && (
                        <p className="text-lg text-muted-foreground leading-relaxed">{presenter.bio}</p>
                      )}
                      <div className="mt-8">
                        <Link
                          to={`/presentateur/${presenter.id}`}
                          className="font-sans text-sm text-foreground border-b border-foreground/30 pb-1 hover:border-foreground transition-colors"
                        >
                          {t.events.discoverProfile}
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default EventDetail;
