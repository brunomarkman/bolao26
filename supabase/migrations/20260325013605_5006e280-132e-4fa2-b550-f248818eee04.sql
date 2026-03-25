-- Allow admin to delete predictions (needed for reset all matches)
CREATE POLICY "Admin can delete predictions"
ON public.predictions
FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true
));

-- Allow admin to update all profiles (needed for resetting scores)
CREATE POLICY "Admin can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true
));
