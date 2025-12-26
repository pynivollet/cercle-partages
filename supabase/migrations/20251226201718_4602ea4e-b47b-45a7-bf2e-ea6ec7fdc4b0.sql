-- Allow standalone presenter profiles: remove FK that forces profiles.user_id to exist in auth/public users table
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;
