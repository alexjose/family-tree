-- Synthetic demo data. Never real family information (CONTRIBUTING.md).
--
-- Exercises the cases the schema must handle without modification (issue #19):
-- divorce, remarriage, adoption, half-siblings, multiple name variants and scripts.

insert into tenant (id, slug, display_name, locale) values
  ('00000000-0000-4000-8000-000000000001', 'demo', 'Demo Family', 'en');

insert into tenant_member (tenant_id, user_id, role) values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a1', 'owner');

insert into person (id, tenant_id, gender, is_living, birth_date) values
  -- First marriage.
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000001', 'male',   false, '{"precision":"year","value":{"year":1921}}'),
  ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000001', 'female', false, '{"precision":"approximate","value":{"year":1925}}'),
  -- Children of that marriage: full siblings.
  ('00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000001', 'male',   true,  '{"precision":"exact","value":{"year":1950,"month":3,"day":12}}'),
  ('00000000-0000-4000-8000-000000000104', '00000000-0000-4000-8000-000000000001', 'female', true,  '{"precision":"yearMonth","value":{"year":1953,"month":8}}'),
  -- Second marriage after divorce.
  ('00000000-0000-4000-8000-000000000105', '00000000-0000-4000-8000-000000000001', 'female', true,  '{"precision":"year","value":{"year":1932}}'),
  -- Half-sibling from the second marriage.
  ('00000000-0000-4000-8000-000000000106', '00000000-0000-4000-8000-000000000001', 'male',   true,  '{"precision":"year","value":{"year":1968}}'),
  -- Adopted child of the second marriage.
  ('00000000-0000-4000-8000-000000000107', '00000000-0000-4000-8000-000000000001', 'female', true,  '{"precision":"before","value":{"year":1972}}');

insert into person_name (tenant_id, person_id, type, given_name, family_name, display_name, script, is_primary) values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000101', 'birth', 'Thomas',  'Varghese', 'Thomas Varghese', 'en-Latn', true),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000102', 'birth', 'Mariamma','Joseph',   'Mariamma Joseph', 'en-Latn', true),
  -- Same person, second script: name variants must be first-class.
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000102', 'transliteration', null, null, 'മറിയാമ്മ ജോസഫ്', 'ml-Mlym', false),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000102', 'married', 'Mariamma', 'Varghese', 'Mariamma Varghese', 'en-Latn', false),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000103', 'birth', 'Kiran',   'Varghese', 'Kiran Varghese', 'en-Latn', true),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000103', 'nickname', null, null, 'Kichu', 'en-Latn', false),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000104', 'birth', 'Meera',   'Varghese', 'Meera Varghese', 'en-Latn', true),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000105', 'birth', 'Susan',   'Abraham',  'Susan Abraham', 'en-Latn', true),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000106', 'birth', 'Arjun',   'Varghese', 'Arjun Varghese', 'en-Latn', true),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000107', 'birth', 'Rhea',    'Varghese', 'Rhea Varghese', 'en-Latn', true);

insert into relationship (tenant_id, type, from_person_id, to_person_id, partnership_status, start_date, end_date) values
  -- Divorced first marriage, then remarriage: both must coexist.
  ('00000000-0000-4000-8000-000000000001', 'partnership', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000102', 'divorced',
   '{"precision":"year","value":{"year":1948}}', '{"precision":"year","value":{"year":1965}}'),
  ('00000000-0000-4000-8000-000000000001', 'partnership', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000105', 'married',
   '{"precision":"year","value":{"year":1966}}', null);

insert into relationship (tenant_id, type, from_person_id, to_person_id, parent_child_kind) values
  -- Full siblings: both parents shared.
  ('00000000-0000-4000-8000-000000000001', 'parent_child', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000103', 'biological'),
  ('00000000-0000-4000-8000-000000000001', 'parent_child', '00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000103', 'biological'),
  ('00000000-0000-4000-8000-000000000001', 'parent_child', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000104', 'biological'),
  ('00000000-0000-4000-8000-000000000001', 'parent_child', '00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000104', 'biological'),
  -- Half-sibling: only the father is shared.
  ('00000000-0000-4000-8000-000000000001', 'parent_child', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000106', 'biological'),
  ('00000000-0000-4000-8000-000000000001', 'parent_child', '00000000-0000-4000-8000-000000000105', '00000000-0000-4000-8000-000000000106', 'biological'),
  -- Adoption, and a step-parent link to the first marriage's children.
  ('00000000-0000-4000-8000-000000000001', 'parent_child', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000107', 'adopted'),
  ('00000000-0000-4000-8000-000000000001', 'parent_child', '00000000-0000-4000-8000-000000000105', '00000000-0000-4000-8000-000000000107', 'adopted'),
  ('00000000-0000-4000-8000-000000000001', 'parent_child', '00000000-0000-4000-8000-000000000105', '00000000-0000-4000-8000-000000000103', 'step'),
  ('00000000-0000-4000-8000-000000000001', 'parent_child', '00000000-0000-4000-8000-000000000105', '00000000-0000-4000-8000-000000000104', 'step');

-- Two contradictory claims about the same fact, one accepted: evidence vs. conclusion.
insert into assertion (tenant_id, subject_id, field, value, confidence, source_kind, source_citation, submitted_by, accepted) values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000102', 'birthDate',
   '{"precision":"approximate","value":{"year":1925}}', 'medium', 'family_story', 'Recalled by her daughter',
   '00000000-0000-4000-8000-0000000000a1', true),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000102', 'birthDate',
   '{"precision":"exact","value":{"year":1926,"month":11,"day":2}}', 'high', 'official_record', 'Parish baptism register',
   '00000000-0000-4000-8000-0000000000a1', false);
