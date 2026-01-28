create or replace function public.update_google_connection_settings(
  p_selected_calendar_id text default null,
  p_grocery_list_id text default null,
  p_grocery_list_name text default null
)
returns void
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_user_id uuid;
  v_updated_count int;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  update public.google_connections
  set selected_calendar_id = coalesce(p_selected_calendar_id, selected_calendar_id),
      grocery_list_id = coalesce(p_grocery_list_id, grocery_list_id),
      grocery_list_name = coalesce(p_grocery_list_name, grocery_list_name),
      updated_at = now()
  where user_id = v_user_id;

  get diagnostics v_updated_count = row_count;

  if v_updated_count = 0 then
    raise exception 'No google connection found for user';
  end if;
end;
$$;

grant execute on function public.update_google_connection_settings(text, text, text) to authenticated;
