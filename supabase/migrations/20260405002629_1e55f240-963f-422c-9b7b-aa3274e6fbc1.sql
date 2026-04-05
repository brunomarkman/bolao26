
-- Drop the old unique constraint
ALTER TABLE public.predictions DROP CONSTRAINT IF EXISTS predictions_user_id_match_id_key;

-- Add new unique constraint including bolao_id
ALTER TABLE public.predictions ADD CONSTRAINT predictions_user_id_match_id_bolao_id_key UNIQUE (user_id, match_id, bolao_id);
