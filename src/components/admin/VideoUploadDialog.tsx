import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Video, Loader2, X } from "lucide-react";
import { updateEvent } from "@/services/events";

interface VideoUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
  onComplete: () => void;
  existingVideoUrl?: string | null;
}

const VideoUploadDialog = ({
  open,
  onOpenChange,
  eventId,
  eventTitle,
  onComplete,
  existingVideoUrl,
}: VideoUploadDialogProps) => {
  const [uploading, setUploading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(existingVideoUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("video/")) {
      toast.error("Veuillez sélectionner un fichier vidéo");
      return;
    }

    // Validate file size (500MB max)
    if (file.size > 500 * 1024 * 1024) {
      toast.error("La vidéo ne doit pas dépasser 500 Mo");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${eventId}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("event-videos")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("event-videos")
        .getPublicUrl(fileName);

      // Update event with video URL
      const { error: updateError } = await updateEvent(eventId, {
        video_url: publicUrl,
      });

      if (updateError) throw updateError;

      setVideoUrl(publicUrl);
      toast.success("Vidéo téléversée avec succès");
    } catch (error) {
      console.error("Error uploading video:", error);
      toast.error("Erreur lors du téléversement de la vidéo");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveVideo = async () => {
    if (!videoUrl) return;

    try {
      // Extract file name from URL
      const urlParts = videoUrl.split("/");
      const fileName = urlParts[urlParts.length - 1];

      await supabase.storage.from("event-videos").remove([fileName]);
      
      await updateEvent(eventId, { video_url: null });
      
      setVideoUrl(null);
      toast.success("Vidéo supprimée");
    } catch (error) {
      console.error("Error removing video:", error);
      setVideoUrl(null);
    }
  };

  const handleClose = () => {
    onComplete();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter une vidéo de rediffusion</DialogTitle>
          <DialogDescription className="pt-2">
            L'événement « {eventTitle} » est maintenant terminé.
            <br /><br />
            Souhaitez-vous ajouter une vidéo de rediffusion pour les membres ?
          </DialogDescription>
        </DialogHeader>

        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleVideoUpload}
          className="hidden"
        />

        {videoUrl ? (
          <div className="relative border border-border rounded-md overflow-hidden">
            <video
              src={videoUrl}
              className="w-full h-48 object-cover"
              controls
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={handleRemoveVideo}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="w-full h-32 border-dashed"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="text-sm text-muted-foreground">Téléversement en cours...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Video className="w-8 h-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Cliquer pour ajouter une vidéo</span>
                <span className="text-xs text-muted-foreground">Max 500 Mo</span>
              </div>
            )}
          </Button>
        )}

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose}>
            {videoUrl ? "Terminé" : "Plus tard"}
          </Button>
          {!videoUrl && (
            <Button
              variant="nightBlue"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Video className="w-4 h-4 mr-2" />
              Ajouter une vidéo
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VideoUploadDialog;
