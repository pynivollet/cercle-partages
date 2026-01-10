-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "presentations_select_authenticated" ON public.presentations;

-- Create a new policy that restricts access to presentations linked to published/completed events
-- Admins already have full access via presentations_admin_* policies
CREATE POLICY "presentations_select_published_events" 
ON public.presentations 
FOR SELECT 
TO authenticated
USING (
  -- Allow if the presentation is linked to a published or completed event
  EXISTS (
    SELECT 1 
    FROM public.events 
    WHERE events.id = presentations.event_id 
    AND events.status IN ('published', 'completed')
  )
  -- Or if the presentation has no event_id (standalone presentation - shouldn't happen but safe fallback)
  OR event_id IS NULL
);

-- Add admin select policy if it doesn't exist (for viewing all presentations including draft events)
DROP POLICY IF EXISTS "presentations_admin_select" ON public.presentations;

CREATE POLICY "presentations_admin_select" 
ON public.presentations 
FOR SELECT 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));