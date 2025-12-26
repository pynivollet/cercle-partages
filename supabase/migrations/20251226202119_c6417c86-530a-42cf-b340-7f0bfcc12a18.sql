-- Remove the overly permissive policy that exposes all invitations
DROP POLICY IF EXISTS "Anyone can validate invitation by token" ON public.invitations;

-- Create a security definer function to safely validate invitation tokens
-- This function only returns the specific invitation matching the token, not all invitations
CREATE OR REPLACE FUNCTION public.validate_invitation_token(invitation_token TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT,
  role app_role,
  status invitation_status,
  expires_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    email,
    role,
    status,
    expires_at
  FROM public.invitations
  WHERE token = invitation_token
    AND status = 'pending'
    AND expires_at > now()
  LIMIT 1;
$$;