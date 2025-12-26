-- Allow admins to insert presenter profiles
CREATE POLICY "Admins can insert presenter profiles"
ON public.profiles
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) AND is_presenter = true
);

-- Allow admins to update presenter profiles
CREATE POLICY "Admins can update presenter profiles"
ON public.profiles
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role)
);