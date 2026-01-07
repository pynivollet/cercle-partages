-- Add image_url column to events table
ALTER TABLE public.events ADD COLUMN image_url text;

-- Create storage bucket for event images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('event-images', 'event-images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for event-images bucket
-- Public read access
CREATE POLICY "event_images_public_read"
ON storage.objects
FOR SELECT
USING (bucket_id = 'event-images');

-- Admin can upload
CREATE POLICY "event_images_admin_insert"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'event-images' AND has_role(auth.uid(), 'admin'::app_role));

-- Admin can update
CREATE POLICY "event_images_admin_update"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'event-images' AND has_role(auth.uid(), 'admin'::app_role));

-- Admin can delete
CREATE POLICY "event_images_admin_delete"
ON storage.objects
FOR DELETE
USING (bucket_id = 'event-images' AND has_role(auth.uid(), 'admin'::app_role));