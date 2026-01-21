create or replace function public.upsert_google_connection(
  p_gmail_address text,
  p_access_token text,
  p_refresh_token text,
  p_expires_at timestamptz,
  p_scope text default null
)
returns table (
  id uuid,
  user_id uuid,
  gmail_address text,
  expires_at timestamptz,
  scope text,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.google_connections (
    user_id,
    gmail_address,
    access_token,
    refresh_token,
    expires_at,
    token_expires_at,
    scope,
    updated_at
  )
  values (
    auth.uid(),
    p_gmail_address,
    p_access_token,
    p_refresh_token,
    p_expires_at,
    p_expires_at::timestamp,
    p_scope,
    now()
  )
  on conflict (user_id) do update
    set gmail_address = excluded.gmail_address,
        access_token = excluded.access_token,
        refresh_token = coalesce(excluded.refresh_token, google_connections.refresh_token),
        expires_at = excluded.expires_at,
        token_expires_at = excluded.token_expires_at,
        scope = coalesce(excluded.scope, google_connections.scope),
        updated_at = now()
  returning
    google_connections.id,
    google_connections.user_id,
    google_connections.gmail_address,
    google_connections.expires_at,
    google_connections.scope,
    google_connections.updated_at
  into id, user_id, gmail_address, expires_at, scope, updated_at;

  return next;
end;
$$;

revoke all on function public.upsert_google_connection(
  text,
  text,
  text,
  timestamptz,
  text
) from public;

grant execute on function public.upsert_google_connection(
  text,
  text,
  text,
  timestamptz,
  text
) to authenticated;
