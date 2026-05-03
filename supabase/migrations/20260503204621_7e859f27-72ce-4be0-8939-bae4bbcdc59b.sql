CREATE POLICY "Bolao participants can insert messages"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by
  AND bolao_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.bolao_participants bp
    WHERE bp.bolao_id = messages.bolao_id
      AND bp.user_id = auth.uid()
      AND bp.is_active = true
  )
);