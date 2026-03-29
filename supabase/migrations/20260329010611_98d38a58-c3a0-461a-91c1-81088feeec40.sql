
-- Add format and total_clubs to competitions
ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS total_clubs integer DEFAULT 32;
ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS format text DEFAULT 'Grupo + Mata-mata';

-- Allow site admin to insert/delete phases
CREATE POLICY "Site admin can insert phases" ON public.phases
FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.email = 'brunomarkman@gmail.com'));

CREATE POLICY "Site admin can delete phases" ON public.phases
FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.email = 'brunomarkman@gmail.com'));
