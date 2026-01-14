alter table screen_time_config
  add column if not exists weekly_allowance integer,
  add column if not exists week_reset_day integer default 1,
  add column if not exists hearts_total integer default 5,
  add column if not exists hearts_minutes integer;

update screen_time_config
set weekly_allowance = coalesce(weekly_allowance, daily_allowance * 7)
where weekly_allowance is null;

alter table screen_time_config
  alter column week_reset_day set default 1,
  alter column hearts_total set default 5;
