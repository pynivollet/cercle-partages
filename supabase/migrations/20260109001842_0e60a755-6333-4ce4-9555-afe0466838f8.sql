-- 1. Renforcer les politiques RLS de user_roles pour empêcher l'auto-modification
-- Supprimer l'ancienne politique d'update admin
DROP POLICY IF EXISTS "user_roles_admin_update" ON public.user_roles;

-- Créer une nouvelle politique qui empêche un admin de modifier son propre rôle
CREATE POLICY "user_roles_admin_update_no_self" 
ON public.user_roles 
FOR UPDATE 
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND user_id != auth.uid()
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  AND user_id != auth.uid()
);

-- 2. Mettre à jour la politique de suppression pour empêcher l'auto-suppression
DROP POLICY IF EXISTS "user_roles_admin_delete" ON public.user_roles;

CREATE POLICY "user_roles_admin_delete_no_self" 
ON public.user_roles 
FOR DELETE 
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND user_id != auth.uid()
);

-- 3. Renforcer la politique RLS du bucket avatars pour vérifier le content-type
DROP POLICY IF EXISTS "avatars_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "avatars_insert_policy" ON storage.objects;

-- Politique d'insertion avec vérification du content-type image
CREATE POLICY "avatars_insert_admin_images_only" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND has_role(auth.uid(), 'admin'::app_role)
  AND (
    storage.extension(name) IN ('jpg', 'jpeg', 'png', 'gif', 'webp')
    OR (metadata->>'mimetype')::text LIKE 'image/%'
  )
);

-- Politique de mise à jour avec vérification du content-type image
CREATE POLICY "avatars_update_admin_images_only" 
ON storage.objects 
FOR UPDATE 
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  bucket_id = 'avatars' 
  AND has_role(auth.uid(), 'admin'::app_role)
  AND (
    storage.extension(name) IN ('jpg', 'jpeg', 'png', 'gif', 'webp')
    OR (metadata->>'mimetype')::text LIKE 'image/%'
  )
);