ALTER TABLE public.bolao_participants
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Permite que o criador do bolão atualize participantes (ativar/desativar)
DROP POLICY IF EXISTS "Bolao creator can update participants" ON public.bolao_participants;
CREATE POLICY "Bolao creator can update participants"
ON public.bolao_participants
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.boloes
    WHERE boloes.id = bolao_participants.bolao_id
      AND boloes.created_by = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.boloes
    WHERE boloes.id = bolao_participants.bolao_id
      AND boloes.created_by = auth.uid()
  )
);