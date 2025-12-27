-- Créer les profils des intervenants (avec un user_id temporaire car ce sont des intervenants externes)
INSERT INTO public.profiles (user_id, email, first_name, last_name, is_presenter)
VALUES 
  (gen_random_uuid(), 'pierre.dhonte@cercle.local', 'Pierre', 'Dhonte', true),
  (gen_random_uuid(), 'sylvestre.clancier@cercle.local', 'Sylvestre', 'Clancier', true),
  (gen_random_uuid(), 'salim.matta@cercle.local', 'Salim', 'Matta', true),
  (gen_random_uuid(), 'anne.sloukgi@cercle.local', 'Anne', 'Sloukgi', true);

-- Créer les événements
INSERT INTO public.events (title, event_date, category, status)
VALUES 
  ('L''UE a-t-elle le budget d''une grande puissance ?', '2025-03-15 19:00:00+01', 'geopolitique', 'draft'),
  ('Le Pen Club, acteur de la défense des écrivains persécutés du fait de leurs écrits', '2025-11-15 19:00:00+01', 'geopolitique', 'draft'),
  ('Pays en guerre : le Liban quotidien face aux enjeux géopolitiques régionaux', '2025-04-15 19:00:00+01', 'geopolitique', 'draft');

-- Lier les intervenants aux événements
INSERT INTO public.event_presenters (event_id, presenter_id, display_order)
SELECT e.id, p.id, 0
FROM events e, profiles p
WHERE e.title = 'L''UE a-t-elle le budget d''une grande puissance ?'
AND p.last_name = 'Dhonte';

INSERT INTO public.event_presenters (event_id, presenter_id, display_order)
SELECT e.id, p.id, 0
FROM events e, profiles p
WHERE e.title = 'Le Pen Club, acteur de la défense des écrivains persécutés du fait de leurs écrits'
AND p.last_name = 'Clancier';

INSERT INTO public.event_presenters (event_id, presenter_id, display_order)
SELECT e.id, p.id, 0
FROM events e, profiles p
WHERE e.title = 'Pays en guerre : le Liban quotidien face aux enjeux géopolitiques régionaux'
AND p.last_name = 'Matta';

INSERT INTO public.event_presenters (event_id, presenter_id, display_order)
SELECT e.id, p.id, 1
FROM events e, profiles p
WHERE e.title = 'Pays en guerre : le Liban quotidien face aux enjeux géopolitiques régionaux'
AND p.last_name = 'Sloukgi';