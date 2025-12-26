-- Create enum for event categories
CREATE TYPE event_category AS ENUM (
  'geopolitique',
  'enjeux_climatiques',
  'societe_violences',
  'idees_cultures_humanites',
  'arts_artistes',
  'economie_locale',
  'science_moderne'
);

-- Add category column to events table
ALTER TABLE public.events
ADD COLUMN category event_category NULL;