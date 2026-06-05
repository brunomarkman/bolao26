
-- Tighten profiles self-update: prevent escalating is_admin via WITH CHECK
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND is_admin = (SELECT p.is_admin FROM public.profiles p WHERE p.user_id = auth.uid())
  );

-- Tighten boloes SELECT: only creator, participants, or admins
DROP POLICY IF EXISTS "Boloes viewable by authenticated" ON public.boloes;
CREATE POLICY "Boloes viewable by creator participants or admin"
  ON public.boloes FOR SELECT TO authenticated
  USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM public.bolao_participants bp
      WHERE bp.bolao_id = boloes.id AND bp.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.is_admin = true
    )
  );
