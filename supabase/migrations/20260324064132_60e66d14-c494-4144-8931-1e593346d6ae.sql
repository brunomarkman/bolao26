
-- Create function for timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  total_score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles viewable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to auto-create profile and set first user as admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_count INTEGER;
  user_is_admin BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  user_is_admin := (user_count = 0);
  
  INSERT INTO public.profiles (user_id, name, email, is_admin)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    user_is_admin
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Phases table
CREATE TABLE public.phases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  number INTEGER NOT NULL UNIQUE CHECK (number BETWEEN 1 AND 6),
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.phases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Phases viewable by authenticated" ON public.phases FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can update phases" ON public.phases FOR UPDATE TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true));

-- Insert default phases
INSERT INTO public.phases (number, name) VALUES
  (1, 'Fase de Grupos'),
  (2, 'Oitavas de Final'),
  (3, 'Quartas de Final'),
  (4, 'Semifinais'),
  (5, 'Disputa 3º Lugar e Final'),
  (6, 'Final');

-- Matches table
CREATE TABLE public.matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phase_id UUID NOT NULL REFERENCES public.phases(id) ON DELETE CASCADE,
  team_a TEXT NOT NULL DEFAULT '',
  team_b TEXT NOT NULL DEFAULT '',
  score_a INTEGER,
  score_b INTEGER,
  match_date TIMESTAMP WITH TIME ZONE,
  location TEXT DEFAULT '',
  group_name TEXT,
  is_finished BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Matches viewable by authenticated" ON public.matches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can insert matches" ON public.matches FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true));
CREATE POLICY "Admin can update matches" ON public.matches FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true));
CREATE POLICY "Admin can delete matches" ON public.matches FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true));

CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Predictions table
CREATE TABLE public.predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  score_a INTEGER NOT NULL,
  score_b INTEGER NOT NULL,
  points INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, match_id)
);

ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Predictions viewable by authenticated" ON public.predictions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own predictions" ON public.predictions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own predictions" ON public.predictions FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_predictions_updated_at BEFORE UPDATE ON public.predictions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Messages viewable by authenticated" ON public.messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can insert messages" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true));
CREATE POLICY "Admin can delete messages" ON public.messages FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true));

-- Scoring function
CREATE OR REPLACE FUNCTION public.calculate_prediction_points(
  pred_a INTEGER, pred_b INTEGER, actual_a INTEGER, actual_b INTEGER
) RETURNS INTEGER AS $$
DECLARE
  pred_total INTEGER;
  actual_total INTEGER;
  pred_winner TEXT;
  actual_winner TEXT;
BEGIN
  IF pred_a = actual_a AND pred_b = actual_b THEN RETURN 10; END IF;

  pred_total := pred_a + pred_b;
  actual_total := actual_a + actual_b;

  IF actual_a > actual_b THEN actual_winner := 'A';
  ELSIF actual_b > actual_a THEN actual_winner := 'B';
  ELSE actual_winner := 'D'; END IF;

  IF pred_a > pred_b THEN pred_winner := 'A';
  ELSIF pred_b > pred_a THEN pred_winner := 'B';
  ELSE pred_winner := 'D'; END IF;

  IF pred_a = actual_a AND actual_winner = 'A' THEN RETURN 8; END IF;
  IF pred_a = actual_a AND actual_winner = 'B' THEN RETURN 6; END IF;
  IF pred_b = actual_b AND actual_winner = 'B' THEN RETURN 8; END IF;
  IF pred_b = actual_b AND actual_winner = 'A' THEN RETURN 6; END IF;

  IF actual_winner = 'D' AND pred_winner = 'D' THEN RETURN 6; END IF;

  IF pred_winner = actual_winner THEN RETURN 4; END IF;

  IF pred_total = actual_total THEN RETURN 2; END IF;

  RETURN 0;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

-- Function to process match result
CREATE OR REPLACE FUNCTION public.process_match_result(p_match_id UUID)
RETURNS VOID AS $$
DECLARE
  m RECORD;
  pred RECORD;
  pts INTEGER;
BEGIN
  SELECT * INTO m FROM public.matches WHERE id = p_match_id AND is_finished = true;
  IF NOT FOUND THEN RETURN; END IF;

  FOR pred IN SELECT * FROM public.predictions WHERE match_id = p_match_id LOOP
    pts := public.calculate_prediction_points(pred.score_a, pred.score_b, m.score_a, m.score_b);
    UPDATE public.predictions SET points = pts WHERE id = pred.id;
  END LOOP;

  UPDATE public.profiles p SET total_score = COALESCE((
    SELECT SUM(points) FROM public.predictions WHERE user_id = p.user_id AND points IS NOT NULL
  ), 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
