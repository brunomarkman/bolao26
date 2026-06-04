
-- 1. Remove anon SELECT on profiles (email exposure)
DROP POLICY IF EXISTS "Profiles viewable by anon" ON public.profiles;

-- 2. Remove broad anon SELECT on boloes (invite code exposure) — invite preview now via edge function
DROP POLICY IF EXISTS "Boloes viewable by anon for invites" ON public.boloes;

-- 3. Restrict payments SELECT
DROP POLICY IF EXISTS "Payments viewable by authenticated" ON public.payments;
CREATE POLICY "Payments viewable by bolao participants or creator"
  ON public.payments FOR SELECT TO authenticated
  USING (
    bolao_id IS NOT NULL AND (
      EXISTS (SELECT 1 FROM public.boloes b WHERE b.id = payments.bolao_id AND b.created_by = auth.uid())
      OR EXISTS (SELECT 1 FROM public.bolao_participants bp WHERE bp.bolao_id = payments.bolao_id AND bp.user_id = auth.uid())
    )
  );

-- 4. Prevent self privilege escalation on profiles.is_admin via trigger
CREATE OR REPLACE FUNCTION public.prevent_is_admin_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND is_admin = true
    ) THEN
      RAISE EXCEPTION 'Only admins can change is_admin';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_is_admin_self_update ON public.profiles;
CREATE TRIGGER trg_prevent_is_admin_self_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_is_admin_self_update();

-- 5. Revoke EXECUTE on SECURITY DEFINER RPCs not used from client
REVOKE EXECUTE ON FUNCTION public.process_match_result(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.revert_match_result(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.process_extra_question(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_match_result(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.revert_match_result(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.process_extra_question(uuid, text) TO service_role;
