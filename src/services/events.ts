import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type Event = Database["public"]["Tables"]["events"]["Row"];
type EventInsert = Database["public"]["Tables"]["events"]["Insert"];
type EventUpdate = Database["public"]["Tables"]["events"]["Update"];

// Types for RPC responses
export interface EventPresenterInfo {
  id: string;
  first_name: string | null;
  last_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  display_order?: number;
}

export interface UserRegistration {
  id: string;
  status: string;
  attendee_count: number;
  registered_at: string;
}

export interface EventDetails {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  location: string | null;
  topic: string | null;
  category: string | null;
  status: string;
  participant_limit: number | null;
  presenter_id: string | null;
  created_at: string;
  updated_at: string;
  presenter: EventPresenterInfo | null;
  presenters: EventPresenterInfo[];
  registrations_count: number;
  remaining_capacity: number | null;
  user_registration: UserRegistration | null;
}

export interface EventWithPresenter {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  location: string | null;
  topic: string | null;
  category: string | null;
  status: string;
  participant_limit: number | null;
  presenter_id: string | null;
  created_at: string;
  presenter: EventPresenterInfo | null;
}

export interface RegistrationResult {
  success: boolean;
  error?: string;
  message?: string;
  remaining_capacity?: number;
  registration?: UserRegistration;
}

// =============================================================================
// PUBLIC RPC-BASED FUNCTIONS (No direct table access)
// =============================================================================

/**
 * Get published events list via RPC
 */
export const getPublishedEvents = async (): Promise<{ data: EventWithPresenter[] | null; error: Error | null }> => {
  const { data, error } = await supabase.rpc("get_published_events");

  if (error) {
    return { data: null, error };
  }

  // Cast through unknown to handle Supabase's generic Json type
  return { data: (data as unknown) as EventWithPresenter[] | null, error: null };
};

/**
 * Get upcoming events (future published events) via RPC
 */
export const getUpcomingEvents = async (): Promise<{ data: EventWithPresenter[] | null; error: Error | null }> => {
  const { data, error } = await supabase.rpc("get_upcoming_events");

  if (error) {
    return { data: null, error };
  }

  return { data: (data as unknown) as EventWithPresenter[] | null, error: null };
};

/**
 * Get past/completed events via RPC
 */
export const getPastEvents = async (): Promise<{ data: EventWithPresenter[] | null; error: Error | null }> => {
  const { data, error } = await supabase.rpc("get_past_events");

  if (error) {
    return { data: null, error };
  }

  return { data: (data as unknown) as EventWithPresenter[] | null, error: null };
};

/**
 * Get complete event details via RPC
 * Includes presenter info, registration count, capacity, and user's registration
 */
export const getEventById = async (id: string): Promise<{ data: EventDetails | null; error: Error | null }> => {
  const { data, error } = await supabase.rpc("get_event_details", { event_uuid: id });

  if (error) {
    return { data: null, error };
  }

  return { data: (data as unknown) as EventDetails | null, error: null };
};

/**
 * Register for an event via RPC
 * Handles capacity checking and race conditions at the database level
 */
export const registerForEvent = async (
  eventId: string,
  attendeeCount: number = 1,
): Promise<{ data: UserRegistration | null; error: Error | null; capacityError?: boolean }> => {
  const { data, error } = await supabase.rpc("register_for_event", {
    event_uuid: eventId,
    attendee_count: attendeeCount,
  });

  if (error) {
    return { data: null, error };
  }

  const result = (data as unknown) as RegistrationResult;

  if (!result.success) {
    return {
      data: null,
      error: new Error(result.message || "Erreur lors de l'inscription"),
      capacityError: result.error === "CAPACITY_EXCEEDED",
    };
  }

  return { data: result.registration || null, error: null };
};

/**
 * Cancel event registration via RPC
 */
export const cancelRegistration = async (eventId: string): Promise<{ error: Error | null }> => {
  const { data, error } = await supabase.rpc("cancel_event_registration", {
    event_uuid: eventId,
  });

  if (error) {
    return { error };
  }

  const result = data as { success: boolean; error?: string; message?: string };

  if (!result.success) {
    return { error: new Error(result.message || "Erreur lors de l'annulation") };
  }

  return { error: null };
};

// =============================================================================
// ADMIN-ONLY FUNCTIONS (Direct table access - protected by RLS)
// =============================================================================

/**
 * Get all events (admin only - for event management)
 */
export const getAllEvents = async (): Promise<{ data: Event[] | null; error: Error | null }> => {
  const { data, error } = await supabase.from("events").select("*").order("event_date", { ascending: false });

  return { data, error };
};

/**
 * Create a new event (admin only)
 */
export const createEvent = async (event: EventInsert): Promise<{ data: Event | null; error: Error | null }> => {
  const { data, error } = await supabase.from("events").insert(event).select().single();

  return { data, error };
};

/**
 * Update an event (admin only)
 */
export const updateEvent = async (
  id: string,
  updates: EventUpdate,
): Promise<{ data: Event | null; error: Error | null }> => {
  const { data, error } = await supabase.from("events").update(updates).eq("id", id).select().single();

  return { data, error };
};

/**
 * Delete an event (admin only)
 */
export const deleteEvent = async (id: string): Promise<{ error: Error | null }> => {
  const { error } = await supabase.from("events").delete().eq("id", id);

  return { error };
};
