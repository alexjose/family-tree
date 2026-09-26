-- Tenant isolation, enforced in Postgres rather than application code (ADR-003).
-- A forgotten `where tenant_id = …` returns zero rows instead of leaking another family.

-- Active tenant comes from the JWT, written into app_metadata at sign-in and tenant switch.
create or replace function app_current_tenant_id()
returns uuid
language sql
stable
as $$
  select nullif(
    coalesce(
      current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'active_tenant_id',
      current_setting('app.current_tenant_id', true)
    ),
    ''
  )::uuid
$$;

comment on function app_current_tenant_id() is
  'Active tenant for the current request. Reads the JWT claim in deployment and the '
  'app.current_tenant_id GUC in tests. Returns null when unset, so policies deny by default.';

alter table tenant enable row level security;
alter table tenant_member enable row level security;
alter table person enable row level security;
alter table person_name enable row level security;
alter table relationship enable row level security;
alter table assertion enable row level security;

-- Forces policies to apply to the table owner too, so a privileged migration role
-- cannot silently bypass isolation during application traffic.
alter table tenant force row level security;
alter table tenant_member force row level security;
alter table person force row level security;
alter table person_name force row level security;
alter table relationship force row level security;
alter table assertion force row level security;

create policy tenant_isolation on tenant
  using (id = app_current_tenant_id())
  with check (id = app_current_tenant_id());

create policy tenant_isolation on tenant_member
  using (tenant_id = app_current_tenant_id())
  with check (tenant_id = app_current_tenant_id());

create policy tenant_isolation on person
  using (tenant_id = app_current_tenant_id())
  with check (tenant_id = app_current_tenant_id());

create policy tenant_isolation on person_name
  using (tenant_id = app_current_tenant_id())
  with check (tenant_id = app_current_tenant_id());

create policy tenant_isolation on relationship
  using (tenant_id = app_current_tenant_id())
  with check (tenant_id = app_current_tenant_id());

create policy tenant_isolation on assertion
  using (tenant_id = app_current_tenant_id())
  with check (tenant_id = app_current_tenant_id());

-- Application role. Deliberately not a superuser and without BYPASSRLS: user traffic
-- must never run as postgres or service_role (ARCHITECTURE.md §3.1).
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_user') then
    create role app_user nologin;
  end if;
end
$$;

grant usage on schema public to app_user;
grant usage on schema extensions to app_user;
grant select, insert, update, delete on all tables in schema public to app_user;
alter default privileges in schema public
  grant select, insert, update, delete on tables to app_user;
