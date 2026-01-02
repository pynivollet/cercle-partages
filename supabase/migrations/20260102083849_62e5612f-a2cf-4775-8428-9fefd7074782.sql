-- Create secure RPC function to get total attendee count for an event
-- Uses SECURITY DEFINER to bypass RLS and provide consistent results
CREATE OR REPLACE FUNCTION public.get_event_registration_count(event_uuid uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    SUM(attendee_count)::integer,
    0
  )
  FROM public.event_registrations
  WHERE event_id = event_uuid
    AND status = 'confirmed'
$$;

-- Revoke all existing permissions
REVOKE ALL ON FUNCTION public.get_event_registration_count(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_event_registration_count(uuid) FROM anon;

-- Grant execute only to authenticated users
GRANT EXECUTE ON FUNCTION public.get_event_registration_count(uuid) TO authenticated;