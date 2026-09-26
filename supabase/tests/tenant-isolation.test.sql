-- pgTAP tenant isolation suite. This is the I0 exit gate (ROADMAP §3).
--
-- Asserted in SQL rather than through the application: an application-level test can pass
-- merely because the UI filtered results, whereas this proves a session scoped to tenant A
-- genuinely cannot read, write, or delete tenant B.

create extension if not exists pgtap with schema extensions;

begin;

-- pgTAP lives in `extensions`, matching Supabase; put it on the path for this session.
set local search_path = public, extensions;

select plan(34);

-- Fixtures created as the owner, before we drop to app_user.
set local role none;

insert into tenant (id, slug, display_name) values
  ('11111111-1111-1111-1111-111111111111', 'alpha', 'Alpha Family'),
  ('22222222-2222-2222-2222-222222222222', 'beta',  'Beta Family');

insert into tenant_member (tenant_id, user_id, role) values
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000001', 'owner'),
  ('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-0000-0000-0000-000000000001', 'owner');

insert into person (id, tenant_id, is_living) values
  ('aaaa1111-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', true),
  ('aaaa1111-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', true),
  ('bbbb2222-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', true),
  ('bbbb2222-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', true);

insert into person_name (tenant_id, person_id, display_name) values
  ('11111111-1111-1111-1111-111111111111', 'aaaa1111-0000-0000-0000-000000000001', 'Alpha Elder'),
  ('22222222-2222-2222-2222-222222222222', 'bbbb2222-0000-0000-0000-000000000001', 'Beta Elder');

insert into relationship (tenant_id, type, from_person_id, to_person_id, parent_child_kind) values
  ('11111111-1111-1111-1111-111111111111', 'parent_child',
   'aaaa1111-0000-0000-0000-000000000001', 'aaaa1111-0000-0000-0000-000000000002', 'biological'),
  ('22222222-2222-2222-2222-222222222222', 'parent_child',
   'bbbb2222-0000-0000-0000-000000000001', 'bbbb2222-0000-0000-0000-000000000002', 'biological');

insert into assertion (tenant_id, subject_id, field, value, submitted_by) values
  ('11111111-1111-1111-1111-111111111111', 'aaaa1111-0000-0000-0000-000000000001',
   'birthDate', '"1948"'::jsonb, 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('22222222-2222-2222-2222-222222222222', 'bbbb2222-0000-0000-0000-000000000001',
   'birthDate', '"1952"'::jsonb, 'bbbbbbbb-0000-0000-0000-000000000001');

-- Executes a statement and reports how many rows it touched. SECURITY INVOKER, so RLS
-- is evaluated as the calling role rather than the definer.
create or replace function pg_temp.affected(stmt text)
returns int
language plpgsql
security invoker
as $fn$
declare
  n int;
begin
  execute stmt;
  get diagnostics n = row_count;
  return n;
end
$fn$;

-- Every table must have RLS enabled, forced, and at least one policy.
select is(
  (select count(*)::int from pg_tables t
    join pg_class c on c.relname = t.tablename
   where t.schemaname = 'public'
     and t.tablename in ('tenant','tenant_member','person','person_name','relationship','assertion')
     and c.relrowsecurity),
  6, 'RLS is enabled on all six domain tables'
);

select is(
  (select count(*)::int from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relname in ('tenant','tenant_member','person','person_name','relationship','assertion')
     and c.relforcerowsecurity),
  6, 'RLS is forced on all six domain tables, so the owner cannot bypass it'
);

-- Guards against a new table shipping without a policy.
select is(
  (select count(*)::int from pg_tables t
    where t.schemaname = 'public'
      and t.tablename not like 'pg_%'
      and not exists (
        select 1 from pg_policies p
        where p.schemaname = t.schemaname and p.tablename = t.tablename
      )),
  0, 'every table in public has at least one policy'
);

select isnt(
  (select rolbypassrls from pg_roles where rolname = 'app_user'),
  true, 'app_user cannot bypass RLS'
);

-- ---------------------------------------------------------------------------
-- Session scoped to tenant Alpha.
-- ---------------------------------------------------------------------------
set local role app_user;
set local app.current_tenant_id = '11111111-1111-1111-1111-111111111111';

select is((select count(*)::int from tenant), 1, 'alpha sees only its own tenant row');
select is((select count(*)::int from tenant_member), 1, 'alpha sees only its own members');
select is((select count(*)::int from person), 2, 'alpha sees only its own people');
select is((select count(*)::int from person_name), 1, 'alpha sees only its own names');
select is((select count(*)::int from relationship), 1, 'alpha sees only its own relationships');
select is((select count(*)::int from assertion), 1, 'alpha sees only its own assertions');

select is(
  (select count(*)::int from person where tenant_id = '22222222-2222-2222-2222-222222222222'),
  0, 'alpha cannot read beta people even when naming the tenant explicitly'
);
select is(
  (select count(*)::int from person where id = 'bbbb2222-0000-0000-0000-000000000001'),
  0, 'alpha cannot read a beta person by primary key'
);
select is(
  (select count(*)::int from person_name where person_id = 'bbbb2222-0000-0000-0000-000000000001'),
  0, 'alpha cannot read beta names by person id'
);
select is(
  (select count(*)::int from assertion where subject_id = 'bbbb2222-0000-0000-0000-000000000001'),
  0, 'alpha cannot read beta assertions by subject'
);

-- Updates and deletes must affect nothing in the other tenant.
select is(
  pg_temp.affected($$update person set is_living = false
    where tenant_id = '22222222-2222-2222-2222-222222222222'$$),
  0, 'alpha updates zero beta person rows'
);

select is(
  pg_temp.affected($$update person_name set display_name = 'hacked'
    where person_id = 'bbbb2222-0000-0000-0000-000000000001'$$),
  0, 'alpha updates zero beta name rows'
);

select is(
  pg_temp.affected($$update relationship set place = 'hacked'
    where tenant_id = '22222222-2222-2222-2222-222222222222'$$),
  0, 'alpha updates zero beta relationship rows'
);

select is(
  pg_temp.affected($$update assertion set accepted = true
    where tenant_id = '22222222-2222-2222-2222-222222222222'$$),
  0, 'alpha updates zero beta assertion rows'
);

select is(
  pg_temp.affected($$delete from person
    where tenant_id = '22222222-2222-2222-2222-222222222222'$$),
  0, 'alpha deletes zero beta person rows'
);

select is(
  pg_temp.affected($$delete from tenant_member
    where tenant_id = '22222222-2222-2222-2222-222222222222'$$),
  0, 'alpha deletes zero beta member rows'
);

select is(
  pg_temp.affected($$delete from assertion
    where tenant_id = '22222222-2222-2222-2222-222222222222'$$),
  0, 'alpha deletes zero beta assertion rows'
);

-- Inserting into another tenant must be refused by the WITH CHECK clause.
select throws_ok(
  $$insert into person (tenant_id, is_living)
    values ('22222222-2222-2222-2222-222222222222', true)$$,
  '42501', null, 'alpha cannot insert a person into beta'
);

select throws_ok(
  $$insert into person_name (tenant_id, person_id, display_name)
    values ('22222222-2222-2222-2222-222222222222',
            'bbbb2222-0000-0000-0000-000000000001', 'Injected')$$,
  '42501', null, 'alpha cannot insert a name into beta'
);

select throws_ok(
  $$insert into assertion (tenant_id, subject_id, field, value, submitted_by)
    values ('22222222-2222-2222-2222-222222222222',
            'bbbb2222-0000-0000-0000-000000000001', 'birthDate', '"1900"'::jsonb,
            'aaaaaaaa-0000-0000-0000-000000000001')$$,
  '42501', null, 'alpha cannot insert an assertion into beta'
);

-- Reassigning an owned row to another tenant is also a WITH CHECK violation.
select throws_ok(
  $$update person set tenant_id = '22222222-2222-2222-2222-222222222222'
     where id = 'aaaa1111-0000-0000-0000-000000000001'$$,
  '42501', null, 'alpha cannot move its own person into beta'
);

-- Alpha can still work normally inside its own tenant.
select is(
  pg_temp.affected($$insert into person (tenant_id, is_living)
    values ('11111111-1111-1111-1111-111111111111', true)$$),
  1, 'alpha can insert into its own tenant'
);

select ok(
  pg_temp.affected($$update person set is_living = false
    where tenant_id = '11111111-1111-1111-1111-111111111111'$$) > 0,
  'alpha can update its own rows'
);

-- ---------------------------------------------------------------------------
-- Session scoped to tenant Beta — the mirror image.
-- ---------------------------------------------------------------------------
set local app.current_tenant_id = '22222222-2222-2222-2222-222222222222';

select is((select count(*)::int from person), 2, 'beta sees only its own people');
select is((select count(*)::int from relationship), 1, 'beta sees only its own relationships');
select is(
  (select count(*)::int from person where id = 'aaaa1111-0000-0000-0000-000000000001'),
  0, 'beta cannot read an alpha person by primary key'
);
select is(
  (select count(*)::int from person where is_living = false),
  0, 'alpha''s update did not reach beta rows'
);

-- ---------------------------------------------------------------------------
-- No tenant context at all must deny everything, never fall open.
-- ---------------------------------------------------------------------------
set local app.current_tenant_id = '';

select is((select count(*)::int from person), 0, 'no tenant context reads zero people');
select is((select count(*)::int from tenant), 0, 'no tenant context reads zero tenants');
select is((select count(*)::int from assertion), 0, 'no tenant context reads zero assertions');

select * from finish();

rollback;
