-- Add city and country to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT;

-- Update handle_new_user to capture city/country from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_count INTEGER;
  user_is_admin BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  user_is_admin := (user_count = 0);

  INSERT INTO public.profiles (user_id, name, email, is_admin, city, country)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    user_is_admin,
    NULLIF(NEW.raw_user_meta_data->>'city', ''),
    NULLIF(NEW.raw_user_meta_data->>'country', '')
  );
  RETURN NEW;
END;
$function$;