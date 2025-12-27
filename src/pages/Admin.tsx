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
import { getPresenters, getAllProfiles } from "@/services/profiles";
import { getEventPresenters, setEventPresenters } from "@/services/eventPresenters";
import { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { Copy, Plus, FileText, Pencil } from "lucide-react";
import PresenterManagement from "@/components/admin/PresenterManagement";
import EventDocuments from "@/components/admin/EventDocuments";
import EventForm, { EventFormData, eventToFormData } from "@/components/admin/EventForm";

type Invitation = Database["public"]["Tables"]["invitations"]["Row"];
type Event = Database["public"]["Tables"]["events"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type AppRole = Database["public"]["Enums"]["app_role"];
type EventStatus = Database["public"]["Enums"]["event_status"];

const Admin = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"invitations" | "events" | "presenters">("invitations");
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [presenters, setPresenters] = useState<Profile[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  // Invitation form state
  const [newInviteEmail, setNewInviteEmail] = useState("");
  const [newInviteRole, setNewInviteRole] = useState<AppRole>("participant");
  const [isCreateInviteOpen, setIsCreateInviteOpen] = useState(false);

  // Event dialog state
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [isEditEventOpen, setIsEditEventOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editingEventPresenterIds, setEditingEventPresenterIds] = useState<string[]>([]);

  const fetchData = async () => {
    setIsLoading(true);
    const [invitationsRes, eventsRes, presentersRes, allProfilesRes] = await Promise.all([
      getInvitations(),
      getAllEvents(),
      getPresenters(),
      getAllProfiles(),
    ]);
    
    if (invitationsRes.data) setInvitations(invitationsRes.data);
    if (eventsRes.data) setEvents(eventsRes.data);
    if (presentersRes.data) setPresenters(presentersRes.data);
    if (allProfilesRes.data) setAllProfiles(allProfilesRes.data);
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

  const handleCreateEvent = async (formData: EventFormData) => {
    if (!user) return;
    
    const eventDateTime = new Date(`${formData.date}T${formData.time}`);
    
    const { data, error } = await createEvent({
      title: formData.title,
      topic: formData.category ? null : null,
      description: formData.description || null,
      event_date: eventDateTime.toISOString(),
      location: formData.location || null,
      participant_limit: formData.participantLimit ? parseInt(formData.participantLimit) : null,
      presenter_id: formData.presenterIds[0] || null, // Keep first presenter in legacy field for compatibility
      status: formData.status,
      created_by: user.id,
      category: formData.category || null,
    });

    if (error) {
      toast.error(t.auth.error);
    } else if (data) {
      // Set all presenters in the junction table
      if (formData.presenterIds.length > 0) {
        await setEventPresenters(data.id, formData.presenterIds);
      }
      toast.success(t.common.save);
      setEvents([data, ...events]);
      setIsCreateEventOpen(false);
    }
  };

  const handleEditEvent = async (formData: EventFormData) => {
    if (!editingEvent) return;
    
    const eventDateTime = new Date(`${formData.date}T${formData.time}`);
    
    const { data, error } = await updateEvent(editingEvent.id, {
      title: formData.title,
      topic: null,
      description: formData.description || null,
      event_date: eventDateTime.toISOString(),
      location: formData.location || null,
      participant_limit: formData.participantLimit ? parseInt(formData.participantLimit) : null,
      presenter_id: formData.presenterIds[0] || null, // Keep first presenter in legacy field
      status: formData.status,
      category: formData.category || null,
    });

    if (error) {
      toast.error(t.auth.error);
    } else if (data) {
      // Update presenters in the junction table
      await setEventPresenters(editingEvent.id, formData.presenterIds);
      toast.success("Événement mis à jour");
      setEvents(events.map((e) => (e.id === editingEvent.id ? data : e)));
      setIsEditEventOpen(false);
      setEditingEvent(null);
      setEditingEventPresenterIds([]);
    }
  };

  const openEditDialog = async (event: Event) => {
    setEditingEvent(event);
    // Load current presenters for this event
    const { data: eventPresenters } = await getEventPresenters(event.id);
    const presenterIds = eventPresenters?.map(ep => ep.presenter_id) || [];
    setEditingEventPresenterIds(presenterIds);
    setIsEditEventOpen(true);
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
            <button
              onClick={() => setActiveTab("presenters")}
              className={`pb-4 font-sans text-sm transition-colors relative ${
                activeTab === "presenters"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.admin.presenters}
              {activeTab === "presenters" && (
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
          ) : activeTab === "events" ? (
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
                    <div className="mt-4">
                      <EventForm
                        presenters={presenters}
                        onSubmit={handleCreateEvent}
                        submitLabel={t.admin.createEvent}
                        onPresenterCreated={(presenter) => setPresenters([...presenters, presenter])}
                      />
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Edit Event Dialog */}
                <Dialog open={isEditEventOpen} onOpenChange={(open) => {
                  setIsEditEventOpen(open);
                  if (!open) {
                    setEditingEvent(null);
                    setEditingEventPresenterIds([]);
                  }
                }}>
                  <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Modifier l'événement</DialogTitle>
                    </DialogHeader>
                    <div className="mt-4 space-y-6">
                      {editingEvent && (
                        <>
                          <EventForm
                            presenters={presenters}
                            initialData={eventToFormData(editingEvent, editingEventPresenterIds)}
                            onSubmit={handleEditEvent}
                            submitLabel="Enregistrer"
                            isEdit
                            onPresenterCreated={(presenter) => setPresenters([...presenters, presenter])}
                          />
                          <div className="pt-4 border-t border-border">
                            <EventDocuments eventId={editingEvent.id} userId={user?.id || ""} />
                          </div>
                        </>
                      )}
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
                      className="border border-border bg-muted/30"
                    >
                      <div className="flex items-center justify-between py-4 px-4">
                        <div className="flex-1">
                          <p className="font-serif text-lg">{event.title}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {formatDate(event.event_date)} • {event.location || "Lieu à définir"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(event)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedEventId(
                              expandedEventId === event.id ? null : event.id
                            )}
                          >
                            <FileText className="w-4 h-4 mr-1" />
                            PDF
                          </Button>
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
                      </div>
                      {expandedEventId === event.id && user && (
                        <div className="px-4 pb-4 border-t border-border pt-4">
                          <EventDocuments eventId={event.id} userId={user.id} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : activeTab === "presenters" ? (
            <PresenterManagement
              presenters={presenters}
              allProfiles={allProfiles}
              onPresentersChange={fetchData}
            />
          ) : null}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Admin;
