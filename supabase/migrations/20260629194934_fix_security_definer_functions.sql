/*
# Fix SECURITY DEFINER function exposure

1. Problem
Four SECURITY DEFINER functions in the `public` schema are executable by `anon` and `authenticated` roles via the PostgREST RPC endpoint (`/rest/v1/rpc/`). This is a security risk because SECURITY DEFINER functions run with the privileges of the function owner (usually elevated), and allowing public/anonymous access can lead to privilege escalation or unauthorized data manipulation.

2. Affected Functions
- `public.handle_new_user()`
- `public.process_extra_question(p_competition_id uuid, p_field text)`
- `public.process_match_result(p_match_id uuid)`
- `public.revert_match_result(p_match_id uuid)`

3. Fix
Revoke EXECUTE privilege on these functions from `anon` and `authenticated` roles. These functions are internal/administrative and should only be callable by service_role or other privileged roles.
*/

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.process_extra_question(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.process_extra_question(uuid, text) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.process_match_result(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.process_match_result(uuid) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.revert_match_result(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.revert_match_result(uuid) FROM authenticated;
