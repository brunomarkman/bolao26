
CREATE OR REPLACE FUNCTION public.revert_match_result(p_match_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Reset match scores and status
  UPDATE public.matches SET score_a = NULL, score_b = NULL, is_finished = false WHERE id = p_match_id;

  -- Reset points for all predictions on this match
  UPDATE public.predictions SET points = NULL WHERE match_id = p_match_id;

  -- Recalculate total_score for affected users
  UPDATE public.profiles 
  SET total_score = COALESCE((
    SELECT SUM(points) FROM public.predictions WHERE user_id = profiles.user_id AND points IS NOT NULL
  ), 0)
  WHERE user_id IN (SELECT user_id FROM public.predictions WHERE match_id = p_match_id);
END;
$function$;
