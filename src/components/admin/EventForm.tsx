import { useState, useEffect } from "react";
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

type Event = Database["public"]["Tables"]["events"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type EventStatus = Database["public"]["Enums"]["event_status"];
type EventCategory = Database["public"]["Enums"]["event_category"];

export interface EventFormData {
  title: string;
  topic: string;
  description: string;
  date: string;
  time: string;
  location: string;
  participantLimit: string;
  presenterIds: string[];
  status: EventStatus;
  category: EventCategory | "";
}

interface EventFormProps {
  presenters: Profile[];
  initialData?: EventFormData;
  onSubmit: (data: EventFormData) => void;
  submitLabel: string;
  isEdit?: boolean;
  onPresenterCreated?: (presenter: Profile) => void;
}

const EventForm = ({ presenters, initialData, onSubmit, submitLabel, isEdit, onPresenterCreated }: EventFormProps) => {
  const { t } = useLanguage();
  const [title, setTitle] = useState(initialData?.title || "");
  const [topic, setTopic] = useState(initialData?.topic || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [date, setDate] = useState(initialData?.date || "");
  const [time, setTime] = useState(initialData?.time || "19:30");
  const [location, setLocation] = useState(initialData?.location || "");
  const [participantLimit, setParticipantLimit] = useState(initialData?.participantLimit || "");
  const [presenterIds, setPresenterIds] = useState<string[]>(initialData?.presenterIds || []);
  const [status, setStatus] = useState<EventStatus>(initialData?.status || "draft");
  const [category, setCategory] = useState<EventCategory | "">(initialData?.category || "");

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setTopic(initialData.topic);
      setDescription(initialData.description);
      setDate(initialData.date);
      setTime(initialData.time);
      setLocation(initialData.location);
      setParticipantLimit(initialData.participantLimit);
      setPresenterIds(initialData.presenterIds);
      setStatus(initialData.status);
      setCategory(initialData.category);
    }
  }, [initialData]);

  const handleSelectionChange = (ids: string[]) => {
    setPresenterIds(ids);
  };

  const handleSubmit = () => {
    onSubmit({
      title,
      topic,
      description,
      date,
      time,
      location,
      participantLimit,
      presenterIds,
      status,
      category,
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
        <Label>Thème</Label>
        <Input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />
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
          />
        </div>
        <div className="space-y-2">
          <Label>Heure</Label>
          <Input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
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
        />
      </div>
      <PresenterSelectorDialog
        presenters={presenters}
        selectedIds={presenterIds}
        onSelectionChange={handleSelectionChange}
        onPresenterCreated={onPresenterCreated}
      />
      <div className="space-y-2">
        <Label>{t.categories.title}</Label>
        <Select
          value={category}
          onValueChange={(v) => setCategory(v as EventCategory)}
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
          value={status}
          onValueChange={(v) => setStatus(v as EventStatus)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">{t.admin.draft}</SelectItem>
            <SelectItem value="published">{t.admin.published}</SelectItem>
            {isEdit && (
              <>
                <SelectItem value="cancelled">{t.admin.cancelled}</SelectItem>
                <SelectItem value="completed">{t.admin.completed}</SelectItem>
              </>
            )}
          </SelectContent>
        </Select>
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

export const eventToFormData = (event: Event, presenterIds: string[] = []): EventFormData => {
  const eventDate = new Date(event.event_date);
  return {
    title: event.title,
    topic: event.topic || "",
    description: event.description || "",
    date: eventDate.toISOString().split("T")[0],
    time: eventDate.toTimeString().slice(0, 5),
    location: event.location || "",
    participantLimit: event.participant_limit?.toString() || "",
    presenterIds,
    status: event.status,
    category: (event.category as EventCategory) || "",
  };
};
