-- FLAGFORGE · security review (2026-11-15): least privilege on the public API.
-- Neither object is used by the app; both were reachable through the Data API.
--  * public_profiles let anyone list every username and sign-up date. The Hall of Fame functions already
--    return the few public fields they need, only for players who appear on a board. (It was also the one
--    "Security Definer View" error in the Supabase security advisor.)
--  * my_answered_questions was an early read path for a player's own history, superseded by server-side calls.
drop view if exists public.public_profiles;
drop function if exists public.my_answered_questions(uuid);
