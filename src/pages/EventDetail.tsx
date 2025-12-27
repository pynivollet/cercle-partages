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
import { getEventById, EventWithPresenter, registerForEvent, cancelRegistration } from "@/services/events";
import { getEventDocuments, EventDocument } from "@/services/eventDocuments";
import { getEventPresenters, EventPresenter } from "@/services/eventPresenters";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { FileText, Users } from "lucide-react";
import { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

const EventDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [event, setEvent] = useState<EventWithPresenter | null>(null);
  const [documents, setDocuments] = useState<EventDocument[]>([]);
  const [presenters, setPresenters] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [attendeeCount, setAttendeeCount] = useState<string>("1");

  useEffect(() => {
    const fetchEvent = async () => {
      if (!id) return;
      const { data, error } = await getEventById(id, user?.id);
      if (data && !error) {
        setEvent(data);
        
        // Fetch presenters for this event
        const { data: eventPresenters } = await getEventPresenters(id);
        if (eventPresenters) {
          const presenterProfiles = eventPresenters
            .filter(ep => ep.presenter)
            .map(ep => ep.presenter as Profile);
          setPresenters(presenterProfiles);
        }
        
        // Fetch documents for authenticated users
        if (user) {
          const { data: docs } = await getEventDocuments(id);
          if (docs) setDocuments(docs);
        }
      }
      setLoading(false);
    };
    fetchEvent();
  }, [id, user?.id]);

  const handleRegister = async () => {
    if (!user) {
      toast.error("Veuillez vous connecter pour vous inscrire");
      return;
    }
    if (!event) return;

    setRegistering(true);
    const { error } = await registerForEvent(event.id, user.id, parseInt(attendeeCount));
    if (error) {
      toast.error("Erreur lors de l'inscription");
    } else {
      toast.success("Inscription confirmée !");
      // Refresh event data
      const { data } = await getEventById(event.id, user.id);
      if (data) setEvent(data);
    }
    setRegistering(false);
  };

  const handleCancelRegistration = async () => {
    if (!user || !event) return;

    setRegistering(true);
    const { error } = await cancelRegistration(event.id, user.id);
    if (error) {
      toast.error("Erreur lors de l'annulation");
    } else {
      toast.success("Inscription annulée");
      const { data } = await getEventById(event.id, user.id);
      if (data) setEvent(data);
    }
    setRegistering(false);
  };

  const formatEventDate = (dateString: string) => {
    return format(new Date(dateString), "dd MMMM yyyy", { locale: fr });
  };

  const formatEventTime = (dateString: string) => {
    return format(new Date(dateString), "HH'h'mm", { locale: fr });
  };

  const getPresenterName = (presenter: Profile | EventWithPresenter["presenter"]) => {
    if (!presenter) return "Intervenant à confirmer";
    const firstName = presenter.first_name || "";
    const lastName = presenter.last_name || "";
    return `${firstName} ${lastName}`.trim() || "Intervenant";
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
            <h1 className="text-2xl text-foreground mb-4">Rencontre non trouvée</h1>
            <Link to="/" className="text-primary hover:underline">
              Retour à l'accueil
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const isRegistered = !!event.user_registration;
  const isPastEvent = new Date(event.event_date) < new Date();

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
              {event.topic && (
                <p className="font-sans text-xs tracking-widest uppercase text-ochre mb-4">
                  {event.topic}
                </p>
              )}
              <h1 className="text-headline text-foreground mb-8">
                {event.title}
              </h1>

              {event.description && (
                <div className="prose prose-lg max-w-none">
                  <p className="text-lg text-muted-foreground leading-relaxed whitespace-pre-line">
                    {event.description}
                  </p>
                </div>
              )}

              <div className="mt-12 pt-8 border-t border-border">
                <h3 className="font-serif text-xl mb-4">Format</h3>
                <p className="text-muted-foreground">
                  Présentation suivie d'un échange et d'un repas partagé
                </p>
              </div>

              {/* Documents section - only for authenticated users */}
              {user && documents.length > 0 && (
                <div className="mt-12 pt-8 border-t border-border">
                  <h3 className="font-serif text-xl mb-4">Documentation</h3>
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
                          <p className="text-xs text-muted-foreground">
                            PDF • Cliquez pour ouvrir
                          </p>
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
                  <p className="font-sans text-sm text-muted-foreground mb-2">
                    Date et heure
                  </p>
                  <p className="font-serif text-2xl text-foreground capitalize">
                    {formatEventDate(event.event_date)}
                  </p>
                  <p className="font-sans text-foreground mt-1">
                    {formatEventTime(event.event_date)}
                  </p>
                </div>

                {/* Location */}
                <div className="p-6 bg-muted/50 border border-border">
                  <p className="font-sans text-sm text-muted-foreground mb-2">
                    Lieu
                  </p>
                  <p className="font-serif text-lg text-foreground">
                    {event.location || "À confirmer"}
                  </p>
                  <p className="font-sans text-sm text-muted-foreground mt-1">
                    Adresse communiquée aux inscrits
                  </p>
                </div>

                {/* CTA */}
                {!isPastEvent && (
                  <>
                    {isRegistered ? (
                      <div className="space-y-4">
                        <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                          <p className="text-sm text-foreground font-medium flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Inscrit pour {event.user_registration?.attendee_count || 1} personne{(event.user_registration?.attendee_count || 1) > 1 ? "s" : ""}
                          </p>
                        </div>
                        <Button 
                          variant="outline" 
                          size="lg" 
                          className="w-full"
                          onClick={handleCancelRegistration}
                          disabled={registering}
                        >
                          {registering ? "Annulation..." : "Annuler mon inscription"}
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
                                  {num} personne{num > 1 ? "s" : ""}
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
                          {registering ? "Inscription..." : "S'inscrire à la rencontre"}
                        </Button>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground text-center">
                      {event.participant_limit 
                        ? `${event.registrations_count || 0}/${event.participant_limit} inscrits`
                        : "Places limitées • Sur invitation"}
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
              <p className="font-sans text-sm tracking-widest uppercase text-muted-foreground mb-8">
                {presenters.length > 1 ? "Présenté par" : "Présenté par"}
              </p>
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
                            <span className="text-6xl font-serif">
                              {(presenter.first_name?.[0] || "") + (presenter.last_name?.[0] || "")}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bio */}
                    <div className="md:col-span-2">
                      <h2 className="font-serif text-3xl text-foreground mb-2">
                        {getPresenterName(presenter)}
                      </h2>
                      {presenter.professional_background && (
                        <p className="font-sans text-ochre mb-6">
                          {presenter.professional_background}
                        </p>
                      )}
                      {presenter.bio && (
                        <p className="text-lg text-muted-foreground leading-relaxed">
                          {presenter.bio}
                        </p>
                      )}
                      <div className="mt-8">
                        <Link
                          to={`/presentateur/${presenter.id}`}
                          className="font-sans text-sm text-foreground border-b border-foreground/30 pb-1 hover:border-foreground transition-colors"
                        >
                          Découvrir son profil complet
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
