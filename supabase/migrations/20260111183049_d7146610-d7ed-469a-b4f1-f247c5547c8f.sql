-- Update the handle_new_user trigger to read the intended role from user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  intended_role text;
  valid_role public.app_role;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name'
  );

  -- Get intended role from user metadata (set during invitation)
  intended_role := NEW.raw_user_meta_data ->> 'role';
  
  -- Validate and assign role (default to 'participant' if invalid or missing)
  IF intended_role IN ('admin', 'presenter', 'participant') THEN
    valid_role := intended_role::public.app_role;
  ELSE
    valid_role := 'participant'::public.app_role;
  END IF;

  -- Assign the role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, valid_role);

  RETURN NEW;
END;
$function$;