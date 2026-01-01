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
import { Loader2 } from "lucide-react";

interface CancelEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
  onCancelled: () => void;
}

const CancelEventDialog = ({
  open,
  onOpenChange,
  eventId,
  eventTitle,
  onCancelled,
}: CancelEventDialogProps) => {
  const [isCancelling, setIsCancelling] = useState(false);

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "send-event-cancellation",
        {
          body: { eventId },
        }
      );

      if (error) throw error;

      if (data.success) {
        if (data.sent > 0) {
          toast.success(
            `Événement annulé. ${data.sent} participant${data.sent > 1 ? "s" : ""} notifié${data.sent > 1 ? "s" : ""}`
          );
        } else {
          toast.success("Événement annulé");
        }
        onOpenChange(false);
        onCancelled();
      } else {
        throw new Error(data.error || "Erreur inconnue");
      }
    } catch (error) {
      console.error("Error cancelling event:", error);
      toast.error("Erreur lors de l'annulation de l'événement");
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Annuler l'événement ?</AlertDialogTitle>
          <AlertDialogDescription>
            Êtes-vous sûr de vouloir annuler "{eventTitle}" ?
            <br />
            <br />
            <span className="text-destructive font-medium">
              Un email d'annulation sera envoyé à tous les participants inscrits.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isCancelling}>
            Non, garder l'événement
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleCancel();
            }}
            disabled={isCancelling}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isCancelling ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Annulation...
              </>
            ) : (
              "Oui, annuler l'événement"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default CancelEventDialog;
