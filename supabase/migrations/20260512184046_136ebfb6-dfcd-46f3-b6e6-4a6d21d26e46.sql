-- Drop the global unique constraint on number
ALTER TABLE public.phases DROP CONSTRAINT IF EXISTS phases_number_key;

-- Add a unique constraint per competition (number can repeat across competitions, but not within the same one)
ALTER TABLE public.phases ADD CONSTRAINT phases_competition_id_number_key UNIQUE (competition_id, number);

-- Insert phase 1 for "Mini Copa" competition if it doesn't exist yet
INSERT INTO public.phases (competition_id, number, name, is_active)
SELECT 'f96e798d-54c0-4578-a532-2dc2436cceca', 1, 'Fase de Grupos', false
WHERE NOT EXISTS (
  SELECT 1 FROM public.phases WHERE competition_id = 'f96e798d-54c0-4578-a532-2dc2436cceca' AND number = 1
);