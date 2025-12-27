-- Add attendee_count column to event_registrations
ALTER TABLE public.event_registrations 
ADD COLUMN attendee_count integer NOT NULL DEFAULT 1;

-- Add constraint to ensure attendee_count is between 1 and 6
ALTER TABLE public.event_registrations 
ADD CONSTRAINT event_registrations_attendee_count_check 
CHECK (attendee_count >= 1 AND attendee_count <= 6);