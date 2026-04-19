-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Reports table
create table if not exists reports (
  id          uuid primary key default uuid_generate_v4(),
  user_id     text not null,
  title       text not null,
  project_id  text,
  author      text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Auto-update updated_at
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger reports_updated_at
  before update on reports
  for each row execute procedure set_updated_at();

-- Report steps table
create table if not exists report_steps (
  id            uuid primary key default uuid_generate_v4(),
  report_id     uuid not null references reports(id) on delete cascade,
  step_index    integer not null default 0,
  image_url     text,
  image_path    text,
  description   text,
  location_lat  numeric(10,6),
  location_lng  numeric(10,6),
  location_name text,
  optional_field text,
  created_at    timestamptz not null default now()
);

-- Indexes
create index if not exists report_steps_report_id_idx on report_steps(report_id);
create index if not exists reports_user_id_idx on reports(user_id);

-- RLS
alter table reports enable row level security;
alter table report_steps enable row level security;

-- Backend uses service_role key which bypasses RLS — policies below are for safety
create policy "service role full access on reports"
  on reports for all using (true) with check (true);

create policy "service role full access on report_steps"
  on report_steps for all using (true) with check (true);
