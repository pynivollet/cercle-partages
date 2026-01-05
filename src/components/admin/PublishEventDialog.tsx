import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { invokeSecureFunction } from "@/lib/supabaseFunctions";
import { Mail, Users, Loader2 } from "lucide-react";
import { getProfileDisplayName } from "@/lib/profileName";

interface User {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

interface PublishEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
  onPublished: () => void;
  /** If true, only sends invitations without changing event status */
  inviteOnly?: boolean;
}

const PublishEventDialog = ({
  open,
  onOpenChange,
  eventId,
  eventTitle,
  onPublished,
  inviteOnly = false,
}: PublishEventDialogProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [sendToAll, setSendToAll] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      // Fetch all profiles
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .order("first_name");

      if (error) throw error;

      // We don't have direct access to emails from client, but we can display profile info
      // The edge function will handle fetching emails server-side
      setUsers(
        profiles?.map((p) => ({
          id: p.id,
          email: "", // Will be resolved server-side
          first_name: p.first_name,
          last_name: p.last_name,
        })) || []
      );
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Erreur lors du chargement des utilisateurs");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleToggleAll = () => {
    if (selectedUserIds.length === users.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(users.map((u) => u.id));
    }
  };

  const handleSendInvitations = async () => {
    if (!sendToAll && selectedUserIds.length === 0) {
      toast.error("Veuillez sélectionner au moins un destinataire");
      return;
    }

    setIsSending(true);
    try {
      const data = await invokeSecureFunction<
        { success: boolean; sent: number; failed: number; error?: string },
        {
          eventId: string;
          userIds: string[];
          sendToAll: boolean;
          skipStatusUpdate: boolean;
        }
      >("send-event-invitations", {
        body: {
          eventId,
          userIds: sendToAll ? [] : selectedUserIds,
          sendToAll,
          skipStatusUpdate: inviteOnly,
        },
      });

      if (data.success) {
        toast.success(
          `Invitations envoyées à ${data.sent} personne${data.sent > 1 ? "s" : ""}`
        );
        if (data.failed > 0) {
          toast.warning(`${data.failed} envoi(s) ont échoué`);
        }
        onOpenChange(false);
        onPublished();
      } else {
        throw new Error(data.error || "Erreur inconnue");
      }
    } catch (error) {
      console.error("Error sending invitations:", error);
      toast.error("Erreur lors de l'envoi des invitations");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{inviteOnly ? "Inviter des membres" : "Publier l'événement"}</DialogTitle>
          <DialogDescription>
            Envoyez une invitation par email aux membres pour "{eventTitle}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Send to all toggle */}
          <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
            <Checkbox
              id="sendToAll"
              checked={sendToAll}
              onCheckedChange={(checked) => setSendToAll(checked === true)}
            />
            <Label
              htmlFor="sendToAll"
              className="flex items-center gap-2 cursor-pointer"
            >
              <Users className="w-4 h-4" />
              Envoyer à tous les membres
            </Label>
          </div>

          {/* Individual selection */}
          {!sendToAll && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-sm text-muted-foreground">
                  Sélectionner les destinataires
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleToggleAll}
                  className="text-xs"
                >
                  {selectedUserIds.length === users.length
                    ? "Tout désélectionner"
                    : "Tout sélectionner"}
                </Button>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ScrollArea className="h-[200px] border border-border rounded-lg p-2">
                  <div className="space-y-1">
                    {users.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded cursor-pointer"
                        onClick={() => handleToggleUser(user.id)}
                      >
                        <Checkbox
                          checked={selectedUserIds.includes(user.id)}
                          onCheckedChange={() => handleToggleUser(user.id)}
                        />
                        <span className="text-sm">
                          {getProfileDisplayName(user) || "Utilisateur sans nom"}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}

              <p className="text-xs text-muted-foreground text-center">
                {selectedUserIds.length} personne
                {selectedUserIds.length > 1 ? "s" : ""} sélectionnée
                {selectedUserIds.length > 1 ? "s" : ""}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSending}
          >
            Annuler
          </Button>
          <Button
            variant="nightBlue"
            onClick={handleSendInvitations}
            disabled={isSending || (!sendToAll && selectedUserIds.length === 0)}
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                Envoyer les invitations
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PublishEventDialog;
