-- Update get_event_details to include video_url in the response
CREATE OR REPLACE FUNCTION public.get_event_details(event_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  event_row events%ROWTYPE;
  presenter_data jsonb;
  presenters_data jsonb;
  total_registrations integer;
  remaining_cap integer;
  user_reg jsonb;
  current_user_id uuid;
BEGIN
  -- Get the current user id (may be null for anonymous)
  current_user_id := auth.uid();

  -- Fetch the event (respecting visibility: only published/completed for non-admins)
  SELECT * INTO event_row
  FROM events
  WHERE id = event_uuid
    AND (
      status IN ('published', 'completed')
      OR has_role(current_user_id, 'admin')
    );

  IF event_row.id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Get legacy presenter (from presenter_id column) if exists
  IF event_row.presenter_id IS NOT NULL THEN
    SELECT jsonb_build_object(
      'id', p.id,
      'first_name', p.first_name,
      'last_name', p.last_name,
      'bio', p.bio,
      'avatar_url', p.avatar_url
    ) INTO presenter_data
    FROM profiles p
    WHERE p.id = event_row.presenter_id;
  ELSE
    presenter_data := NULL;
  END IF;

  -- Get all presenters from event_presenters junction table
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'first_name', p.first_name,
      'last_name', p.last_name,
      'bio', p.bio,
      'avatar_url', p.avatar_url,
      'display_order', ep.display_order
    ) ORDER BY ep.display_order
  ), '[]'::jsonb) INTO presenters_data
  FROM event_presenters ep
  JOIN profiles p ON p.id = ep.presenter_id
  WHERE ep.event_id = event_uuid;

  -- Get total registration count (sum of attendee_count for confirmed registrations)
  SELECT COALESCE(SUM(attendee_count)::integer, 0) INTO total_registrations
  FROM event_registrations
  WHERE event_id = event_uuid
    AND status = 'confirmed';

  -- Calculate remaining capacity
  IF event_row.participant_limit IS NOT NULL THEN
    remaining_cap := GREATEST(0, event_row.participant_limit - total_registrations);
  ELSE
    remaining_cap := NULL; -- No limit
  END IF;

  -- Get current user's registration if authenticated
  IF current_user_id IS NOT NULL THEN
    SELECT jsonb_build_object(
      'id', er.id,
      'status', er.status,
      'attendee_count', er.attendee_count,
      'registered_at', er.registered_at
    ) INTO user_reg
    FROM event_registrations er
    WHERE er.event_id = event_uuid
      AND er.user_id = current_user_id
      AND er.status != 'cancelled';
  ELSE
    user_reg := NULL;
  END IF;

  -- Build the result (now includes video_url)
  result := jsonb_build_object(
    'id', event_row.id,
    'title', event_row.title,
    'description', event_row.description,
    'event_date', event_row.event_date,
    'location', event_row.location,
    'topic', event_row.topic,
    'category', event_row.category,
    'status', event_row.status,
    'participant_limit', event_row.participant_limit,
    'presenter_id', event_row.presenter_id,
    'image_url', event_row.image_url,
    'video_url', event_row.video_url,
    'created_at', event_row.created_at,
    'updated_at', event_row.updated_at,
    'presenter', presenter_data,
    'presenters', presenters_data,
    'registrations_count', total_registrations,
    'remaining_capacity', remaining_cap,
    'user_registration', user_reg
  );

  RETURN result;
END;
$function$;