import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type Event = Database["public"]["Tables"]["events"]["Row"];
type EventInsert = Database["public"]["Tables"]["events"]["Insert"];
type EventUpdate = Database["public"]["Tables"]["events"]["Update"];
type EventRegistration = Database["public"]["Tables"]["event_registrations"]["Row"];

export interface EventWithPresenter extends Event {
  presenter?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    bio: string | null;
    professional_background: string | null;
    avatar_url: string | null;
  } | null;
  registrations_count?: number;
  user_registration?: EventRegistration | null;
}

export const getPublishedEvents = async (): Promise<{ data: EventWithPresenter[] | null; error: Error | null }> => {
  const { data, error } = await supabase
    .from("events")
    .select(`
      *,
      presenter:profiles!events_presenter_id_fkey(
        id,
        first_name,
        last_name,
        bio,
        professional_background,
        avatar_url
      )
    `)
    .in("status", ["published", "completed"])
    .order("event_date", { ascending: true });

  return { data, error };
};

export const getUpcomingEvents = async (): Promise<{ data: EventWithPresenter[] | null; error: Error | null }> => {
  const { data, error } = await supabase
    .from("events")
    .select(`
      *,
      presenter:profiles!events_presenter_id_fkey(
        id,
        first_name,
        last_name,
        bio,
        professional_background,
        avatar_url
      )
    `)
    .eq("status", "published")
    .gte("event_date", new Date().toISOString())
    .order("event_date", { ascending: true });

  return { data, error };
};

export const getPastEvents = async (): Promise<{ data: EventWithPresenter[] | null; error: Error | null }> => {
  const { data, error } = await supabase
    .from("events")
    .select(`
      *,
      presenter:profiles!events_presenter_id_fkey(
        id,
        first_name,
        last_name,
        bio,
        professional_background,
        avatar_url
      )
    `)
    .eq("status", "completed")
    .order("event_date", { ascending: false });

  return { data, error };
};

export const getEventById = async (id: string, userId?: string): Promise<{ data: EventWithPresenter | null; error: Error | null }> => {
  const { data: event, error } = await supabase
    .from("events")
    .select(`
      *,
      presenter:profiles!events_presenter_id_fkey(
        id,
        first_name,
        last_name,
        bio,
        professional_background,
        avatar_url
      )
    `)
    .eq("id", id)
    .single();

  if (error || !event) {
    return { data: null, error };
  }

  // Get total attendee count (sum of attendee_count for confirmed registrations)
  const { data: registrations } = await supabase
    .from("event_registrations")
    .select("attendee_count")
    .eq("event_id", id)
    .eq("status", "confirmed");

  const totalAttendees = registrations?.reduce((sum, reg) => sum + (reg.attendee_count || 1), 0) ?? 0;

  // Get user's registration if logged in
  let userRegistration = null;
  if (userId) {
    const { data: reg } = await supabase
      .from("event_registrations")
      .select("*")
      .eq("event_id", id)
      .eq("user_id", userId)
      .neq("status", "cancelled")
      .single();
    userRegistration = reg;
  }

  return {
    data: {
      ...event,
      registrations_count: totalAttendees,
      user_registration: userRegistration,
    },
    error: null,
  };
};

export const getAllEvents = async (): Promise<{ data: Event[] | null; error: Error | null }> => {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("event_date", { ascending: false });

  return { data, error };
};

export const createEvent = async (event: EventInsert): Promise<{ data: Event | null; error: Error | null }> => {
  const { data, error } = await supabase
    .from("events")
    .insert(event)
    .select()
    .single();

  return { data, error };
};

export const updateEvent = async (id: string, updates: EventUpdate): Promise<{ data: Event | null; error: Error | null }> => {
  const { data, error } = await supabase
    .from("events")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  return { data, error };
};

export const registerForEvent = async (eventId: string, userId: string, attendeeCount: number = 1): Promise<{ data: EventRegistration | null; error: Error | null; capacityError?: boolean }> => {
  // First, check current capacity
  const { data: event } = await supabase
    .from("events")
    .select("participant_limit")
    .eq("id", eventId)
    .single();

  if (event?.participant_limit) {
    // Get current total attendees (excluding cancelled and user's own existing registration)
    const { data: registrations } = await supabase
      .from("event_registrations")
      .select("attendee_count, user_id")
      .eq("event_id", eventId)
      .eq("status", "confirmed");

    const currentTotal = registrations?.reduce((sum, reg) => {
      // Don't count user's own existing registration (they might be updating)
      if (reg.user_id === userId) return sum;
      return sum + (reg.attendee_count || 1);
    }, 0) ?? 0;

    const remainingCapacity = event.participant_limit - currentTotal;

    if (attendeeCount > remainingCapacity) {
      return { 
        data: null, 
        error: new Error(`Capacité insuffisante. Il reste ${remainingCapacity} place${remainingCapacity > 1 ? 's' : ''}.`),
        capacityError: true
      };
    }
  }

  // Check if a registration already exists (cancelled or other)
  const { data: existing } = await supabase
    .from("event_registrations")
    .select("*")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    // Reactivate existing registration with updated attendee count
    const { data, error } = await supabase
      .from("event_registrations")
      .update({ status: "confirmed", attendee_count: attendeeCount })
      .eq("id", existing.id)
      .select()
      .single();
    return { data, error };
  }

  // Otherwise, create a new registration
  const { data, error } = await supabase
    .from("event_registrations")
    .insert({
      event_id: eventId,
      user_id: userId,
      attendee_count: attendeeCount,
    })
    .select()
    .single();

  return { data, error };
};

export const cancelRegistration = async (eventId: string, userId: string): Promise<{ error: Error | null }> => {
  const { error } = await supabase
    .from("event_registrations")
    .update({ status: "cancelled" })
    .eq("event_id", eventId)
    .eq("user_id", userId);

  return { error };
};
