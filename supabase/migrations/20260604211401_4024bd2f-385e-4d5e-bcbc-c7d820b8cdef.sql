ALTER TABLE public.boloes
  ADD COLUMN prize_1st_pct integer NOT NULL DEFAULT 70,
  ADD COLUMN prize_2nd_pct integer NOT NULL DEFAULT 20,
  ADD COLUMN prize_3rd_pct integer NOT NULL DEFAULT 10;