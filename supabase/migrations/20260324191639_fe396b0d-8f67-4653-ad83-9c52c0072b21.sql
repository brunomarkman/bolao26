
-- Settings table for bet value
CREATE TABLE public.settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Settings viewable by authenticated" ON public.settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can update settings" ON public.settings FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true));
CREATE POLICY "Admin can insert settings" ON public.settings FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true));

-- Insert default bet value
INSERT INTO public.settings (key, value) VALUES ('bet_value', '0');

-- Payments table
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  received_by text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Payments viewable by authenticated" ON public.payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can insert payments" ON public.payments FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true));
CREATE POLICY "Admin can delete payments" ON public.payments FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true));
