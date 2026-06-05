
DROP POLICY IF EXISTS "Profiles viewable by authenticated" ON public.profiles;

CREATE POLICY "Profiles viewable by self admin or shared bolao"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.is_admin = true
    )
    OR EXISTS (
      SELECT 1
      FROM public.bolao_participants bp_me
      JOIN public.bolao_participants bp_other ON bp_other.bolao_id = bp_me.bolao_id
      WHERE bp_me.user_id = auth.uid() AND bp_other.user_id = profiles.user_id
    )
    OR EXISTS (
      SELECT 1 FROM public.boloes b
      JOIN public.bolao_participants bp ON bp.bolao_id = b.id
      WHERE b.created_by = auth.uid() AND bp.user_id = profiles.user_id
    )
    OR EXISTS (
      SELECT 1 FROM public.boloes b
      JOIN public.bolao_participants bp ON bp.bolao_id = b.id
      WHERE b.created_by = profiles.user_id AND bp.user_id = auth.uid()
    )
  );
