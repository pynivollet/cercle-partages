import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Video, Loader2, X } from "lucide-react";
import { updateEvent } from "@/services/events";

interface EventVideoUploadProps {
  eventId: string;
  initialVideoUrl: string | null;
  onVideoChange?: (videoUrl: string | null) => void;
}

const EventVideoUpload = ({ eventId, initialVideoUrl, onVideoChange }: EventVideoUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(initialVideoUrl);
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
      onVideoChange?.(publicUrl);
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
      onVideoChange?.(null);
      toast.success("Vidéo supprimée");
    } catch (error) {
      console.error("Error removing video:", error);
      setVideoUrl(null);
      onVideoChange?.(null);
    }
  };

  return (
    <div className="space-y-2">
      <Label>Vidéo de rediffusion</Label>
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
          className="w-full h-24 border-dashed"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-sm text-muted-foreground">Téléversement...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Video className="w-6 h-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Ajouter une vidéo (max 500 Mo)</span>
            </div>
          )}
        </Button>
      )}
    </div>
  );
};

export default EventVideoUpload;
