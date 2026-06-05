CREATE OR REPLACE FUNCTION public.is_name_taken(_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE lower(btrim(name)) = lower(btrim(_name))
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_name_taken(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_name_taken(text) TO anon, authenticated, service_role;