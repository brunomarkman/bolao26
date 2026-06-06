
CREATE OR REPLACE FUNCTION public.is_user_admin(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_admin FROM public.profiles WHERE user_id = _uid LIMIT 1), false);
$$;

REVOKE EXECUTE ON FUNCTION public.is_user_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_user_admin(uuid) TO anon, authenticated, service_role;

-- Replace recursive profiles SELECT policy
DROP POLICY IF EXISTS "Profiles viewable by self admin or shared bolao" ON public.profiles;
CREATE POLICY "Profiles viewable by self admin or shared bolao"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.is_user_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.bolao_participants bp_me
    JOIN public.bolao_participants bp_other ON bp_other.bolao_id = bp_me.bolao_id
    WHERE bp_me.user_id = auth.uid() AND bp_other.user_id = profiles.user_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.boloes b
    JOIN public.bolao_participants bp ON bp.bolao_id = b.id
    WHERE b.created_by = auth.uid() AND bp.user_id = profiles.user_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.boloes b
    JOIN public.bolao_participants bp ON bp.bolao_id = b.id
    WHERE b.created_by = profiles.user_id AND bp.user_id = auth.uid()
  )
);

-- Replace UPDATE admin policy that also self-references profiles
DROP POLICY IF EXISTS "Admin can update all profiles" ON public.profiles;
CREATE POLICY "Admin can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.is_user_admin(auth.uid()));

-- boloes SELECT also references profiles for admin check (cascades into recursion via profiles policy)
DROP POLICY IF EXISTS "Boloes viewable by creator participants or admin" ON public.boloes;
CREATE POLICY "Boloes viewable by creator participants or admin"
ON public.boloes
FOR SELECT
TO authenticated
USING (
  auth.uid() = created_by
  OR EXISTS (SELECT 1 FROM public.bolao_participants bp WHERE bp.bolao_id = boloes.id AND bp.user_id = auth.uid())
  OR public.is_user_admin(auth.uid())
);
