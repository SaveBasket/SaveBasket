-- Luxe Studio commercial/data foundation. Run in Supabase Postgres after enabling auth/storage.
create table if not exists public.profiles(id uuid primary key references auth.users(id) on delete cascade, display_name text, role text not null default 'user', created_at timestamptz not null default now());
create table if not exists public.projects(id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, name text not null, data jsonb not null default '{}'::jsonb, version integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.project_assets(id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade, storage_path text not null, kind text not null, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
create table if not exists public.plugins(id uuid primary key default gen_random_uuid(), slug text unique not null, name text not null, developer text not null, price_pence integer not null default 0, category text not null, status text not null default 'draft', metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
create table if not exists public.plugin_versions(id uuid primary key default gen_random_uuid(), plugin_id uuid not null references public.plugins(id) on delete cascade, version text not null, manifest jsonb not null default '{}'::jsonb, asset_path text, created_at timestamptz not null default now(), unique(plugin_id,version));
create table if not exists public.marketplace_products(id uuid primary key default gen_random_uuid(), creator_id uuid references auth.users(id) on delete set null, product_type text not null, title text not null, price_pence integer not null, status text not null default 'draft', metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
create table if not exists public.orders(id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, provider text not null, provider_order_id text, currency text not null default 'gbp', total_pence integer not null, status text not null default 'pending', created_at timestamptz not null default now());
create table if not exists public.order_items(id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade, product_id uuid references public.marketplace_products(id) on delete set null, quantity integer not null default 1, unit_price_pence integer not null);
create table if not exists public.user_library(id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, product_id uuid references public.marketplace_products(id) on delete cascade, plugin_id uuid references public.plugins(id) on delete cascade, entitlement text not null default 'owned', created_at timestamptz not null default now(), unique(user_id,product_id,plugin_id));
create table if not exists public.subscriptions(id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, provider text not null, provider_subscription_id text, plan text not null, status text not null, current_period_end timestamptz, created_at timestamptz not null default now());
create table if not exists public.usage_events(id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete set null, event_name text not null, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
create index if not exists projects_user_updated_idx on public.projects(user_id,updated_at desc);
create index if not exists usage_events_user_created_idx on public.usage_events(user_id,created_at desc);

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_assets enable row level security;
alter table public.user_library enable row level security;
alter table public.subscriptions enable row level security;
alter table public.usage_events enable row level security;

drop policy if exists profile_self on public.profiles;
create policy profile_self on public.profiles for all using (auth.uid()=id) with check (auth.uid()=id);
drop policy if exists project_self on public.projects;
create policy project_self on public.projects for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
drop policy if exists asset_self on public.project_assets;
create policy asset_self on public.project_assets for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
drop policy if exists library_self on public.user_library;
create policy library_self on public.user_library for select using (auth.uid()=user_id);
drop policy if exists subscription_self on public.subscriptions;
create policy subscription_self on public.subscriptions for select using (auth.uid()=user_id);
drop policy if exists usage_self on public.usage_events;
create policy usage_self on public.usage_events for insert with check (auth.uid()=user_id);
