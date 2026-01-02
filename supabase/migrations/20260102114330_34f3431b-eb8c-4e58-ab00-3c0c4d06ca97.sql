-- =============================================================================
-- PRODUCTION-READY RPC FUNCTIONS FOR SECURE EVENT MANAGEMENT
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. RPC: get_event_details
-- Returns complete event data with presenter, registration count, capacity, and user registration
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_event_details(event_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Build the result
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
$$;

-- Grant execute to authenticated users and anon (for public event viewing)
GRANT EXECUTE ON FUNCTION public.get_event_details(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_event_details(uuid) TO anon;

-- -----------------------------------------------------------------------------
-- 2. RPC: register_for_event
-- Atomic registration with locking to prevent race conditions
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.register_for_event(event_uuid uuid, attendee_count integer DEFAULT 1)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  event_row events%ROWTYPE;
  current_registrations integer;
  remaining_cap integer;
  existing_reg event_registrations%ROWTYPE;
  new_reg event_registrations%ROWTYPE;
  result jsonb;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'NOT_AUTHENTICATED',
      'message', 'Vous devez être connecté pour vous inscrire.'
    );
  END IF;

  -- Validate attendee count (1-6 allowed)
  IF attendee_count < 1 OR attendee_count > 6 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_ATTENDEE_COUNT',
      'message', 'Le nombre de participants doit être entre 1 et 6.'
    );
  END IF;

  -- Lock the event row to prevent race conditions
  SELECT * INTO event_row
  FROM events
  WHERE id = event_uuid
  FOR UPDATE;

  IF event_row.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'EVENT_NOT_FOUND',
      'message', 'Événement non trouvé.'
    );
  END IF;

  -- Check event is published
  IF event_row.status != 'published' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'EVENT_NOT_AVAILABLE',
      'message', 'Cet événement n''est pas ouvert aux inscriptions.'
    );
  END IF;

  -- Check event is in the future
  IF event_row.event_date < NOW() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'EVENT_PASSED',
      'message', 'Cet événement est déjà passé.'
    );
  END IF;

  -- Check capacity if limit exists
  IF event_row.participant_limit IS NOT NULL THEN
    SELECT COALESCE(SUM(er.attendee_count)::integer, 0) INTO current_registrations
    FROM event_registrations er
    WHERE er.event_id = event_uuid
      AND er.status = 'confirmed'
      AND er.user_id != current_user_id; -- Exclude current user's existing registration

    remaining_cap := event_row.participant_limit - current_registrations;

    IF attendee_count > remaining_cap THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'CAPACITY_EXCEEDED',
        'message', format('Capacité insuffisante. Il reste %s place%s.', remaining_cap, CASE WHEN remaining_cap > 1 THEN 's' ELSE '' END),
        'remaining_capacity', remaining_cap
      );
    END IF;
  END IF;

  -- Check for existing registration
  SELECT * INTO existing_reg
  FROM event_registrations
  WHERE event_id = event_uuid
    AND user_id = current_user_id;

  IF existing_reg.id IS NOT NULL THEN
    -- Update existing registration
    UPDATE event_registrations
    SET status = 'confirmed',
        attendee_count = register_for_event.attendee_count
    WHERE id = existing_reg.id
    RETURNING * INTO new_reg;
  ELSE
    -- Create new registration
    INSERT INTO event_registrations (event_id, user_id, attendee_count, status)
    VALUES (event_uuid, current_user_id, attendee_count, 'confirmed')
    RETURNING * INTO new_reg;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'registration', jsonb_build_object(
      'id', new_reg.id,
      'status', new_reg.status,
      'attendee_count', new_reg.attendee_count,
      'registered_at', new_reg.registered_at
    )
  );
END;
$$;

-- Grant execute only to authenticated users
GRANT EXECUTE ON FUNCTION public.register_for_event(uuid, integer) TO authenticated;

-- -----------------------------------------------------------------------------
-- 3. RPC: cancel_event_registration
-- Cancels the current user's registration for an event
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_event_registration(event_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  existing_reg event_registrations%ROWTYPE;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'NOT_AUTHENTICATED',
      'message', 'Vous devez être connecté pour annuler une inscription.'
    );
  END IF;

  -- Find existing registration
  SELECT * INTO existing_reg
  FROM event_registrations
  WHERE event_id = event_uuid
    AND user_id = current_user_id
    AND status != 'cancelled';

  IF existing_reg.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'REGISTRATION_NOT_FOUND',
      'message', 'Aucune inscription trouvée pour cet événement.'
    );
  END IF;

  -- Cancel the registration
  UPDATE event_registrations
  SET status = 'cancelled'
  WHERE id = existing_reg.id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Inscription annulée avec succès.'
  );
END;
$$;

-- Grant execute only to authenticated users
GRANT EXECUTE ON FUNCTION public.cancel_event_registration(uuid) TO authenticated;

-- -----------------------------------------------------------------------------
-- 4. RPC: get_published_events
-- Returns list of published/completed events with presenter info
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_published_events()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', e.id,
      'title', e.title,
      'description', e.description,
      'event_date', e.event_date,
      'location', e.location,
      'topic', e.topic,
      'category', e.category,
      'status', e.status,
      'participant_limit', e.participant_limit,
      'presenter_id', e.presenter_id,
      'created_at', e.created_at,
      'presenter', CASE 
        WHEN p.id IS NOT NULL THEN jsonb_build_object(
          'id', p.id,
          'first_name', p.first_name,
          'last_name', p.last_name,
          'bio', p.bio,
          'avatar_url', p.avatar_url
        )
        ELSE NULL
      END
    ) ORDER BY e.event_date ASC
  ), '[]'::jsonb) INTO result
  FROM events e
  LEFT JOIN profiles p ON p.id = e.presenter_id
  WHERE e.status IN ('published', 'completed');

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_published_events() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_published_events() TO anon;

-- -----------------------------------------------------------------------------
-- 5. RPC: get_upcoming_events
-- Returns only future published events
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_upcoming_events()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', e.id,
      'title', e.title,
      'description', e.description,
      'event_date', e.event_date,
      'location', e.location,
      'topic', e.topic,
      'category', e.category,
      'status', e.status,
      'participant_limit', e.participant_limit,
      'presenter_id', e.presenter_id,
      'presenter', CASE 
        WHEN p.id IS NOT NULL THEN jsonb_build_object(
          'id', p.id,
          'first_name', p.first_name,
          'last_name', p.last_name,
          'bio', p.bio,
          'avatar_url', p.avatar_url
        )
        ELSE NULL
      END
    ) ORDER BY e.event_date ASC
  ), '[]'::jsonb) INTO result
  FROM events e
  LEFT JOIN profiles p ON p.id = e.presenter_id
  WHERE e.status = 'published'
    AND e.event_date >= NOW();

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_upcoming_events() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_upcoming_events() TO anon;

-- -----------------------------------------------------------------------------
-- 6. RPC: get_past_events
-- Returns completed events
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_past_events()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', e.id,
      'title', e.title,
      'description', e.description,
      'event_date', e.event_date,
      'location', e.location,
      'topic', e.topic,
      'category', e.category,
      'status', e.status,
      'participant_limit', e.participant_limit,
      'presenter_id', e.presenter_id,
      'presenter', CASE 
        WHEN p.id IS NOT NULL THEN jsonb_build_object(
          'id', p.id,
          'first_name', p.first_name,
          'last_name', p.last_name,
          'bio', p.bio,
          'avatar_url', p.avatar_url
        )
        ELSE NULL
      END
    ) ORDER BY e.event_date DESC
  ), '[]'::jsonb) INTO result
  FROM events e
  LEFT JOIN profiles p ON p.id = e.presenter_id
  WHERE e.status = 'completed';

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_past_events() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_past_events() TO anon;

-- -----------------------------------------------------------------------------
-- 7. RPC: get_event_presenters
-- Returns presenters for a specific event
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_event_presenters(event_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  event_visible boolean;
BEGIN
  -- Check if event is visible (published/completed or user is admin)
  SELECT EXISTS(
    SELECT 1 FROM events
    WHERE id = event_uuid
      AND (
        status IN ('published', 'completed')
        OR has_role(auth.uid(), 'admin')
      )
  ) INTO event_visible;

  IF NOT event_visible THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'first_name', p.first_name,
      'last_name', p.last_name,
      'bio', p.bio,
      'avatar_url', p.avatar_url,
      'display_order', ep.display_order
    ) ORDER BY ep.display_order
  ), '[]'::jsonb) INTO result
  FROM event_presenters ep
  JOIN profiles p ON p.id = ep.presenter_id
  WHERE ep.event_id = event_uuid;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_event_presenters(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_event_presenters(uuid) TO anon;