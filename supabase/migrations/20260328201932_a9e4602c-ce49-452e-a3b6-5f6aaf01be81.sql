
-- Create bolao_status enum
CREATE TYPE public.bolao_status AS ENUM ('waiting', 'active', 'finished', 'cancelled');

-- Competitions table
CREATE TABLE public.competitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  year integer NOT NULL,
  start_date date,
  end_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Competitions viewable by authenticated" ON public.competitions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Site admin can insert competitions" ON public.competitions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND email = 'brunomarkman@gmail.com'));
CREATE POLICY "Site admin can update competitions" ON public.competitions FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND email = 'brunomarkman@gmail.com'));
CREATE POLICY "Site admin can delete competitions" ON public.competitions FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND email = 'brunomarkman@gmail.com'));

-- Add competition_id to phases
ALTER TABLE public.phases ADD COLUMN competition_id uuid REFERENCES public.competitions(id);

-- Insert default competition and link existing phases
DO $$
DECLARE comp_id uuid;
BEGIN
  INSERT INTO public.competitions (name, year, start_date, end_date)
  VALUES ('Copa do Mundo FIFA 2026', 2026, '2026-06-11', '2026-07-19')
  RETURNING id INTO comp_id;
  UPDATE public.phases SET competition_id = comp_id;
END;
$$;

-- Boloes table
CREATE TABLE public.boloes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number integer NOT NULL DEFAULT 0,
  nickname text NOT NULL,
  competition_id uuid NOT NULL REFERENCES public.competitions(id),
  created_by uuid NOT NULL,
  bet_value numeric NOT NULL DEFAULT 0,
  status public.bolao_status NOT NULL DEFAULT 'waiting',
  invite_code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.boloes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Boloes viewable by authenticated" ON public.boloes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create boloes" ON public.boloes FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creator can update bolao" ON public.boloes FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "Creator can delete bolao" ON public.boloes FOR DELETE TO authenticated USING (auth.uid() = created_by AND status = 'waiting');

-- Auto-set bolao number
CREATE OR REPLACE FUNCTION public.set_bolao_number()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  NEW.number := COALESCE((SELECT MAX(number) FROM public.boloes), 0) + 1;
  RETURN NEW;
END;
$$;
CREATE TRIGGER set_bolao_number_trigger BEFORE INSERT ON public.boloes FOR EACH ROW EXECUTE FUNCTION public.set_bolao_number();
CREATE TRIGGER update_boloes_updated_at BEFORE UPDATE ON public.boloes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Bolao participants
CREATE TABLE public.bolao_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bolao_id uuid NOT NULL REFERENCES public.boloes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  total_score integer NOT NULL DEFAULT 0,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(bolao_id, user_id)
);
ALTER TABLE public.bolao_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants viewable by authenticated" ON public.bolao_participants FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can join bolao" ON public.bolao_participants FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave bolao" ON public.bolao_participants FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Add bolao_id to predictions, payments, messages
ALTER TABLE public.predictions ADD COLUMN bolao_id uuid REFERENCES public.boloes(id);
ALTER TABLE public.payments ADD COLUMN bolao_id uuid REFERENCES public.boloes(id);
ALTER TABLE public.messages ADD COLUMN bolao_id uuid REFERENCES public.boloes(id);

-- Update process_match_result to also update bolao_participants
CREATE OR REPLACE FUNCTION public.process_match_result(p_match_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  m RECORD; pred RECORD; pts INTEGER; phase_multiplier INTEGER;
BEGIN
  SELECT * INTO m FROM public.matches WHERE id = p_match_id AND is_finished = true;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT LEAST(p.number, 6) INTO phase_multiplier FROM public.phases p WHERE p.id = m.phase_id;
  IF phase_multiplier IS NULL THEN phase_multiplier := 1; END IF;
  FOR pred IN SELECT * FROM public.predictions WHERE match_id = p_match_id LOOP
    pts := public.calculate_prediction_points(pred.score_a, pred.score_b, m.score_a, m.score_b);
    pts := pts * phase_multiplier;
    UPDATE public.predictions SET points = pts WHERE id = pred.id;
  END LOOP;
  UPDATE public.profiles SET total_score = COALESCE((
    SELECT SUM(points) FROM public.predictions WHERE user_id = profiles.user_id AND points IS NOT NULL
  ), 0) WHERE user_id IN (SELECT user_id FROM public.predictions WHERE match_id = p_match_id);
  UPDATE public.bolao_participants bp SET total_score = COALESCE((
    SELECT SUM(p.points) FROM public.predictions p WHERE p.user_id = bp.user_id AND p.bolao_id = bp.bolao_id AND p.points IS NOT NULL
  ), 0) WHERE bp.user_id IN (SELECT user_id FROM public.predictions WHERE match_id = p_match_id)
    AND bp.bolao_id IN (SELECT DISTINCT bolao_id FROM public.predictions WHERE match_id = p_match_id AND bolao_id IS NOT NULL);
END;
$$;

-- Update revert_match_result to also update bolao_participants
CREATE OR REPLACE FUNCTION public.revert_match_result(p_match_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.bolao_participants bp SET total_score = COALESCE((
    SELECT SUM(p2.points) FROM public.predictions p2 WHERE p2.user_id = bp.user_id AND p2.bolao_id = bp.bolao_id AND p2.points IS NOT NULL AND p2.match_id != p_match_id
  ), 0) WHERE bp.user_id IN (SELECT user_id FROM public.predictions WHERE match_id = p_match_id)
    AND bp.bolao_id IN (SELECT DISTINCT bolao_id FROM public.predictions WHERE match_id = p_match_id AND bolao_id IS NOT NULL);
  UPDATE public.matches SET score_a = NULL, score_b = NULL, is_finished = false WHERE id = p_match_id;
  UPDATE public.predictions SET points = NULL WHERE match_id = p_match_id;
  UPDATE public.profiles SET total_score = COALESCE((
    SELECT SUM(points) FROM public.predictions WHERE user_id = profiles.user_id AND points IS NOT NULL
  ), 0) WHERE user_id IN (SELECT user_id FROM public.predictions WHERE match_id = p_match_id);
END;
$$;
