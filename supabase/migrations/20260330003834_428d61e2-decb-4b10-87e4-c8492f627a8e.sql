
-- Allow anonymous users to view boloes (for invite page)
CREATE POLICY "Boloes viewable by anon for invites"
ON public.boloes
FOR SELECT
TO anon
USING (true);

-- Allow anonymous users to view competitions (for invite page details)
CREATE POLICY "Competitions viewable by anon"
ON public.competitions
FOR SELECT
TO anon
USING (true);

-- Allow anonymous users to view profiles (for invite page manager name)
CREATE POLICY "Profiles viewable by anon"
ON public.profiles
FOR SELECT
TO anon
USING (true);

-- Allow anonymous users to count participants (for invite page)
CREATE POLICY "Participants viewable by anon"
ON public.bolao_participants
FOR SELECT
TO anon
USING (true);
