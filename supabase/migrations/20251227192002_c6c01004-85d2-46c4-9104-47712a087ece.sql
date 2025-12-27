-- Function to mark invitation as used when a user signs up
CREATE OR REPLACE FUNCTION public.mark_invitation_used()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  invitation_token_value text;
BEGIN
  -- Get the invitation token from user metadata
  invitation_token_value := NEW.raw_user_meta_data ->> 'invitation_token';
  
  -- If there's an invitation token, mark it as used
  IF invitation_token_value IS NOT NULL AND invitation_token_value != '' THEN
    UPDATE invitations
    SET 
      status = 'used',
      used_by = NEW.id,
      used_at = NOW()
    WHERE token = invitation_token_value
      AND status = 'pending';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to run after user email is confirmed
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
  EXECUTE FUNCTION public.mark_invitation_used();