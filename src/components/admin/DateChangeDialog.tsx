import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CalendarClock, Mail, Loader2 } from "lucide-react";

interface DateChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
  oldDate: string;
  newDate: string;
  onConfirm: () => void;
  onSkip: () => void;
}

const DateChangeDialog = ({
  open,
  onOpenChange,
  eventId,
  eventTitle,
  oldDate,
  newDate,
  onConfirm,
  onSkip,
}: DateChangeDialogProps) => {
  const [isSending, setIsSending] = useState(false);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleSendNotifications = async () => {
    setIsSending(true);
    try {
      const { data: session } = await supabase.auth.getSession();

      const { data, error } = await supabase.functions.invoke("send-date-change-notification", {
        body: {
          eventId,
          oldDate,
          newDate,
        },
      });

      if (error) {
        console.error("Error sending notifications:", error);
        toast.error("Erreur lors de l'envoi des notifications");
      } else {
        toast.success(`Notifications envoyées à ${data.sent} membres. Les inscriptions ont été réinitialisées.`);
        onConfirm();
      }
    } catch (err) {
      console.error("Error:", err);
      toast.error("Erreur lors de l'envoi des notifications");
    } finally {
      setIsSending(false);
    }
  };

  const handleSkip = () => {
    onSkip();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-primary" />
            Changement de date détecté
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 pt-2">
              <p>
                Vous avez modifié la date de l'événement <strong>"{eventTitle}"</strong>.
              </p>

              <div className="bg-muted/50 p-3 rounded-lg space-y-2 text-sm">
                <p className="text-muted-foreground line-through">Ancienne date : {formatDate(oldDate)}</p>
                <p className="text-foreground font-medium">Nouvelle date : {formatDate(newDate)}</p>
              </div>

              <p>
                Souhaitez-vous notifier tous les membres de ce changement ?
                <span className="text-destructive font-medium"> Les inscriptions existantes seront annulées</span> et
                les participants devront se réinscrire.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
          <AlertDialogCancel onClick={handleSkip} disabled={isSending}>
            Ne pas notifier
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleSendNotifications}
            disabled={isSending}
            className="bg-primary hover:bg-primary/90"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                Notifier tous les membres
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DateChangeDialog;
