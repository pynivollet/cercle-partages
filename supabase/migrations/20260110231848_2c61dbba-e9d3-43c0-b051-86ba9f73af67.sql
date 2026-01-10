-- Allow all authenticated users to view presenter profiles
CREATE POLICY "profiles_select_presenters" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (is_presenter = true);