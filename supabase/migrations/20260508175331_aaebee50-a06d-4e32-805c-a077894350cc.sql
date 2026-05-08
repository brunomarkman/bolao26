-- Add per-bolão extra question configuration
ALTER TABLE public.boloes
  ADD COLUMN IF NOT EXISTS extra_champion_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS extra_champion_points INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS extra_golden_ball_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS extra_golden_ball_points INTEGER NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS extra_top_scorer_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS extra_top_scorer_points INTEGER NOT NULL DEFAULT 25;

-- Update process_extra_question to use per-bolão points and respect enabled flag
CREATE OR REPLACE FUNCTION public.process_extra_question(p_competition_id uuid, p_field text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  ep RECORD;
  r RECORD;
  b RECORD;
  total INTEGER;
BEGIN
  IF p_field NOT IN ('champion', 'golden_ball', 'top_scorer') THEN
    RAISE EXCEPTION 'Invalid field';
  END IF;

  SELECT * INTO r FROM public.competition_extra_results WHERE competition_id = p_competition_id;
  IF NOT FOUND THEN RETURN; END IF;

  FOR ep IN
    SELECT ep.id, ep.user_id, ep.bolao_id, ep.champion, ep.golden_ball, ep.top_scorer,
           b.extra_champion_enabled, b.extra_champion_points,
           b.extra_golden_ball_enabled, b.extra_golden_ball_points,
           b.extra_top_scorer_enabled, b.extra_top_scorer_points
    FROM public.extra_predictions ep
    JOIN public.boloes b ON b.id = ep.bolao_id
    WHERE b.competition_id = p_competition_id
  LOOP
    total := 0;
    IF ep.extra_champion_enabled AND r.champion IS NOT NULL AND trim(r.champion) <> ''
       AND ep.champion IS NOT NULL AND lower(trim(ep.champion)) = lower(trim(r.champion)) THEN
      total := total + ep.extra_champion_points;
    END IF;
    IF ep.extra_golden_ball_enabled AND r.golden_ball IS NOT NULL AND trim(r.golden_ball) <> ''
       AND ep.golden_ball IS NOT NULL AND lower(trim(ep.golden_ball)) = lower(trim(r.golden_ball)) THEN
      total := total + ep.extra_golden_ball_points;
    END IF;
    IF ep.extra_top_scorer_enabled AND r.top_scorer IS NOT NULL AND trim(r.top_scorer) <> ''
       AND ep.top_scorer IS NOT NULL AND lower(trim(ep.top_scorer)) = lower(trim(r.top_scorer)) THEN
      total := total + ep.extra_top_scorer_points;
    END IF;
    UPDATE public.extra_predictions SET points = total WHERE id = ep.id;
  END LOOP;

  -- Recalc total_score for each participant in affected bolões
  UPDATE public.bolao_participants bp
  SET total_score = COALESCE((
    SELECT SUM(p.points) FROM public.predictions p
    WHERE p.user_id = bp.user_id AND p.bolao_id = bp.bolao_id AND p.points IS NOT NULL
  ), 0) + COALESCE((
    SELECT ep.points FROM public.extra_predictions ep
    WHERE ep.user_id = bp.user_id AND ep.bolao_id = bp.bolao_id
  ), 0)
  WHERE bp.bolao_id IN (SELECT id FROM public.boloes WHERE competition_id = p_competition_id);
END;
$function$;