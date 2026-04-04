
-- Allow bolão creators to insert messages for their bolão
CREATE POLICY "Bolao creator can insert messages"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by
  AND bolao_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.boloes
    WHERE boloes.id = messages.bolao_id
    AND boloes.created_by = auth.uid()
  )
);

-- Allow bolão creators to delete messages for their bolão
CREATE POLICY "Bolao creator can delete messages"
ON public.messages
FOR DELETE
TO authenticated
USING (
  bolao_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.boloes
    WHERE boloes.id = messages.bolao_id
    AND boloes.created_by = auth.uid()
  )
);

-- Allow bolão creators to insert payments for their bolão
CREATE POLICY "Bolao creator can insert payments"
ON public.payments
FOR INSERT
TO authenticated
WITH CHECK (
  bolao_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.boloes
    WHERE boloes.id = payments.bolao_id
    AND boloes.created_by = auth.uid()
  )
);

-- Allow bolão creators to delete payments for their bolão
CREATE POLICY "Bolao creator can delete payments"
ON public.payments
FOR DELETE
TO authenticated
USING (
  bolao_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.boloes
    WHERE boloes.id = payments.bolao_id
    AND boloes.created_by = auth.uid()
  )
);
