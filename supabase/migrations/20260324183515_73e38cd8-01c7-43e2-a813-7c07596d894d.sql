
CREATE OR REPLACE FUNCTION public.calculate_prediction_points(pred_a integer, pred_b integer, actual_a integer, actual_b integer)
 RETURNS integer
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  pred_total INTEGER;
  actual_total INTEGER;
  pred_winner TEXT;
  actual_winner TEXT;
BEGIN
  -- 5 pontos: acerto exato do placar
  IF pred_a = actual_a AND pred_b = actual_b THEN RETURN 5; END IF;

  pred_total := pred_a + pred_b;
  actual_total := actual_a + actual_b;

  -- Determinar vencedor
  IF actual_a > actual_b THEN actual_winner := 'A';
  ELSIF actual_b > actual_a THEN actual_winner := 'B';
  ELSE actual_winner := 'D'; END IF;

  IF pred_a > pred_b THEN pred_winner := 'A';
  ELSIF pred_b > pred_a THEN pred_winner := 'B';
  ELSE pred_winner := 'D'; END IF;

  -- 4 pontos: acertou placar do vencedor, errou do perdedor
  IF actual_winner = 'A' AND pred_a = actual_a AND pred_b != actual_b THEN RETURN 4; END IF;
  IF actual_winner = 'B' AND pred_b = actual_b AND pred_a != actual_a THEN RETURN 4; END IF;

  -- 3 pontos: errou placar do vencedor, acertou do perdedor, OU acertou empate com placar diferente
  IF actual_winner = 'A' AND pred_b = actual_b AND pred_a != actual_a THEN RETURN 3; END IF;
  IF actual_winner = 'B' AND pred_a = actual_a AND pred_b != actual_b THEN RETURN 3; END IF;
  IF actual_winner = 'D' AND pred_winner = 'D' AND (pred_a != actual_a) THEN RETURN 3; END IF;

  -- 2 pontos: acertou o vencedor mas errou ambos placares
  IF pred_winner = actual_winner AND pred_winner != 'D' THEN RETURN 2; END IF;

  -- 1 ponto: errou tudo mas acertou total de gols
  IF pred_total = actual_total THEN RETURN 1; END IF;

  RETURN 0;
END;
$function$;

-- Fix process_match_result to include phase multiplier and fix WHERE clause
CREATE OR REPLACE FUNCTION public.process_match_result(p_match_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  m RECORD;
  pred RECORD;
  pts INTEGER;
  phase_multiplier INTEGER;
BEGIN
  SELECT * INTO m FROM public.matches WHERE id = p_match_id AND is_finished = true;
  IF NOT FOUND THEN RETURN; END IF;

  -- Get phase multiplier (capped at 6 for phases 6 and 7)
  SELECT LEAST(p.number, 6) INTO phase_multiplier FROM public.phases p WHERE p.id = m.phase_id;
  IF phase_multiplier IS NULL THEN phase_multiplier := 1; END IF;

  FOR pred IN SELECT * FROM public.predictions WHERE match_id = p_match_id LOOP
    pts := public.calculate_prediction_points(pred.score_a, pred.score_b, m.score_a, m.score_b);
    pts := pts * phase_multiplier;
    UPDATE public.predictions SET points = pts WHERE id = pred.id;
  END LOOP;

  -- Recalculate total_score for each user who had a prediction on this match
  UPDATE public.profiles 
  SET total_score = COALESCE((
    SELECT SUM(points) FROM public.predictions WHERE user_id = profiles.user_id AND points IS NOT NULL
  ), 0)
  WHERE user_id IN (SELECT user_id FROM public.predictions WHERE match_id = p_match_id);
END;
$function$;
