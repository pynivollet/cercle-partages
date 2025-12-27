-- Create junction table for many-to-many relationship between events and presenters
CREATE TABLE public.event_presenters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  presenter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, presenter_id)
);

-- Enable RLS
ALTER TABLE public.event_presenters ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view event presenters for published/completed events
CREATE POLICY "Authenticated users can view event presenters"
ON public.event_presenters FOR SELECT
USING (
  is_authenticated() 
  AND EXISTS (
    SELECT 1 FROM public.events 
    WHERE id = event_id 
    AND status IN ('published', 'completed')
  )
);

-- Admins can view all event presenters
CREATE POLICY "Admins can view all event presenters"
ON public.event_presenters FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Admins can manage event presenters
CREATE POLICY "Admins can manage event presenters"
ON public.event_presenters FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Migrate existing presenter_id data to the new junction table
INSERT INTO public.event_presenters (event_id, presenter_id, display_order)
SELECT id, presenter_id, 0
FROM public.events
WHERE presenter_id IS NOT NULL;