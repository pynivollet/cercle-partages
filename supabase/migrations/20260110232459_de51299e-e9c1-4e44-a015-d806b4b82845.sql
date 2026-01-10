-- Add video_url column to events table
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Create storage bucket for event videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-videos', 'event-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to event videos
CREATE POLICY "Public read access for event videos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'event-videos');

-- Allow admin users to upload videos
CREATE POLICY "Admin users can upload event videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'event-videos'
  AND public.has_role(auth.uid(), 'admin')
);

-- Allow admin users to update videos
CREATE POLICY "Admin users can update event videos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'event-videos'
  AND public.has_role(auth.uid(), 'admin')
);

-- Allow admin users to delete videos
CREATE POLICY "Admin users can delete event videos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'event-videos'
  AND public.has_role(auth.uid(), 'admin')
);