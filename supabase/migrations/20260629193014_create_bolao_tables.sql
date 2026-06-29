/*
# Create Bolão Copa 2026 Schema

1. New Tables
- `bolao_participants` — participants in each pool, with total score and active status
- `boloes` — betting pools with competition, bet value, status, invite code, extra questions config, and prize distribution
- `competition_extra_results` — official answers for extra questions (champion, golden ball, top scorer)
- `competitions` — football competitions with year, dates, format, and fee
- `extra_predictions` — user predictions for extra questions (champion, golden ball, top scorer)
- `matches` — football matches with teams, scores, date, location, group, and finish status
- `messages` — chat/messages for pools with source and type
- `payments` — payment records per user per pool
- `phases` — competition phases (group stage, round of 16, etc.) with active flag
- `predictions` — user score predictions per match per pool
- `profiles` — user profiles linked to auth.users
- `settings` — site-wide settings (key-value)

2. Security
- Enable RLS on all tables.
- Add policies for authenticated users to access data they own or are participants in.
- Public tables (competitions, matches, phases) allow read access to all authenticated users.

3. Important Notes
1. All `id` columns use `uuid PRIMARY KEY DEFAULT gen_random_uuid()`.
2. `status` in `boloes` uses the existing `bolao_status` enum.
3. `created_at` and `updated_at` default to `now()`.
4. Foreign keys reference existing tables where applicable.
*/

-- Create enum if not exists (safe for existing projects)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bolao_status') THEN
    CREATE TYPE bolao_status AS ENUM ('waiting', 'active', 'finished', 'cancelled');
  END IF;
END $$;

-- 1. profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  is_admin boolean NOT NULL DEFAULT false,
  total_score integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  city text,
  country text
);

-- 2. competitions
CREATE TABLE IF NOT EXISTS public.competitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  year integer NOT NULL,
  start_date date,
  end_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  total_clubs integer,
  format text,
  fee numeric NOT NULL DEFAULT 0
);

-- 3. phases
CREATE TABLE IF NOT EXISTS public.phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number integer NOT NULL,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  competition_id uuid REFERENCES public.competitions(id) ON DELETE CASCADE
);

-- 4. matches
CREATE TABLE IF NOT EXISTS public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id uuid NOT NULL REFERENCES public.phases(id) ON DELETE CASCADE,
  team_a text NOT NULL,
  team_b text NOT NULL,
  score_a integer,
  score_b integer,
  match_date timestamptz,
  location text,
  group_name text,
  is_finished boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. boloes
CREATE TABLE IF NOT EXISTS public.boloes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number integer NOT NULL DEFAULT 1,
  nickname text NOT NULL,
  competition_id uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bet_value numeric NOT NULL DEFAULT 0,
  status bolao_status NOT NULL DEFAULT 'waiting',
  invite_code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  extra_champion_enabled boolean NOT NULL DEFAULT true,
  extra_champion_points integer NOT NULL DEFAULT 30,
  extra_golden_ball_enabled boolean NOT NULL DEFAULT true,
  extra_golden_ball_points integer NOT NULL DEFAULT 25,
  extra_top_scorer_enabled boolean NOT NULL DEFAULT true,
  extra_top_scorer_points integer NOT NULL DEFAULT 25,
  prize_1st_pct integer NOT NULL DEFAULT 70,
  prize_2nd_pct integer NOT NULL DEFAULT 20,
  prize_3rd_pct integer NOT NULL DEFAULT 10
);

-- 6. bolao_participants
CREATE TABLE IF NOT EXISTS public.bolao_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bolao_id uuid NOT NULL REFERENCES public.boloes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_score integer NOT NULL DEFAULT 0,
  joined_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE (bolao_id, user_id)
);

-- 7. predictions
CREATE TABLE IF NOT EXISTS public.predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  score_a integer NOT NULL,
  score_b integer NOT NULL,
  points integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  bolao_id uuid REFERENCES public.boloes(id) ON DELETE CASCADE
);

-- 8. extra_predictions
CREATE TABLE IF NOT EXISTS public.extra_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bolao_id uuid NOT NULL REFERENCES public.boloes(id) ON DELETE CASCADE,
  champion text,
  golden_ball text,
  top_scorer text,
  points integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 9. payments
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  received_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  bolao_id uuid REFERENCES public.boloes(id) ON DELETE CASCADE
);

-- 10. messages
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  bolao_id uuid REFERENCES public.boloes(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'dashboard',
  tipo text NOT NULL DEFAULT 'D'
);

-- 11. competition_extra_results
CREATE TABLE IF NOT EXISTS public.competition_extra_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL UNIQUE REFERENCES public.competitions(id) ON DELETE CASCADE,
  champion text,
  golden_ball text,
  top_scorer text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 12. settings
CREATE TABLE IF NOT EXISTS public.settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- Row Level Security
-- ============================================

-- profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_profiles_own" ON public.profiles;
CREATE POLICY "select_profiles_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_profiles_own" ON public.profiles;
CREATE POLICY "insert_profiles_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_profiles_own" ON public.profiles;
CREATE POLICY "update_profiles_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_profiles_own" ON public.profiles;
CREATE POLICY "delete_profiles_own" ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- competitions (public read, admin write)
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_competitions_all" ON public.competitions;
CREATE POLICY "select_competitions_all" ON public.competitions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_competitions_admin" ON public.competitions;
CREATE POLICY "insert_competitions_admin" ON public.competitions FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true));
DROP POLICY IF EXISTS "update_competitions_admin" ON public.competitions;
CREATE POLICY "update_competitions_admin" ON public.competitions FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true));
DROP POLICY IF EXISTS "delete_competitions_admin" ON public.competitions;
CREATE POLICY "delete_competitions_admin" ON public.competitions FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true));

-- phases
ALTER TABLE public.phases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_phases_all" ON public.phases;
CREATE POLICY "select_phases_all" ON public.phases FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_phases_admin" ON public.phases;
CREATE POLICY "insert_phases_admin" ON public.phases FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true));
DROP POLICY IF EXISTS "update_phases_admin" ON public.phases;
CREATE POLICY "update_phases_admin" ON public.phases FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true));
DROP POLICY IF EXISTS "delete_phases_admin" ON public.phases;
CREATE POLICY "delete_phases_admin" ON public.phases FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true));

-- matches
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_matches_all" ON public.matches;
CREATE POLICY "select_matches_all" ON public.matches FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_matches_admin" ON public.matches;
CREATE POLICY "insert_matches_admin" ON public.matches FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true));
DROP POLICY IF EXISTS "update_matches_admin" ON public.matches;
CREATE POLICY "update_matches_admin" ON public.matches FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true));
DROP POLICY IF EXISTS "delete_matches_admin" ON public.matches;
CREATE POLICY "delete_matches_admin" ON public.matches FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true));

-- boloes
ALTER TABLE public.boloes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_boloes_participant" ON public.boloes;
CREATE POLICY "select_boloes_participant" ON public.boloes FOR SELECT TO authenticated USING (
  created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.bolao_participants WHERE bolao_id = public.boloes.id AND user_id = auth.uid())
);
DROP POLICY IF EXISTS "insert_boloes_any" ON public.boloes;
CREATE POLICY "insert_boloes_any" ON public.boloes FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
DROP POLICY IF EXISTS "update_boloes_creator" ON public.boloes;
CREATE POLICY "update_boloes_creator" ON public.boloes FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
DROP POLICY IF EXISTS "delete_boloes_creator" ON public.boloes;
CREATE POLICY "delete_boloes_creator" ON public.boloes FOR DELETE TO authenticated USING (created_by = auth.uid());

-- bolao_participants
ALTER TABLE public.bolao_participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_bolao_participants_own" ON public.bolao_participants;
CREATE POLICY "select_bolao_participants_own" ON public.bolao_participants FOR SELECT TO authenticated USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.boloes WHERE id = bolao_id AND created_by = auth.uid()));
DROP POLICY IF EXISTS "insert_bolao_participants_own" ON public.bolao_participants;
CREATE POLICY "insert_bolao_participants_own" ON public.bolao_participants FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "update_bolao_participants_creator" ON public.bolao_participants;
CREATE POLICY "update_bolao_participants_creator" ON public.bolao_participants FOR UPDATE TO authenticated USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.boloes WHERE id = bolao_id AND created_by = auth.uid())) WITH CHECK (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.boloes WHERE id = bolao_id AND created_by = auth.uid()));
DROP POLICY IF EXISTS "delete_bolao_participants_own" ON public.bolao_participants;
CREATE POLICY "delete_bolao_participants_own" ON public.bolao_participants FOR DELETE TO authenticated USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.boloes WHERE id = bolao_id AND created_by = auth.uid()));

-- predictions
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_predictions_own" ON public.predictions;
CREATE POLICY "select_predictions_own" ON public.predictions FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "insert_predictions_own" ON public.predictions;
CREATE POLICY "insert_predictions_own" ON public.predictions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "update_predictions_own" ON public.predictions;
CREATE POLICY "update_predictions_own" ON public.predictions FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "delete_predictions_own" ON public.predictions;
CREATE POLICY "delete_predictions_own" ON public.predictions FOR DELETE TO authenticated USING (user_id = auth.uid());

-- extra_predictions
ALTER TABLE public.extra_predictions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_extra_predictions_own" ON public.extra_predictions;
CREATE POLICY "select_extra_predictions_own" ON public.extra_predictions FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "insert_extra_predictions_own" ON public.extra_predictions;
CREATE POLICY "insert_extra_predictions_own" ON public.extra_predictions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "update_extra_predictions_own" ON public.extra_predictions;
CREATE POLICY "update_extra_predictions_own" ON public.extra_predictions FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "delete_extra_predictions_own" ON public.extra_predictions;
CREATE POLICY "delete_extra_predictions_own" ON public.extra_predictions FOR DELETE TO authenticated USING (user_id = auth.uid());

-- payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_payments_own_or_creator" ON public.payments;
CREATE POLICY "select_payments_own_or_creator" ON public.payments FOR SELECT TO authenticated USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.boloes WHERE id = bolao_id AND created_by = auth.uid()));
DROP POLICY IF EXISTS "insert_payments_creator" ON public.payments;
CREATE POLICY "insert_payments_creator" ON public.payments FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.boloes WHERE id = bolao_id AND created_by = auth.uid()));
DROP POLICY IF EXISTS "update_payments_creator" ON public.payments;
CREATE POLICY "update_payments_creator" ON public.payments FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.boloes WHERE id = bolao_id AND created_by = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.boloes WHERE id = bolao_id AND created_by = auth.uid()));
DROP POLICY IF EXISTS "delete_payments_creator" ON public.payments;
CREATE POLICY "delete_payments_creator" ON public.payments FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.boloes WHERE id = bolao_id AND created_by = auth.uid()));

-- messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_messages_participant" ON public.messages;
CREATE POLICY "select_messages_participant" ON public.messages FOR SELECT TO authenticated USING (bolao_id IS NULL OR EXISTS (SELECT 1 FROM public.bolao_participants WHERE bolao_id = public.messages.bolao_id AND user_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.boloes WHERE id = bolao_id AND created_by = auth.uid()));
DROP POLICY IF EXISTS "insert_messages_any" ON public.messages;
CREATE POLICY "insert_messages_any" ON public.messages FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
DROP POLICY IF EXISTS "update_messages_own" ON public.messages;
CREATE POLICY "update_messages_own" ON public.messages FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
DROP POLICY IF EXISTS "delete_messages_own_or_creator" ON public.messages;
CREATE POLICY "delete_messages_own_or_creator" ON public.messages FOR DELETE TO authenticated USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.boloes WHERE id = bolao_id AND created_by = auth.uid()));

-- competition_extra_results
ALTER TABLE public.competition_extra_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_extra_results_all" ON public.competition_extra_results;
CREATE POLICY "select_extra_results_all" ON public.competition_extra_results FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_extra_results_admin" ON public.competition_extra_results;
CREATE POLICY "insert_extra_results_admin" ON public.competition_extra_results FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true));
DROP POLICY IF EXISTS "update_extra_results_admin" ON public.competition_extra_results;
CREATE POLICY "update_extra_results_admin" ON public.competition_extra_results FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true));
DROP POLICY IF EXISTS "delete_extra_results_admin" ON public.competition_extra_results;
CREATE POLICY "delete_extra_results_admin" ON public.competition_extra_results FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true));

-- settings
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_settings_all" ON public.settings;
CREATE POLICY "select_settings_all" ON public.settings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_settings_admin" ON public.settings;
CREATE POLICY "insert_settings_admin" ON public.settings FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true));
DROP POLICY IF EXISTS "update_settings_admin" ON public.settings;
CREATE POLICY "update_settings_admin" ON public.settings FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true));
DROP POLICY IF EXISTS "delete_settings_admin" ON public.settings;
CREATE POLICY "delete_settings_admin" ON public.settings FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true));
