-- Add file type validation for avatars bucket
-- Only allow image files (jpeg, png, gif, webp)

-- Drop existing policies if they exist to recreate with better restrictions
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete avatars" ON storage.objects;

-- Recreate policies with file type validation
CREATE POLICY "Avatar images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'avatars');

CREATE POLICY "Admins can upload image avatars only" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'avatars' 
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
  AND (
    LOWER(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'gif', 'webp')
  )
);

CREATE POLICY "Admins can update avatars" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'avatars' 
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "Admins can delete avatars" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'avatars' 
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);