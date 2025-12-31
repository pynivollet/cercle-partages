-- Ensure columns exist
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text;

-- Backfill first_name/last_name from full_name where needed
UPDATE public.profiles
SET
  first_name = COALESCE(first_name, NULLIF(split_part(full_name, ' ', 1), '')),
  last_name = COALESCE(
    last_name,
    NULLIF(
      btrim(
        CASE
          WHEN position(' ' in full_name) > 0 THEN substring(full_name from position(' ' in full_name) + 1)
          ELSE ''
        END
      ),
      ''
    )
  )
WHERE full_name IS NOT NULL
  AND (first_name IS NULL OR last_name IS NULL);

-- Remove full_name column
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS full_name;

-- Update handle_new_user function to stop using full_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name'
  );

  -- Assign default 'participant' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'participant');

  RETURN NEW;
END;
$function$;

-- Allow users to create their own profile row (needed for upsert when no row exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Users can insert their own profile'
  ) THEN
    CREATE POLICY "Users can insert their own profile"
    ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);
  END IF;
END $$;
