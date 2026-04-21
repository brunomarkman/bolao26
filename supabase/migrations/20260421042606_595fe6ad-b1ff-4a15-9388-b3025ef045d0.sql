-- Tabela para armazenar respostas extras dos usuários por bolão
CREATE TABLE public.extra_predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  bolao_id UUID NOT NULL REFERENCES public.boloes(id) ON DELETE CASCADE,
  champion TEXT,
  golden_ball TEXT,
  top_scorer TEXT,
  points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, bolao_id)
);

ALTER TABLE public.extra_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Extra predictions viewable by authenticated"
  ON public.extra_predictions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert own extra predictions"
  ON public.extra_predictions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own extra predictions"
  ON public.extra_predictions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admin can delete extra predictions"
  ON public.extra_predictions FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true));

CREATE TRIGGER update_extra_predictions_updated_at
  BEFORE UPDATE ON public.extra_predictions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela para respostas oficiais por competição (definidas pelo admin)
CREATE TABLE public.competition_extra_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  competition_id UUID NOT NULL UNIQUE REFERENCES public.competitions(id) ON DELETE CASCADE,
  champion TEXT,
  golden_ball TEXT,
  top_scorer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.competition_extra_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Extra results viewable by authenticated"
  ON public.competition_extra_results FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can insert extra results"
  ON public.competition_extra_results FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true));

CREATE POLICY "Admin can update extra results"
  ON public.competition_extra_results FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true));

CREATE TRIGGER update_competition_extra_results_updated_at
  BEFORE UPDATE ON public.competition_extra_results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Função: processa pontos para uma pergunta extra específica
-- field_name: 'champion' | 'golden_ball' | 'top_scorer'
CREATE OR REPLACE FUNCTION public.process_extra_question(p_competition_id UUID, p_field TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_official TEXT;
  v_points INTEGER;
  ep RECORD;
  bolao_competition UUID;
  user_total INTEGER;
BEGIN
  IF p_field NOT IN ('champion', 'golden_ball', 'top_scorer') THEN
    RAISE EXCEPTION 'Invalid field';
  END IF;

  EXECUTE format('SELECT %I FROM public.competition_extra_results WHERE competition_id = $1', p_field)
    INTO v_official USING p_competition_id;

  IF v_official IS NULL OR trim(v_official) = '' THEN RETURN; END IF;

  v_points := CASE WHEN p_field = 'champion' THEN 30 ELSE 25 END;

  -- Recalcula points totais para todas as extra_predictions de bolões dessa competição
  FOR ep IN
    SELECT ep.id, ep.user_id, ep.bolao_id, ep.champion, ep.golden_ball, ep.top_scorer
    FROM public.extra_predictions ep
    JOIN public.boloes b ON b.id = ep.bolao_id
    WHERE b.competition_id = p_competition_id
  LOOP
    DECLARE
      total INTEGER := 0;
      r RECORD;
    BEGIN
      SELECT * INTO r FROM public.competition_extra_results WHERE competition_id = p_competition_id;
      IF r.champion IS NOT NULL AND trim(r.champion) <> '' AND lower(trim(ep.champion)) = lower(trim(r.champion)) THEN
        total := total + 30;
      END IF;
      IF r.golden_ball IS NOT NULL AND trim(r.golden_ball) <> '' AND lower(trim(ep.golden_ball)) = lower(trim(r.golden_ball)) THEN
        total := total + 25;
      END IF;
      IF r.top_scorer IS NOT NULL AND trim(r.top_scorer) <> '' AND lower(trim(ep.top_scorer)) = lower(trim(r.top_scorer)) THEN
        total := total + 25;
      END IF;
      UPDATE public.extra_predictions SET points = total WHERE id = ep.id;
    END;
  END LOOP;

  -- Atualiza total_score em bolao_participants somando pontos de palpites + pontos extras
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
$$;