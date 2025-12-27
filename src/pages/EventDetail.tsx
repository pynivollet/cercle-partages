import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getEventById, EventWithPresenter, registerForEvent, cancelRegistration } from "@/services/events";
import { getEventDocuments, EventDocument } from "@/services/eventDocuments";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { FileText } from "lucide-react";

const EventDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [event, setEvent] = useState<EventWithPresenter | null>(null);
  const [documents, setDocuments] = useState<EventDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      if (!id) return;
      const { data, error } = await getEventById(id, user?.id);
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
  }, [id, user?.id]);

  const handleRegister = async () => {
    if (!user) {
      toast.error("Veuillez vous connecter pour vous inscrire");
      return;
    }
    if (!event) return;

    setRegistering(true);
    const { error } = await registerForEvent(event.id, user.id);
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

  const getPresenterName = (presenter: EventWithPresenter["presenter"]) => {
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
                      <Button 
                        variant="outline" 
                        size="lg" 
                        className="w-full"
                        onClick={handleCancelRegistration}
                        disabled={registering}
                      >
                        {registering ? "Annulation..." : "Annuler mon inscription"}
                      </Button>
                    ) : (
                      <Button 
                        variant="nightBlue" 
                        size="lg" 
                        className="w-full"
                        onClick={handleRegister}
                        disabled={registering}
                      >
                        {registering ? "Inscription..." : "S'inscrire à la rencontre"}
                      </Button>
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

        {/* Presenter Section */}
        {event.presenter && (
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
                  <div className="aspect-[3/4] overflow-hidden bg-muted">
                    {event.presenter.avatar_url ? (
                      <img
                        src={event.presenter.avatar_url}
                        alt={getPresenterName(event.presenter)}
                        className="w-full h-full object-cover grayscale"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <span className="text-6xl font-serif">
                          {(event.presenter.first_name?.[0] || "") + (event.presenter.last_name?.[0] || "")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bio */}
                <div className="md:col-span-2">
                  <p className="font-sans text-sm tracking-widest uppercase text-muted-foreground mb-4">
                    Présenté par
                  </p>
                  <h2 className="font-serif text-3xl text-foreground mb-2">
                    {getPresenterName(event.presenter)}
                  </h2>
                  {event.presenter.professional_background && (
                    <p className="font-sans text-ochre mb-6">
                      {event.presenter.professional_background}
                    </p>
                  )}
                  {event.presenter.bio && (
                    <p className="text-lg text-muted-foreground leading-relaxed">
                      {event.presenter.bio}
                    </p>
                  )}
                  <div className="mt-8">
                    <Link
                      to={`/presentateur/${event.presenter.id}`}
                      className="font-sans text-sm text-foreground border-b border-foreground/30 pb-1 hover:border-foreground transition-colors"
                    >
                      Découvrir son profil complet
                    </Link>
                  </div>
                </div>
              </motion.div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default EventDetail;
