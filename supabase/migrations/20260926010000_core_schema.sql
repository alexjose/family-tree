-- Core schema: tenant, membership, person, names, typed relationships, assertions.
-- Every table is tenant-scoped and RLS-protected (ADR-003, ADR-010, ADR-011).

create type tenant_role as enum (
  'guest', 'member', 'verified_contributor', 'guardian',
  'branch_moderator', 'admin', 'owner'
);

create type parent_child_kind as enum (
  'biological', 'adopted', 'step', 'foster', 'guardian'
);

create type partnership_status as enum (
  'married', 'engaged', 'partnered', 'separated', 'divorced', 'widowed', 'annulled'
);

create type relationship_type as enum ('parent_child', 'partnership');

create type name_type as enum (
  'birth', 'married', 'nickname', 'religious', 'transliteration', 'also_known_as'
);

create type confidence as enum ('low', 'medium', 'high');

create type source_kind as enum (
  'personal_knowledge', 'family_story', 'document', 'photograph',
  'official_record', 'dna', 'other'
);

create type visibility as enum ('members', 'family', 'private');

create table tenant (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  display_name text not null,
  locale text not null default 'en',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint tenant_slug_key unique (slug)
);

create table tenant_member (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenant (id) on delete cascade,
  user_id uuid not null,
  role tenant_role not null default 'member',
  verified_scope jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint tenant_member_unique unique (tenant_id, user_id)
);
create index tenant_member_tenant_idx on tenant_member (tenant_id);

create table person (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenant (id) on delete cascade,
  claimed_by_user_id uuid,
  gender text,
  is_living boolean not null default true,
  birth_date jsonb,
  death_date jsonb,
  birth_place text,
  death_place text,
  biography text,
  default_visibility visibility not null default 'family',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index person_tenant_idx on person (tenant_id);
create index person_claimed_idx on person (claimed_by_user_id);

create table person_name (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenant (id) on delete cascade,
  person_id uuid not null references person (id) on delete cascade,
  type name_type not null default 'birth',
  given_name text,
  family_name text,
  display_name text not null,
  script text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index person_name_person_idx on person_name (person_id);
create index person_name_tenant_idx on person_name (tenant_id);

-- Fuzzy and phonetic search over names (FEATURES.md §2.5).
create index person_name_trgm_idx on person_name using gin (display_name extensions.gin_trgm_ops);

create table relationship (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenant (id) on delete cascade,
  type relationship_type not null,
  from_person_id uuid not null references person (id) on delete cascade,
  to_person_id uuid not null references person (id) on delete cascade,
  parent_child_kind parent_child_kind,
  partnership_status partnership_status,
  start_date jsonb,
  end_date jsonb,
  place text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint relationship_unique unique (tenant_id, type, from_person_id, to_person_id),
  constraint relationship_no_self_edge check (from_person_id <> to_person_id),
  -- The discriminator decides which qualifier column is meaningful.
  constraint relationship_kind_matches_type check (
    (type = 'parent_child' and parent_child_kind is not null and partnership_status is null)
    or
    (type = 'partnership' and partnership_status is not null and parent_child_kind is null)
  )
);
create index relationship_tenant_idx on relationship (tenant_id);
create index relationship_from_idx on relationship (from_person_id);
create index relationship_to_idx on relationship (to_person_id);

create table assertion (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenant (id) on delete cascade,
  subject_id uuid not null,
  field text not null,
  value jsonb not null,
  confidence confidence not null default 'medium',
  source_kind source_kind not null default 'personal_knowledge',
  source_citation text,
  submitted_by uuid not null,
  accepted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index assertion_tenant_idx on assertion (tenant_id);
create index assertion_subject_idx on assertion (subject_id, field);

-- At most one accepted conclusion per subject and field.
create unique index assertion_one_accepted_idx
  on assertion (tenant_id, subject_id, field)
  where accepted and deleted_at is null;
