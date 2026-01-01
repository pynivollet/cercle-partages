-- =============================================
-- AUDIT SÉCURITÉ RLS - PRODUCTION READY
-- =============================================

-- =============================================
-- 1. PROFILES - Sécurisation complète
-- =============================================

-- Supprimer les policies existantes
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

-- Nouvelles policies sécurisées
CREATE POLICY "profiles_select_own"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- UPDATE limité aux champs autorisés (prénom, nom, avatar, bio)
-- Note: la restriction des colonnes se fait via l'application
CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_admin_select"
ON public.profiles FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "profiles_admin_insert"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "profiles_admin_update"
ON public.profiles FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "profiles_admin_delete"
ON public.profiles FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- 2. USER_ROLES - Lecture seule pour users
-- =============================================

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

-- Users peuvent UNIQUEMENT lire leurs propres rôles
CREATE POLICY "user_roles_select_own"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins ont accès complet
CREATE POLICY "user_roles_admin_select"
ON public.user_roles FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "user_roles_admin_insert"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "user_roles_admin_update"
ON public.user_roles FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "user_roles_admin_delete"
ON public.user_roles FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- 3. EVENTS - Authentification stricte
-- =============================================

DROP POLICY IF EXISTS "Authenticated users can view published events" ON public.events;
DROP POLICY IF EXISTS "Admins can view all events" ON public.events;
DROP POLICY IF EXISTS "Admins can manage events" ON public.events;

-- Users authentifiés: SELECT uniquement published/completed
CREATE POLICY "events_select_published"
ON public.events FOR SELECT
TO authenticated
USING (status IN ('published', 'completed'));

-- Admins: accès complet
CREATE POLICY "events_admin_select"
ON public.events FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "events_admin_insert"
ON public.events FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "events_admin_update"
ON public.events FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "events_admin_delete"
ON public.events FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- 4. EVENT_REGISTRATIONS - Propriétaire strict
-- =============================================

DROP POLICY IF EXISTS "Users can view their own registrations" ON public.event_registrations;
DROP POLICY IF EXISTS "Admins can view all registrations" ON public.event_registrations;
DROP POLICY IF EXISTS "Authenticated users can register for events" ON public.event_registrations;
DROP POLICY IF EXISTS "Users can cancel their own registration" ON public.event_registrations;
DROP POLICY IF EXISTS "Users can delete their own registration" ON public.event_registrations;

-- Users: CRUD sur leurs propres inscriptions uniquement
CREATE POLICY "registrations_select_own"
ON public.event_registrations FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "registrations_insert_own"
ON public.event_registrations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "registrations_update_own"
ON public.event_registrations FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "registrations_delete_own"
ON public.event_registrations FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Admins: accès complet
CREATE POLICY "registrations_admin_select"
ON public.event_registrations FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "registrations_admin_insert"
ON public.event_registrations FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "registrations_admin_update"
ON public.event_registrations FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "registrations_admin_delete"
ON public.event_registrations FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- 5. EVENT_PRESENTERS - Lecture authentifiée
-- =============================================

DROP POLICY IF EXISTS "Authenticated users can view event presenters" ON public.event_presenters;
DROP POLICY IF EXISTS "Admins can view all event presenters" ON public.event_presenters;
DROP POLICY IF EXISTS "Admins can manage event presenters" ON public.event_presenters;

-- Users authentifiés: SELECT sur events published/completed
CREATE POLICY "event_presenters_select_published"
ON public.event_presenters FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = event_presenters.event_id
    AND events.status IN ('published', 'completed')
  )
);

-- Admins: accès complet
CREATE POLICY "event_presenters_admin_select"
ON public.event_presenters FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "event_presenters_admin_insert"
ON public.event_presenters FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "event_presenters_admin_update"
ON public.event_presenters FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "event_presenters_admin_delete"
ON public.event_presenters FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- 6. EVENT_DOCUMENTS - Lecture authentifiée
-- =============================================

DROP POLICY IF EXISTS "Authenticated users can view event documents" ON public.event_documents;
DROP POLICY IF EXISTS "Admins can view all event documents" ON public.event_documents;
DROP POLICY IF EXISTS "Admins can manage event documents" ON public.event_documents;

-- Users authentifiés: SELECT sur events published/completed
CREATE POLICY "event_documents_select_published"
ON public.event_documents FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = event_documents.event_id
    AND events.status IN ('published', 'completed')
  )
);

-- Admins: accès complet
CREATE POLICY "event_documents_admin_select"
ON public.event_documents FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "event_documents_admin_insert"
ON public.event_documents FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "event_documents_admin_update"
ON public.event_documents FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "event_documents_admin_delete"
ON public.event_documents FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- 7. PRESENTATIONS - Lecture authentifiée
-- =============================================

DROP POLICY IF EXISTS "Authenticated users can view presentations" ON public.presentations;
DROP POLICY IF EXISTS "Admins can manage presentations" ON public.presentations;

-- Users authentifiés: SELECT uniquement
CREATE POLICY "presentations_select_authenticated"
ON public.presentations FOR SELECT
TO authenticated
USING (true);

-- Admins: accès complet
CREATE POLICY "presentations_admin_insert"
ON public.presentations FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "presentations_admin_update"
ON public.presentations FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "presentations_admin_delete"
ON public.presentations FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));