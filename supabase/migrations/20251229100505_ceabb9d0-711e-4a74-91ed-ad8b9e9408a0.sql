-- =====================================================
-- Migration: Refactor to native Supabase Auth
-- =====================================================

-- 1. Drop old triggers on auth.users first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;

-- 2. Drop old functions with CASCADE
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.mark_invitation_used() CASCADE;
DROP FUNCTION IF EXISTS public.validate_invitation_token(text) CASCADE;

-- 3. Drop invitations table
DROP TABLE IF EXISTS public.invitations CASCADE;

-- 4. Clear orphan presenter references BEFORE dropping profiles
UPDATE public.events SET presenter_id = NULL;
DELETE FROM public.event_presenters;
UPDATE public.presentations SET presenter_id = NULL;

-- 5. Drop old profiles table (will cascade to foreign keys)
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 6. Create new profiles table with id = auth.users.id
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  is_presenter BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- 9. Create trigger function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile with full_name from metadata
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      CONCAT_WS(' ', 
        NEW.raw_user_meta_data ->> 'first_name',
        NEW.raw_user_meta_data ->> 'last_name'
      )
    )
  );
  
  -- Assign default 'participant' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'participant');
  
  RETURN NEW;
END;
$$;

-- 10. Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 11. Create updated_at trigger for profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 12. Recreate foreign keys on related tables
ALTER TABLE public.events
  ADD CONSTRAINT events_presenter_id_fkey 
  FOREIGN KEY (presenter_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.event_presenters
  ADD CONSTRAINT event_presenters_presenter_id_fkey
  FOREIGN KEY (presenter_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.presentations
  ADD CONSTRAINT presentations_presenter_id_fkey
  FOREIGN KEY (presenter_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 13. Drop the invitation_status enum
DROP TYPE IF EXISTS public.invitation_status CASCADE;

-- 14. Create profiles for existing auth users
INSERT INTO public.profiles (id, full_name)
SELECT 
  id,
  COALESCE(
    raw_user_meta_data ->> 'full_name',
    CONCAT_WS(' ', 
      raw_user_meta_data ->> 'first_name',
      raw_user_meta_data ->> 'last_name'
    )
  )
FROM auth.users
ON CONFLICT (id) DO NOTHING;