import { supabase } from "@/integrations/supabase/client";

// Types for presenter info from RPC
export interface EventPresenterInfo {
  id: string;
  first_name: string | null;
  last_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  display_order?: number;
}

// =============================================================================
// PUBLIC RPC-BASED FUNCTIONS
// =============================================================================

/**
 * Get presenters for an event via RPC
 * Returns presenter public info only (no joins in frontend)
 */
export const getEventPresenters = async (
  eventId: string,
): Promise<{ data: EventPresenterInfo[] | null; error: Error | null }> => {
  const { data, error } = await supabase.rpc("get_event_presenters", { event_uuid: eventId });

  if (error) {
    return { data: null, error };
  }

  return { data: (data as unknown) as EventPresenterInfo[] | null, error: null };
};

// =============================================================================
// ADMIN-ONLY FUNCTIONS (Direct table access - protected by RLS)
// =============================================================================

/**
 * Set presenters for an event (admin only)
 * Replaces all existing presenters with new list
 */
export const setEventPresenters = async (eventId: string, presenterIds: string[]): Promise<{ error: Error | null }> => {
  // First, remove all existing presenters for this event
  const { error: deleteError } = await supabase.from("event_presenters").delete().eq("event_id", eventId);

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

  const { error: insertError } = await supabase.from("event_presenters").insert(inserts);

  return { error: insertError };
};

