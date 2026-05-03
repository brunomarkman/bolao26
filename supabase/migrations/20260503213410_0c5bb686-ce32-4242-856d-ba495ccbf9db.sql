ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'D';

UPDATE public.messages SET tipo = CASE
  WHEN source = 'admin' THEN 'A'
  WHEN source = 'manage' THEN 'G'
  ELSE 'D'
END;