import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { getInvitations, createInvitation, generateInvitationLink } from "@/services/invitations";
import { getAllEvents, createEvent, updateEvent } from "@/services/events";
import { getPresenters } from "@/services/profiles";
import { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { Copy, Plus } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

type Invitation = Database["public"]["Tables"]["invitations"]["Row"];
type Event = Database["public"]["Tables"]["events"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type AppRole = Database["public"]["Enums"]["app_role"];
type EventStatus = Database["public"]["Enums"]["event_status"];
type EventCategory = Database["public"]["Enums"]["event_category"];

const Admin = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"invitations" | "events">("invitations");
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [presenters, setPresenters] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Invitation form state
  const [newInviteEmail, setNewInviteEmail] = useState("");
  const [newInviteRole, setNewInviteRole] = useState<AppRole>("participant");
  const [isCreateInviteOpen, setIsCreateInviteOpen] = useState(false);

  // Event form state
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventTopic, setEventTopic] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("19:30");
  const [eventLocation, setEventLocation] = useState("");
  const [eventLimit, setEventLimit] = useState("");
  const [eventPresenterId, setEventPresenterId] = useState("");
  const [eventStatus, setEventStatus] = useState<EventStatus>("draft");
  const [eventCategory, setEventCategory] = useState<EventCategory | "">("");

  const fetchData = async () => {
    setIsLoading(true);
    const [invitationsRes, eventsRes, presentersRes] = await Promise.all([
      getInvitations(),
      getAllEvents(),
      getPresenters(),
    ]);
    
    if (invitationsRes.data) setInvitations(invitationsRes.data);
    if (eventsRes.data) setEvents(eventsRes.data);
    if (presentersRes.data) setPresenters(presentersRes.data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateInvitation = async () => {
    if (!user) return;
    
    const { data, error } = await createInvitation(
      newInviteEmail || null,
      newInviteRole,
      user.id
    );

    if (error) {
      toast.error(t.auth.error);
    } else if (data) {
      toast.success(t.admin.linkCopied);
      const link = generateInvitationLink(data.token);
      navigator.clipboard.writeText(link);
      setInvitations([data, ...invitations]);
      setIsCreateInviteOpen(false);
      setNewInviteEmail("");
      setNewInviteRole("participant");
    }
  };

  const handleCopyLink = (token: string) => {
    const link = generateInvitationLink(token);
    navigator.clipboard.writeText(link);
    toast.success(t.admin.linkCopied);
  };

  const handleCreateEvent = async () => {
    if (!user) return;
    
    const eventDateTime = new Date(`${eventDate}T${eventTime}`);
    
    const { data, error } = await createEvent({
      title: eventTitle,
      topic: eventTopic || null,
      description: eventDescription || null,
      event_date: eventDateTime.toISOString(),
      location: eventLocation || null,
      participant_limit: eventLimit ? parseInt(eventLimit) : null,
      presenter_id: eventPresenterId || null,
      status: eventStatus,
      created_by: user.id,
      category: eventCategory || null,
    });

    if (error) {
      toast.error(t.auth.error);
    } else if (data) {
      toast.success(t.common.save);
      setEvents([data, ...events]);
      setIsCreateEventOpen(false);
      resetEventForm();
    }
  };

  const resetEventForm = () => {
    setEventTitle("");
    setEventTopic("");
    setEventDescription("");
    setEventDate("");
    setEventTime("19:30");
    setEventLocation("");
    setEventLimit("");
    setEventPresenterId("");
    setEventStatus("draft");
    setEventCategory("");
  };

  const getCategoryLabel = (category: string | null) => {
    if (!category) return "";
    return t.categories[category as keyof typeof t.categories] || category;
  };

  const handleStatusChange = async (eventId: string, newStatus: EventStatus) => {
    const { error } = await updateEvent(eventId, { status: newStatus });
    if (error) {
      toast.error(t.auth.error);
    } else {
      setEvents(events.map((e) => (e.id === eventId ? { ...e, status: newStatus } : e)));
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "draft":
        return t.admin.draft;
      case "published":
        return t.admin.published;
      case "cancelled":
        return t.admin.cancelled;
      case "completed":
        return t.admin.completed;
      default:
        return status;
    }
  };

  const getInvitationStatusLabel = (invitation: Invitation) => {
    if (invitation.status === "used") return t.admin.used;
    if (new Date(invitation.expires_at) < new Date()) return t.admin.expired;
    return t.admin.pending;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
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
            className="mb-12"
          >
            <p className="font-sans text-sm tracking-widest uppercase text-muted-foreground mb-4">
              {t.admin.title}
            </p>
            <h1 className="text-headline text-foreground">Administration</h1>
          </motion.div>

          {/* Tabs */}
          <div className="flex gap-8 mb-12 border-b border-border">
            <button
              onClick={() => setActiveTab("invitations")}
              className={`pb-4 font-sans text-sm transition-colors relative ${
                activeTab === "invitations"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.admin.invitations}
              {activeTab === "invitations" && (
                <motion.div
                  layoutId="adminTab"
                  className="absolute bottom-0 left-0 right-0 h-px bg-foreground"
                />
              )}
            </button>
            <button
              onClick={() => setActiveTab("events")}
              className={`pb-4 font-sans text-sm transition-colors relative ${
                activeTab === "events"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.admin.events}
              {activeTab === "events" && (
                <motion.div
                  layoutId="adminTab"
                  className="absolute bottom-0 left-0 right-0 h-px bg-foreground"
                />
              )}
            </button>
          </div>

          {isLoading ? (
            <p className="text-muted-foreground">{t.common.loading}</p>
          ) : activeTab === "invitations" ? (
            /* Invitations Tab */
            <motion.div
              key="invitations"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="font-serif text-xl">{t.admin.invitations}</h2>
                <Dialog open={isCreateInviteOpen} onOpenChange={setIsCreateInviteOpen}>
                  <DialogTrigger asChild>
                    <Button variant="nightBlue" size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      {t.admin.createInvitation}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t.admin.createInvitation}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label>{t.auth.email} (optionnel)</Label>
                        <Input
                          type="email"
                          value={newInviteEmail}
                          onChange={(e) => setNewInviteEmail(e.target.value)}
                          placeholder="email@exemple.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t.admin.role}</Label>
                        <Select
                          value={newInviteRole}
                          onValueChange={(v) => setNewInviteRole(v as AppRole)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="participant">Participant</SelectItem>
                            <SelectItem value="presenter">Présentateur</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        variant="nightBlue"
                        className="w-full"
                        onClick={handleCreateInvitation}
                      >
                        {t.admin.createInvitation}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {invitations.length === 0 ? (
                <p className="text-muted-foreground">{t.admin.noInvitations}</p>
              ) : (
                <div className="space-y-2">
                  {invitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="flex items-center justify-between py-4 px-4 border border-border bg-muted/30"
                    >
                      <div className="flex-1">
                        <p className="font-sans text-sm">
                          {invitation.email || "Sans email spécifique"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {invitation.role} • {getInvitationStatusLabel(invitation)} • {formatDate(invitation.created_at)}
                        </p>
                      </div>
                      {invitation.status === "pending" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyLink(invitation.token)}
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          {t.admin.copyLink}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            /* Events Tab */
            <motion.div
              key="events"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="font-serif text-xl">{t.admin.events}</h2>
                <Dialog open={isCreateEventOpen} onOpenChange={setIsCreateEventOpen}>
                  <DialogTrigger asChild>
                    <Button variant="nightBlue" size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      {t.admin.createEvent}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{t.admin.createEvent}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label>Titre *</Label>
                        <Input
                          value={eventTitle}
                          onChange={(e) => setEventTitle(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Thème</Label>
                        <Input
                          value={eventTopic}
                          onChange={(e) => setEventTopic(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                          value={eventDescription}
                          onChange={(e) => setEventDescription(e.target.value)}
                          rows={4}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Date *</Label>
                          <Input
                            type="date"
                            value={eventDate}
                            onChange={(e) => setEventDate(e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Heure</Label>
                          <Input
                            type="time"
                            value={eventTime}
                            onChange={(e) => setEventTime(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Lieu</Label>
                        <Input
                          value={eventLocation}
                          onChange={(e) => setEventLocation(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Limite de participants</Label>
                        <Input
                          type="number"
                          value={eventLimit}
                          onChange={(e) => setEventLimit(e.target.value)}
                          min="1"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Présentateur</Label>
                        <Select
                          value={eventPresenterId}
                          onValueChange={setEventPresenterId}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner..." />
                          </SelectTrigger>
                          <SelectContent>
                            {presenters.map((presenter) => (
                              <SelectItem key={presenter.id} value={presenter.id}>
                                {presenter.first_name} {presenter.last_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>{t.categories.title}</Label>
                        <Select
                          value={eventCategory}
                          onValueChange={(v) => setEventCategory(v as EventCategory)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="geopolitique">{t.categories.geopolitique}</SelectItem>
                            <SelectItem value="enjeux_climatiques">{t.categories.enjeux_climatiques}</SelectItem>
                            <SelectItem value="societe_violences">{t.categories.societe_violences}</SelectItem>
                            <SelectItem value="idees_cultures_humanites">{t.categories.idees_cultures_humanites}</SelectItem>
                            <SelectItem value="arts_artistes">{t.categories.arts_artistes}</SelectItem>
                            <SelectItem value="economie_locale">{t.categories.economie_locale}</SelectItem>
                            <SelectItem value="science_moderne">{t.categories.science_moderne}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Statut</Label>
                        <Select
                          value={eventStatus}
                          onValueChange={(v) => setEventStatus(v as EventStatus)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">{t.admin.draft}</SelectItem>
                            <SelectItem value="published">{t.admin.published}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        variant="nightBlue"
                        className="w-full"
                        onClick={handleCreateEvent}
                        disabled={!eventTitle || !eventDate}
                      >
                        {t.admin.createEvent}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {events.length === 0 ? (
                <p className="text-muted-foreground">{t.admin.noEvents}</p>
              ) : (
                <div className="space-y-2">
                  {events.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between py-4 px-4 border border-border bg-muted/30"
                    >
                      <div className="flex-1">
                        <p className="font-serif text-lg">{event.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {formatDate(event.event_date)} • {event.location || "Lieu à définir"}
                        </p>
                      </div>
                      <Select
                        value={event.status}
                        onValueChange={(v) => handleStatusChange(event.id, v as EventStatus)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">{t.admin.draft}</SelectItem>
                          <SelectItem value="published">{t.admin.published}</SelectItem>
                          <SelectItem value="cancelled">{t.admin.cancelled}</SelectItem>
                          <SelectItem value="completed">{t.admin.completed}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Admin;
