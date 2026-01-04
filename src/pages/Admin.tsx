import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { getAllEvents, createEvent, updateEvent } from "@/services/events";
import { getPresenters, getAllProfiles } from "@/services/profiles";
import { getEventPresenters, setEventPresenters } from "@/services/eventPresenters";
import { Database } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, FileText, Pencil, Send, XCircle, CheckCircle, Trash2, UserPlus } from "lucide-react";
import PresenterManagement from "@/components/admin/PresenterManagement";
import UserManagement from "@/components/admin/UserManagement";
import EventDocuments from "@/components/admin/EventDocuments";
import EventForm, { EventFormData, eventToFormData } from "@/components/admin/EventForm";
import PublishEventDialog from "@/components/admin/PublishEventDialog";
import CancelEventDialog from "@/components/admin/CancelEventDialog";
import DateChangeDialog from "@/components/admin/DateChangeDialog";

type Event = Database["public"]["Tables"]["events"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

const Admin = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"events" | "presenters" | "users">("events");
  const [events, setEvents] = useState<Event[]>([]);
  const [presenters, setPresenters] = useState<Profile[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Event dialog state
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [isEditEventOpen, setIsEditEventOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editingEventPresenterIds, setEditingEventPresenterIds] = useState<string[]>([]);
  const [isAddPdfDialogOpen, setIsAddPdfDialogOpen] = useState(false);
  const [newlyCreatedEvent, setNewlyCreatedEvent] = useState<{ event: Event; presenterIds: string[] } | null>(null);
  
  // Publish/Cancel/Delete/DateChange/Invite dialog state
  const [publishDialogEvent, setPublishDialogEvent] = useState<Event | null>(null);
  const [inviteDialogEvent, setInviteDialogEvent] = useState<Event | null>(null);
  const [cancelDialogEvent, setCancelDialogEvent] = useState<Event | null>(null);
  const [deleteDialogEvent, setDeleteDialogEvent] = useState<Event | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [dateChangeDialogData, setDateChangeDialogData] = useState<{
    event: Event;
    oldDate: string;
    newDate: string;
    formData: EventFormData;
  } | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    const [eventsRes, presentersRes, allProfilesRes] = await Promise.all([
      getAllEvents(),
      getPresenters(),
      getAllProfiles(),
    ]);
    
    if (eventsRes.data) setEvents(eventsRes.data);
    if (presentersRes.data) setPresenters(presentersRes.data);
    if (allProfilesRes.data) setAllProfiles(allProfilesRes.data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

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
      presenter_id: formData.presenterIds[0] || null,
      status: formData.status,
      created_by: user.id,
      category: formData.category || null,
    });

    if (error) {
      toast.error(t.auth.error);
    } else if (data) {
      if (formData.presenterIds.length > 0) {
        await setEventPresenters(data.id, formData.presenterIds);
      }
      toast.success("Événement créé !");
      setEvents([data, ...events]);
      setIsCreateEventOpen(false);
      setNewlyCreatedEvent({ event: data, presenterIds: formData.presenterIds });
      setIsAddPdfDialogOpen(true);
    }
  };

  const handleAddPdfNow = () => {
    if (newlyCreatedEvent) {
      setEditingEvent(newlyCreatedEvent.event);
      setEditingEventPresenterIds(newlyCreatedEvent.presenterIds);
      setIsAddPdfDialogOpen(false);
      setNewlyCreatedEvent(null);
      setIsEditEventOpen(true);
    }
  };

  const handleAddPdfLater = () => {
    setIsAddPdfDialogOpen(false);
    setNewlyCreatedEvent(null);
  };

  const handleEditEvent = async (formData: EventFormData) => {
    if (!editingEvent) return;
    
    const eventDateTime = new Date(`${formData.date}T${formData.time}`);
    const newDateIso = eventDateTime.toISOString();
    
    // Check if date has changed for published events
    const oldEventDate = new Date(editingEvent.event_date);
    const oldDateStr = oldEventDate.toISOString().split("T")[0];
    const oldTimeStr = oldEventDate.toTimeString().slice(0, 5);
    const dateHasChanged = formData.date !== oldDateStr || formData.time !== oldTimeStr;
    
    if (editingEvent.status === "published" && dateHasChanged) {
      // Show date change dialog
      setDateChangeDialogData({
        event: editingEvent,
        oldDate: editingEvent.event_date,
        newDate: newDateIso,
        formData,
      });
      return;
    }
    
    // Proceed with normal update
    await performEventUpdate(editingEvent.id, formData, newDateIso);
  };

  const performEventUpdate = async (eventId: string, formData: EventFormData, eventDateIso: string) => {
    const { data, error } = await updateEvent(eventId, {
      title: formData.title,
      topic: null,
      description: formData.description || null,
      event_date: eventDateIso,
      location: formData.location || null,
      participant_limit: formData.participantLimit ? parseInt(formData.participantLimit) : null,
      presenter_id: formData.presenterIds[0] || null,
      status: formData.status,
      category: formData.category || null,
    });

    if (error) {
      toast.error(t.auth.error);
    } else if (data) {
      await setEventPresenters(eventId, formData.presenterIds);
      toast.success("Événement mis à jour");
      setEvents(events.map((e) => (e.id === eventId ? data : e)));
      setIsEditEventOpen(false);
      setEditingEvent(null);
      setEditingEventPresenterIds([]);
    }
  };

  const handleDateChangeConfirm = async () => {
    if (!dateChangeDialogData) return;
    
    await performEventUpdate(
      dateChangeDialogData.event.id,
      dateChangeDialogData.formData,
      dateChangeDialogData.newDate
    );
    setDateChangeDialogData(null);
  };

  const handleDateChangeSkip = async () => {
    if (!dateChangeDialogData) return;
    
    await performEventUpdate(
      dateChangeDialogData.event.id,
      dateChangeDialogData.formData,
      dateChangeDialogData.newDate
    );
    setDateChangeDialogData(null);
  };

  const openEditDialog = async (event: Event) => {
    setEditingEvent(event);
    const { data: eventPresenters } = await getEventPresenters(event.id);
    // RPC returns presenter info with 'id' field, not 'presenter_id'
    const presenterIds = eventPresenters?.map(ep => ep.id) || [];
    setEditingEventPresenterIds(presenterIds);
    setIsEditEventOpen(true);
  };

  const getCategoryLabel = (category: string | null) => {
    if (!category) return "";
    return t.categories[category as keyof typeof t.categories] || category;
  };

  const handleMarkCompleted = async (eventId: string) => {
    const { error } = await updateEvent(eventId, { status: "completed" });
    if (error) {
      toast.error(t.auth.error);
    } else {
      setEvents(events.map((e) => (e.id === eventId ? { ...e, status: "completed" } : e)));
      toast.success("Événement marqué comme terminé");
    }
  };

  const handleEventPublished = () => {
    setPublishDialogEvent(null);
    fetchData();
  };

  const handleEventCancelled = () => {
    setCancelDialogEvent(null);
    fetchData();
  };

  const handleDeleteEvent = async () => {
    if (!deleteDialogEvent) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", deleteDialogEvent.id);
      
      if (error) {
        toast.error("Erreur lors de la suppression de l'événement");
        console.error("Delete error:", error);
      } else {
        toast.success("Événement supprimé définitivement");
        setEvents(events.filter((e) => e.id !== deleteDialogEvent.id));
        setDeleteDialogEvent(null);
      }
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Erreur lors de la suppression");
    } finally {
      setIsDeleting(false);
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
            <button
              onClick={() => setActiveTab("users")}
              className={`pb-4 font-sans text-sm transition-colors relative ${
                activeTab === "users"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Utilisateurs
              {activeTab === "users" && (
                <motion.div
                  layoutId="adminTab"
                  className="absolute bottom-0 left-0 right-0 h-px bg-foreground"
                />
              )}
            </button>
          </div>

          {isLoading ? (
            <p className="text-muted-foreground">{t.common.loading}</p>
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

                {/* Add PDF Confirmation Dialog */}
                <Dialog open={isAddPdfDialogOpen} onOpenChange={setIsAddPdfDialogOpen}>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Ajouter un document PDF ?</DialogTitle>
                      <DialogDescription className="pt-2">
                        Souhaitez-vous ajouter un document PDF à cet événement maintenant ?
                        <br /><br />
                        <span className="text-muted-foreground text-sm">
                          Vous pourrez toujours le faire plus tard en modifiant l'événement.
                        </span>
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex gap-2 sm:gap-0">
                      <Button variant="outline" onClick={handleAddPdfLater}>
                        Plus tard
                      </Button>
                      <Button variant="nightBlue" onClick={handleAddPdfNow}>
                        <FileText className="w-4 h-4 mr-2" />
                        Ajouter maintenant
                      </Button>
                    </DialogFooter>
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
                          <div className="flex items-center gap-2">
                            <p className="font-serif text-lg">{event.title}</p>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              event.status === "draft" ? "bg-muted text-muted-foreground" :
                              event.status === "published" ? "bg-primary/10 text-primary" :
                              event.status === "cancelled" ? "bg-destructive/10 text-destructive" :
                              "bg-muted text-muted-foreground"
                            }`}>
                              {getStatusLabel(event.status)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {formatDate(event.event_date)} • {event.location || "Lieu à définir"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(event)}
                            title="Modifier"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          
                          {event.status === "draft" && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteDialogEvent(event)}
                                title="Supprimer"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="nightBlue"
                                size="sm"
                                onClick={() => setPublishDialogEvent(event)}
                              >
                                <Send className="w-4 h-4 mr-2" />
                                Publier
                              </Button>
                            </>
                          )}
                          
                          {event.status === "published" && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setInviteDialogEvent(event)}
                                title="Inviter des membres"
                              >
                                <UserPlus className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleMarkCompleted(event.id)}
                                title="Marquer comme terminé"
                                className="hidden sm:inline-flex"
                              >
                                <CheckCircle className="w-4 h-4 sm:mr-2" />
                                <span className="hidden sm:inline">Terminé</span>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleMarkCompleted(event.id)}
                                title="Marquer comme terminé"
                                className="sm:hidden"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setCancelDialogEvent(event)}
                                title="Annuler l'événement"
                                className="hidden sm:inline-flex"
                              >
                                <XCircle className="w-4 h-4 sm:mr-2" />
                                <span className="hidden sm:inline">Annuler</span>
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setCancelDialogEvent(event)}
                                title="Annuler l'événement"
                                className="sm:hidden"
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Publish Event Dialog */}
              {publishDialogEvent && (
                <PublishEventDialog
                  open={!!publishDialogEvent}
                  onOpenChange={(open) => !open && setPublishDialogEvent(null)}
                  eventId={publishDialogEvent.id}
                  eventTitle={publishDialogEvent.title}
                  onPublished={handleEventPublished}
                />
              )}

              {/* Invite Dialog (for already published events) */}
              {inviteDialogEvent && (
                <PublishEventDialog
                  open={!!inviteDialogEvent}
                  onOpenChange={(open) => !open && setInviteDialogEvent(null)}
                  eventId={inviteDialogEvent.id}
                  eventTitle={inviteDialogEvent.title}
                  onPublished={() => {
                    setInviteDialogEvent(null);
                    toast.success("Invitations envoyées");
                  }}
                  inviteOnly
                />
              )}

              {/* Cancel Event Dialog */}
              {cancelDialogEvent && (
                <CancelEventDialog
                  open={!!cancelDialogEvent}
                  onOpenChange={(open) => !open && setCancelDialogEvent(null)}
                  eventId={cancelDialogEvent.id}
                  eventTitle={cancelDialogEvent.title}
                  onCancelled={handleEventCancelled}
                />
              )}

              {/* Delete Event Dialog */}
              <Dialog open={!!deleteDialogEvent} onOpenChange={(open) => !open && setDeleteDialogEvent(null)}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-destructive">Supprimer l'événement</DialogTitle>
                    <DialogDescription className="pt-2">
                      Êtes-vous sûr de vouloir supprimer définitivement l'événement "{deleteDialogEvent?.title}" ?
                      <br /><br />
                      <span className="text-destructive font-medium">
                        ⚠️ Cette action est irréversible. Toutes les données associées seront perdues.
                      </span>
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter className="flex gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => setDeleteDialogEvent(null)} disabled={isDeleting}>
                      Annuler
                    </Button>
                    <Button variant="destructive" onClick={handleDeleteEvent} disabled={isDeleting}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      {isDeleting ? "Suppression..." : "Supprimer définitivement"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Date Change Dialog */}
              {dateChangeDialogData && (
                <DateChangeDialog
                  open={!!dateChangeDialogData}
                  onOpenChange={(open) => !open && setDateChangeDialogData(null)}
                  eventId={dateChangeDialogData.event.id}
                  eventTitle={dateChangeDialogData.event.title}
                  oldDate={dateChangeDialogData.oldDate}
                  newDate={dateChangeDialogData.newDate}
                  onConfirm={handleDateChangeConfirm}
                  onSkip={handleDateChangeSkip}
                />
              )}
            </motion.div>
          ) : activeTab === "presenters" ? (
            <PresenterManagement
              presenters={presenters}
              allProfiles={allProfiles}
              onPresentersChange={fetchData}
            />
          ) : activeTab === "users" ? (
            <motion.div
              key="users"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              <UserManagement />
            </motion.div>
          ) : null}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Admin;
