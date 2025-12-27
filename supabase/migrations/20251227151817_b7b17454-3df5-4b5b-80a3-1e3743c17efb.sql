-- Create storage bucket for event documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-documents', 'event-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to read documents
CREATE POLICY "Authenticated users can view event documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-documents' AND auth.role() = 'authenticated');

-- Allow admins to upload documents
CREATE POLICY "Admins can upload event documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'event-documents' 
  AND (SELECT has_role(auth.uid(), 'admin'))
);

-- Allow admins to update documents
CREATE POLICY "Admins can update event documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'event-documents' 
  AND (SELECT has_role(auth.uid(), 'admin'))
);

-- Allow admins to delete documents
CREATE POLICY "Admins can delete event documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'event-documents' 
  AND (SELECT has_role(auth.uid(), 'admin'))
);

-- Create table for event documents metadata
CREATE TABLE public.event_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.event_documents ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view documents for published/completed events
CREATE POLICY "Authenticated users can view event documents"
ON public.event_documents FOR SELECT
USING (
  is_authenticated() 
  AND EXISTS (
    SELECT 1 FROM public.events 
    WHERE id = event_id 
    AND status IN ('published', 'completed')
  )
);

-- Admins can view all documents
CREATE POLICY "Admins can view all event documents"
ON public.event_documents FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Admins can manage documents
CREATE POLICY "Admins can manage event documents"
ON public.event_documents FOR ALL
USING (has_role(auth.uid(), 'admin'));