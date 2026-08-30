-- Field Engineer Kit: calculators table
-- Run this in the Supabase SQL Editor or via Supabase CLI migrations.

create extension if not exists "pgcrypto";

create table if not exists public.calculators (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  title text not null,
  slug text not null unique,
  meta_description text,
  formula_json jsonb not null default '{}'::jsonb,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists calculators_category_idx on public.calculators (category);
create index if not exists calculators_is_published_idx on public.calculators (is_published);
create index if not exists calculators_slug_idx on public.calculators (slug);

comment on table public.calculators is 'Engineering calculator definitions managed via admin.';
comment on column public.calculators.formula_json is 'Structured formula, inputs, and output configuration.';

alter table public.calculators enable row level security;

-- Anyone can read published calculators (public site).
create policy "Public can read published calculators"
  on public.calculators
  for select
  using (is_published = true);

-- Admin email has full CRUD access.
create policy "Admin can manage calculators"
  on public.calculators
  for all
  using (lower(auth.jwt() ->> 'email') = lower('jehylabs@gmail.com'))
  with check (lower(auth.jwt() ->> 'email') = lower('jehylabs@gmail.com'));
