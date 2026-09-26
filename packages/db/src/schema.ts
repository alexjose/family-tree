import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Every table carries a non-nullable `tenant_id` and has RLS enabled in the migration,
 * so a forgotten `where tenant_id = …` returns zero rows instead of leaking (ADR-003).
 */

export const tenantRole = pgEnum("tenant_role", [
  "guest",
  "member",
  "verified_contributor",
  "guardian",
  "branch_moderator",
  "admin",
  "owner",
]);

export const parentChildKind = pgEnum("parent_child_kind", [
  "biological",
  "adopted",
  "step",
  "foster",
  "guardian",
]);

export const partnershipStatus = pgEnum("partnership_status", [
  "married",
  "engaged",
  "partnered",
  "separated",
  "divorced",
  "widowed",
  "annulled",
]);

export const relationshipType = pgEnum("relationship_type", [
  "parent_child",
  "partnership",
]);

export const nameType = pgEnum("name_type", [
  "birth",
  "married",
  "nickname",
  "religious",
  "transliteration",
  "also_known_as",
]);

export const confidence = pgEnum("confidence", ["low", "medium", "high"]);

export const sourceKind = pgEnum("source_kind", [
  "personal_knowledge",
  "family_story",
  "document",
  "photograph",
  "official_record",
  "dna",
  "other",
]);

export const visibility = pgEnum("visibility", ["members", "family", "private"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  // Soft delete only; nothing is ever hard-deleted.
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
};

export const tenant = pgTable(
  "tenant",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    displayName: text("display_name").notNull(),
    locale: text("locale").notNull().default("en"),
    /** Per-tenant settings: branding, privacy defaults, approval rules. */
    settings: jsonb("settings")
      .notNull()
      .default(sql`'{}'::jsonb`),
    ...timestamps,
  },
  (table) => [unique("tenant_slug_key").on(table.slug)],
);

export const tenantMember = pgTable(
  "tenant_member",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    role: tenantRole("role").notNull().default("member"),
    /** Verified contributors bypass review within this scope (FEATURES.md §3.2). */
    verifiedScope: jsonb("verified_scope"),
    ...timestamps,
  },
  (table) => [
    unique("tenant_member_unique").on(table.tenantId, table.userId),
    index("tenant_member_tenant_idx").on(table.tenantId),
  ],
);

export const person = pgTable(
  "person",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "cascade" }),
    /** Set once a user claims this person as themselves. */
    claimedByUserId: uuid("claimed_by_user_id"),
    /** Free text, not an enum — gender identity is not a closed set. */
    gender: text("gender"),
    isLiving: boolean("is_living").notNull().default(true),
    /** Structured genealogical dates; the parser arrives with issue #22. */
    birthDate: jsonb("birth_date"),
    deathDate: jsonb("death_date"),
    birthPlace: text("birth_place"),
    deathPlace: text("death_place"),
    biography: text("biography"),
    defaultVisibility: visibility("default_visibility").notNull().default("family"),
    ...timestamps,
  },
  (table) => [
    index("person_tenant_idx").on(table.tenantId),
    index("person_claimed_idx").on(table.claimedByUserId),
  ],
);

export const personName = pgTable(
  "person_name",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "cascade" }),
    personId: uuid("person_id")
      .notNull()
      .references(() => person.id, { onDelete: "cascade" }),
    type: nameType("type").notNull().default("birth"),
    givenName: text("given_name"),
    familyName: text("family_name"),
    /** Full name as written, preserving the culture's own ordering. */
    displayName: text("display_name").notNull(),
    /** BCP-47 tag, so the same name can be stored in multiple scripts. */
    script: text("script"),
    isPrimary: boolean("is_primary").notNull().default(false),
    ...timestamps,
  },
  (table) => [
    index("person_name_person_idx").on(table.personId),
    index("person_name_tenant_idx").on(table.tenantId),
  ],
);

/**
 * One table for both edge kinds. `parent_child` uses (from = parent, to = child);
 * `partnership` is symmetric and its direction carries no meaning.
 */
export const relationship = pgTable(
  "relationship",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "cascade" }),
    type: relationshipType("type").notNull(),
    fromPersonId: uuid("from_person_id")
      .notNull()
      .references(() => person.id, { onDelete: "cascade" }),
    toPersonId: uuid("to_person_id")
      .notNull()
      .references(() => person.id, { onDelete: "cascade" }),
    parentChildKind: parentChildKind("parent_child_kind"),
    partnershipStatus: partnershipStatus("partnership_status"),
    startDate: jsonb("start_date"),
    endDate: jsonb("end_date"),
    place: text("place"),
    ...timestamps,
  },
  (table) => [
    index("relationship_tenant_idx").on(table.tenantId),
    index("relationship_from_idx").on(table.fromPersonId),
    index("relationship_to_idx").on(table.toPersonId),
    unique("relationship_unique").on(
      table.tenantId,
      table.type,
      table.fromPersonId,
      table.toPersonId,
    ),
  ],
);

/** A claimed fact with its source and confidence, separate from the accepted value. */
export const assertion = pgTable(
  "assertion",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id").notNull(),
    field: text("field").notNull(),
    value: jsonb("value").notNull(),
    confidence: confidence("confidence").notNull().default("medium"),
    sourceKind: sourceKind("source_kind").notNull().default("personal_knowledge"),
    sourceCitation: text("source_citation"),
    submittedBy: uuid("submitted_by").notNull(),
    /** Exactly one accepted assertion per (subject, field) is the conclusion. */
    accepted: boolean("accepted").notNull().default(false),
    ...timestamps,
  },
  (table) => [
    index("assertion_tenant_idx").on(table.tenantId),
    index("assertion_subject_idx").on(table.subjectId, table.field),
  ],
);
