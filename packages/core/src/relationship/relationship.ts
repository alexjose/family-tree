/**
 * Relationships are typed edges, never `father_id` / `mother_id` columns (ADR-010).
 * Only edges can represent adoption, step-parents, guardianship, multiple marriages,
 * and blended families without a schema rewrite.
 */

export const PARENT_CHILD_KINDS = [
  "biological",
  "adopted",
  "step",
  "foster",
  "guardian",
] as const;

export type ParentChildKind = (typeof PARENT_CHILD_KINDS)[number];

export const PARTNERSHIP_STATUSES = [
  "married",
  "engaged",
  "partnered",
  "separated",
  "divorced",
  "widowed",
  "annulled",
] as const;

export type PartnershipStatus = (typeof PARTNERSHIP_STATUSES)[number];

export type RelationshipType = "parent_child" | "partnership";

export interface ParentChildRelationship {
  type: "parent_child";
  parentId: string;
  childId: string;
  kind: ParentChildKind;
}

export interface PartnershipRelationship {
  type: "partnership";
  /** Order carries no meaning; a partnership is symmetric. */
  partnerAId: string;
  partnerBId: string;
  status: PartnershipStatus;
}

export type Relationship = ParentChildRelationship | PartnershipRelationship;

export class RelationshipValidationError extends Error {
  constructor(
    message: string,
    readonly code: RelationshipErrorCode,
  ) {
    super(message);
  }
}

export type RelationshipErrorCode =
  "self_reference" | "cycle" | "duplicate" | "partner_self_reference";

/** Parent→children adjacency, used to detect cycles before a write. */
export type ParentChildIndex = ReadonlyMap<string, readonly string[]>;

export function buildParentChildIndex(
  edges: readonly ParentChildRelationship[],
): ParentChildIndex {
  const index = new Map<string, string[]>();
  for (const edge of edges) {
    const children = index.get(edge.parentId);
    if (children === undefined) index.set(edge.parentId, [edge.childId]);
    else children.push(edge.childId);
  }
  return index;
}

/** True when `ancestorId` already appears above `personId`. */
export function isAncestorOf(
  index: ParentChildIndex,
  ancestorId: string,
  personId: string,
): boolean {
  const seen = new Set<string>();
  const queue = [...(index.get(ancestorId) ?? [])];

  while (queue.length > 0) {
    const current = queue.pop();
    if (current === undefined || seen.has(current)) continue;
    if (current === personId) return true;
    seen.add(current);
    queue.push(...(index.get(current) ?? []));
  }

  return false;
}

/**
 * Rejects edges that would corrupt the graph. Date plausibility is reported separately
 * as a warning, since real records legitimately contain surprising dates.
 */
export function validateParentChild(
  edge: ParentChildRelationship,
  existing: readonly ParentChildRelationship[],
): void {
  if (edge.parentId === edge.childId) {
    throw new RelationshipValidationError(
      "A person cannot be their own parent.",
      "self_reference",
    );
  }

  const duplicate = existing.some(
    (e) => e.parentId === edge.parentId && e.childId === edge.childId,
  );
  if (duplicate) {
    throw new RelationshipValidationError(
      "This parent and child are already linked.",
      "duplicate",
    );
  }

  // Adding parent→child when child is already an ancestor of parent closes a loop.
  if (isAncestorOf(buildParentChildIndex(existing), edge.childId, edge.parentId)) {
    throw new RelationshipValidationError(
      "That would make someone their own ancestor.",
      "cycle",
    );
  }
}

export function validatePartnership(
  edge: PartnershipRelationship,
  existing: readonly PartnershipRelationship[],
): void {
  if (edge.partnerAId === edge.partnerBId) {
    throw new RelationshipValidationError(
      "A person cannot be their own partner.",
      "partner_self_reference",
    );
  }

  const duplicate = existing.some(
    (e) =>
      (e.partnerAId === edge.partnerAId && e.partnerBId === edge.partnerBId) ||
      (e.partnerAId === edge.partnerBId && e.partnerBId === edge.partnerAId),
  );
  if (duplicate) {
    throw new RelationshipValidationError(
      "These two people are already linked as partners.",
      "duplicate",
    );
  }
}

/** Half-siblings share exactly one parent; full siblings share two or more. */
export function findSiblings(
  index: readonly ParentChildRelationship[],
  personId: string,
): { full: string[]; half: string[] } {
  const parentsOf = (id: string) =>
    new Set(index.filter((e) => e.childId === id).map((e) => e.parentId));

  const mine = parentsOf(personId);
  const candidates = new Set(
    index
      .filter((e) => mine.has(e.parentId) && e.childId !== personId)
      .map((e) => e.childId),
  );

  const full: string[] = [];
  const half: string[] = [];

  for (const candidate of candidates) {
    const shared = [...parentsOf(candidate)].filter((p) => mine.has(p)).length;
    if (shared >= 2) full.push(candidate);
    else half.push(candidate);
  }

  return { full: full.sort(), half: half.sort() };
}
