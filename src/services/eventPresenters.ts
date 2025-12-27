import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export interface EventPresenter {
  id: string;
  event_id: string;
  presenter_id: string;
  display_order: number;
  created_at: string;
  presenter?: Profile;
}

export const getEventPresenters = async (eventId: string): Promise<{ data: EventPresenter[] | null; error: Error | null }> => {
  const { data, error } = await supabase
    .from("event_presenters")
    .select(`
      *,
      presenter:profiles!event_presenters_presenter_id_fkey(*)
    `)
    .eq("event_id", eventId)
    .order("display_order", { ascending: true });

  return { data, error };
};

export const setEventPresenters = async (
  eventId: string, 
  presenterIds: string[]
): Promise<{ error: Error | null }> => {
  // First, remove all existing presenters for this event
  const { error: deleteError } = await supabase
    .from("event_presenters")
    .delete()
    .eq("event_id", eventId);

  if (deleteError) {
    return { error: deleteError };
  }

  // If no presenters to add, we're done
  if (presenterIds.length === 0) {
    return { error: null };
  }

  // Insert new presenters with display order
  const inserts = presenterIds.map((presenterId, index) => ({
    event_id: eventId,
    presenter_id: presenterId,
    display_order: index,
  }));

  const { error: insertError } = await supabase
    .from("event_presenters")
    .insert(inserts);

  return { error: insertError };
};

export const addEventPresenter = async (
  eventId: string, 
  presenterId: string,
  displayOrder?: number
): Promise<{ data: EventPresenter | null; error: Error | null }> => {
  const { data, error } = await supabase
    .from("event_presenters")
    .insert({
      event_id: eventId,
      presenter_id: presenterId,
      display_order: displayOrder ?? 0,
    })
    .select()
    .single();

  return { data, error };
};

export const removeEventPresenter = async (
  eventId: string, 
  presenterId: string
): Promise<{ error: Error | null }> => {
  const { error } = await supabase
    .from("event_presenters")
    .delete()
    .eq("event_id", eventId)
    .eq("presenter_id", presenterId);

  return { error };
};
