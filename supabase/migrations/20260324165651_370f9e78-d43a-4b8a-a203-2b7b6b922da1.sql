ALTER TABLE public.phases DROP CONSTRAINT phases_number_check;
ALTER TABLE public.phases ADD CONSTRAINT phases_number_check CHECK (number >= 1 AND number <= 7);