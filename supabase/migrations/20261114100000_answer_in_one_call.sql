-- FLAGFORGE · one database round trip per answer.
-- Answering used to take 2–3 sequential calls from the server (check the answer, then load the next question,
-- or the review + achievements at the end). These wrappers run the existing, unchanged functions inside ONE
-- call and transaction, so the rules and guards stay exactly where they were.

create or replace function public.answer_standard_step(p_user_id uuid, p_session_id uuid, p_position integer, p_choice integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_answer jsonb := public.answer_standard_question(p_user_id, p_session_id, p_position, p_choice);
begin
  if (v_answer ->> 'completed')::boolean then
    return v_answer || jsonb_build_object(
      'review', public.standard_game_review(p_user_id, p_session_id),
      'achievements', public.achievements_since_start(p_user_id, p_session_id)
    );
  end if;
  return v_answer || jsonb_build_object('next', public.standard_game_question(p_user_id, p_session_id, p_position + 1));
end;
$$;

create or replace function public.answer_daily_step(p_user_id uuid, p_attempt_id uuid, p_position integer, p_choice integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_answer jsonb := public.answer_daily_question(p_user_id, p_attempt_id, p_position, p_choice);
begin
  if (v_answer ->> 'completed')::boolean then
    return v_answer || jsonb_build_object(
      'review', public.daily_attempt_review(p_user_id, p_attempt_id),
      'achievements', public.achievements_since_start(p_user_id, p_attempt_id)
    );
  end if;
  return v_answer || jsonb_build_object('next', public.daily_question_internal(p_user_id, p_attempt_id, p_position + 1));
end;
$$;

revoke execute on function public.answer_standard_step(uuid, uuid, integer, integer) from public, anon, authenticated;
revoke execute on function public.answer_daily_step(uuid, uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.answer_standard_step(uuid, uuid, integer, integer) to service_role;
grant execute on function public.answer_daily_step(uuid, uuid, integer, integer) to service_role;
