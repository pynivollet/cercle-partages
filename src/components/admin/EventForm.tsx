import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/i18n/LanguageContext";
import PresenterSelectorDialog from "./PresenterSelectorDialog";
import { Database } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ImagePlus, X, Loader2 } from "lucide-react";

type Event = Database["public"]["Tables"]["events"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type EventCategory = Database["public"]["Enums"]["event_category"];
type EventStatus = Database["public"]["Enums"]["event_status"];

export interface EventFormData {
  title: string;
  category: EventCategory | "";
  description: string;
  date: string;
  time: string;
  location: string;
  participantLimit: string;
  presenterIds: string[];
  status: EventStatus;
  imageUrl: string | null;
}

interface EventFormProps {
  presenters: Profile[];
  initialData?: EventFormData;
  onSubmit: (data: EventFormData) => void;
  submitLabel: string;
  isEdit?: boolean;
  onPresenterCreated?: (presenter: Profile) => void;
  eventId?: string;
}

const EventForm = ({ presenters, initialData, onSubmit, submitLabel, isEdit, onPresenterCreated, eventId }: EventFormProps) => {
  const { t } = useLanguage();
  const [title, setTitle] = useState(initialData?.title || "");
  const [category, setCategory] = useState<EventCategory | "">(initialData?.category || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [date, setDate] = useState(initialData?.date || "");
  const [time, setTime] = useState(initialData?.time || "19:30");
  const [location, setLocation] = useState(initialData?.location || "");
  const [participantLimit, setParticipantLimit] = useState(initialData?.participantLimit || "");
  const [presenterIds, setPresenterIds] = useState<string[]>(initialData?.presenterIds || []);
  const [status, setStatus] = useState<EventStatus>(initialData?.status || "draft");
  const [imageUrl, setImageUrl] = useState<string | null>(initialData?.imageUrl || null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Completed events have restricted editing
  const isCompleted = status === "completed";

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setCategory(initialData.category);
      setDescription(initialData.description);
      setDate(initialData.date);
      setTime(initialData.time);
      setLocation(initialData.location);
      setParticipantLimit(initialData.participantLimit);
      setPresenterIds(initialData.presenterIds);
      setStatus(initialData.status);
      setImageUrl(initialData.imageUrl);
    }
  }, [initialData]);

  const handleSelectionChange = (ids: string[]) => {
    setPresenterIds(ids);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error(t.admin.selectImage);
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t.admin.imageTooLarge.replace("{size}", "5 Mo"));
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${eventId || crypto.randomUUID()}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("event-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("event-images")
        .getPublicUrl(filePath);

      setImageUrl(publicUrl);
      toast.success("Image téléversée");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Erreur lors du téléversement");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveImage = async () => {
    if (!imageUrl) return;

    // Extract file name from URL
    const urlParts = imageUrl.split("/");
    const fileName = urlParts[urlParts.length - 1];

    try {
      await supabase.storage.from("event-images").remove([fileName]);
      setImageUrl(null);
      toast.success("Image supprimée");
    } catch (error) {
      console.error("Error removing image:", error);
      // Still remove from state even if delete fails
      setImageUrl(null);
    }
  };

  const handleSubmit = () => {
    onSubmit({
      title,
      category,
      description,
      date,
      time,
      location,
      participantLimit,
      presenterIds,
      status,
      imageUrl,
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Titre *</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label>{t.categories.title}</Label>
        <Select
          value={category}
          onValueChange={(v) => setCategory(v as EventCategory)}
        >
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Sélectionner une catégorie..." />
          </SelectTrigger>
          <SelectContent className="bg-background border border-border z-50">
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
        <Label>Description</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Date *</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            disabled={isCompleted}
            className={isCompleted ? "opacity-50 cursor-not-allowed" : ""}
          />
          {isCompleted && (
            <p className="text-xs text-muted-foreground">Non modifiable pour un événement terminé</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Heure</Label>
          <Input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            disabled={isCompleted}
            className={isCompleted ? "opacity-50 cursor-not-allowed" : ""}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Lieu</Label>
        <Input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>Limite de participants</Label>
        <Input
          type="number"
          value={participantLimit}
          onChange={(e) => setParticipantLimit(e.target.value)}
          min="1"
          disabled={isCompleted}
          className={isCompleted ? "opacity-50 cursor-not-allowed" : ""}
        />
        {isCompleted && (
          <p className="text-xs text-muted-foreground">Non modifiable pour un événement terminé</p>
        )}
      </div>
      {isCompleted ? (
        <div className="space-y-2">
          <Label>Intervenant(s)</Label>
          <div className="p-3 rounded-md border border-border bg-muted/50 text-sm">
            {presenterIds.length > 0 
              ? presenters.filter(p => presenterIds.includes(p.id)).map(p => `${p.first_name || ''} ${p.last_name || ''}`).join(', ')
              : "Aucun intervenant"}
          </div>
          <p className="text-xs text-muted-foreground">Non modifiable pour un événement terminé</p>
        </div>
      ) : (
        <PresenterSelectorDialog
          presenters={presenters}
          selectedIds={presenterIds}
          onSelectionChange={handleSelectionChange}
          onPresenterCreated={onPresenterCreated}
        />
      )}

      {/* Image upload */}
      <div className="space-y-2">
        <Label>Image de l'événement</Label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
        {imageUrl ? (
          <div className="relative">
            <img
              src={imageUrl}
              alt="Aperçu"
              className="w-full h-48 object-cover rounded-md border border-border"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={handleRemoveImage}
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
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <div className="flex flex-col items-center gap-2">
                <ImagePlus className="w-8 h-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Cliquer pour ajouter une image</span>
              </div>
            )}
          </Button>
        )}
      </div>
      <Button
        variant="nightBlue"
        className="w-full"
        onClick={handleSubmit}
        disabled={!title || !date}
      >
        {submitLabel}
      </Button>
    </div>
  );
};

export default EventForm;

