import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Users, UserCheck, UserX, Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { getProfileDisplayName } from "@/lib/profileName";

type RecipientType = "all" | "registered" | "not_registered" | "specific";

interface Event {
  id: string;
  title: string;
  event_date: string;
  status: string;
}

interface User {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  invitation_accepted: boolean;
}

interface Registration {
  user_id: string;
}

export default function AdminReminders() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  const [events, setEvents] = useState<Event[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [recipientType, setRecipientType] = useState<RecipientType>("all");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [customMessage, setCustomMessage] = useState("");
  const [subject, setSubject] = useState("");
  
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Fetch published events
  useEffect(() => {
    const fetchEvents = async () => {
      setIsLoadingEvents(true);
      const { data, error } = await supabase
        .from("events")
        .select("id, title, event_date, status")
        .in("status", ["published", "completed"])
        .order("event_date", { ascending: false });

      if (error) {
        console.error("Error fetching events:", error);
        toast.error("Erreur lors du chargement des événements");
      } else {
        setEvents(data || []);
      }
      setIsLoadingEvents(false);
    };

    fetchEvents();
  }, []);

  // Fetch users when component mounts
  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoadingUsers(true);
      try {
        const { data, error } = await supabase.functions.invoke("get-users");
        if (error) throw error;
        
        const validatedUsers = (data?.users || [])
          .filter((u: User) => u.invitation_accepted)
          .map((u: User) => ({
            id: u.id,
            email: u.email,
            first_name: u.first_name,
            last_name: u.last_name,
            invitation_accepted: u.invitation_accepted,
          }));
        
        setUsers(validatedUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
        toast.error("Erreur lors du chargement des utilisateurs");
      } finally {
        setIsLoadingUsers(false);
      }
    };

    fetchUsers();
  }, []);

  // Fetch registrations when event changes
  useEffect(() => {
    const fetchRegistrations = async () => {
      if (!selectedEventId) {
        setRegistrations([]);
        return;
      }

      const { data, error } = await supabase
        .from("event_registrations")
        .select("user_id")
        .eq("event_id", selectedEventId)
        .eq("status", "confirmed");

      if (error) {
        console.error("Error fetching registrations:", error);
      } else {
        setRegistrations(data || []);
      }
    };

    fetchRegistrations();
  }, [selectedEventId]);

  const registeredUserIds = new Set(registrations.map(r => r.user_id));

  const getFilteredUsers = useCallback(() => {
    switch (recipientType) {
      case "registered":
        return users.filter(u => registeredUserIds.has(u.id));
      case "not_registered":
        return users.filter(u => !registeredUserIds.has(u.id));
      case "specific":
        return users.filter(u => selectedUserIds.includes(u.id));
      case "all":
      default:
        return users;
    }
  }, [recipientType, users, registeredUserIds, selectedUserIds]);

  const filteredUsers = getFilteredUsers();

  const handleUserToggle = (userId: string) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUserIds.length === users.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(users.map(u => u.id));
    }
  };

  const handleSendReminder = async () => {
    if (!selectedEventId) {
      toast.error("Veuillez sélectionner un événement");
      return;
    }

    if (!customMessage.trim()) {
      toast.error("Veuillez entrer un message personnalisé");
      return;
    }

    if (recipientType === "specific" && selectedUserIds.length === 0) {
      toast.error("Veuillez sélectionner au moins un destinataire");
      return;
    }

    const recipientCount = recipientType === "specific" 
      ? selectedUserIds.length 
      : filteredUsers.length;

    if (recipientCount === 0) {
      toast.error("Aucun destinataire à notifier");
      return;
    }

    setIsSending(true);

    try {
      const { data, error } = await supabase.functions.invoke("send-event-reminder", {
        body: {
          eventId: selectedEventId,
          userIds: recipientType === "specific" ? selectedUserIds : [],
          recipientType,
          customMessage: customMessage.trim(),
          subject: subject.trim() || undefined,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`${data.sent} rappel(s) envoyé(s) avec succès`);
        if (data.failed > 0) {
          toast.warning(`${data.failed} email(s) n'ont pas pu être envoyés`);
        }
        // Reset form
        setCustomMessage("");
        setSubject("");
        setSelectedUserIds([]);
      } else {
        throw new Error(data.error || "Erreur inconnue");
      }
    } catch (error) {
      console.error("Error sending reminder:", error);
      toast.error("Erreur lors de l'envoi des rappels");
    } finally {
      setIsSending(false);
    }
  };

  const selectedEvent = events.find(e => e.id === selectedEventId);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate("/admin")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Envoi de rappels</h1>
              <p className="text-muted-foreground">Envoyez des rappels personnalisés aux participants</p>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Left column - Configuration */}
            <div className="space-y-6">
              {/* Event Selection */}
              <div className="space-y-2">
                <Label htmlFor="event-select">Événement</Label>
                <Select 
                  value={selectedEventId} 
                  onValueChange={setSelectedEventId}
                  disabled={isLoadingEvents}
                >
                  <SelectTrigger id="event-select">
                    <SelectValue placeholder="Sélectionner un événement" />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map(event => {
                      const date = new Date(event.event_date);
                      const formattedDate = date.toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      });
                      return (
                        <SelectItem key={event.id} value={event.id}>
                          <div className="flex items-center gap-2">
                            <span>{event.title}</span>
                            <span className="text-muted-foreground text-xs">({formattedDate})</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {selectedEventId && (
                <>
                  {/* Registration stats */}
                  <div className="flex gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-green-600" />
                      <span className="text-sm">
                        <strong>{registrations.length}</strong> inscrit(s)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <UserX className="h-4 w-4 text-orange-600" />
                      <span className="text-sm">
                        <strong>{users.length - registrations.length}</strong> non inscrit(s)
                      </span>
                    </div>
                  </div>

                  {/* Recipient Type Selection */}
                  <div className="space-y-2">
                    <Label>Destinataires</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant={recipientType === "all" ? "default" : "outline"}
                        className="justify-start"
                        onClick={() => setRecipientType("all")}
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Tous ({users.length})
                      </Button>
                      <Button
                        type="button"
                        variant={recipientType === "registered" ? "default" : "outline"}
                        className="justify-start"
                        onClick={() => setRecipientType("registered")}
                      >
                        <UserCheck className="h-4 w-4 mr-2" />
                        Inscrits ({registrations.length})
                      </Button>
                      <Button
                        type="button"
                        variant={recipientType === "not_registered" ? "default" : "outline"}
                        className="justify-start"
                        onClick={() => setRecipientType("not_registered")}
                      >
                        <UserX className="h-4 w-4 mr-2" />
                        Non inscrits ({users.length - registrations.length})
                      </Button>
                      <Button
                        type="button"
                        variant={recipientType === "specific" ? "default" : "outline"}
                        className="justify-start"
                        onClick={() => setRecipientType("specific")}
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        Sélection ({selectedUserIds.length})
                      </Button>
                    </div>
                  </div>

                  {/* Specific user selection */}
                  {recipientType === "specific" && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Sélectionner les destinataires</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleSelectAll}
                        >
                          {selectedUserIds.length === users.length ? "Désélectionner tout" : "Tout sélectionner"}
                        </Button>
                      </div>
                      <ScrollArea className="h-48 border rounded-md p-2">
                        {isLoadingUsers ? (
                          <div className="flex items-center justify-center h-full">
                            <Loader2 className="h-5 w-5 animate-spin" />
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {users.map(user => {
                              const isRegistered = registeredUserIds.has(user.id);
                              return (
                                <div
                                  key={user.id}
                                  className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded"
                                >
                                  <Checkbox
                                    id={`user-${user.id}`}
                                    checked={selectedUserIds.includes(user.id)}
                                    onCheckedChange={() => handleUserToggle(user.id)}
                                  />
                                  <label
                                    htmlFor={`user-${user.id}`}
                                    className="flex-1 cursor-pointer text-sm"
                                  >
                                    <span className="font-medium">
                                      {getProfileDisplayName({ first_name: user.first_name, last_name: user.last_name })}
                                    </span>
                                    <span className="text-muted-foreground ml-2">{user.email}</span>
                                  </label>
                                  {isRegistered ? (
                                    <Badge variant="secondary" className="text-xs">Inscrit</Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-xs">Non inscrit</Badge>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </ScrollArea>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Right column - Message */}
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="subject">Objet de l'email (optionnel)</Label>
                <Input
                  id="subject"
                  placeholder={selectedEvent ? `Rappel : ${selectedEvent.title}` : "Objet de l'email"}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Si laissé vide, l'objet sera "Rappel : [Titre de l'événement]"
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message personnalisé *</Label>
                <Textarea
                  id="message"
                  placeholder="Écrivez votre message personnalisé ici...&#10;&#10;Exemple : Nous vous rappelons que notre prochaine rencontre aura lieu très bientôt. N'oubliez pas de vous inscrire si ce n'est pas déjà fait !"
                  className="min-h-[200px] resize-y"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Ce message apparaîtra en haut de l'email, avant les détails de l'événement.
                </p>
              </div>

              <Separator />

              {/* Preview count */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="h-4 w-4" />
                  <span className="font-medium">Récapitulatif</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {selectedEventId ? (
                    <>
                      <strong>
                        {recipientType === "specific" ? selectedUserIds.length : filteredUsers.length}
                      </strong> destinataire(s) recevront ce rappel
                      {selectedEvent && (
                        <> pour l'événement <strong>{selectedEvent.title}</strong></>
                      )}
                    </>
                  ) : (
                    "Sélectionnez un événement pour commencer"
                  )}
                </p>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handleSendReminder}
                disabled={!selectedEventId || !customMessage.trim() || isSending}
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Envoyer les rappels
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
