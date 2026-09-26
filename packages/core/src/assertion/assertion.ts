/**
 * Evidence vs. conclusion, following the GEDCOM-X model (ADR-011).
 *
 * An **assertion** is something somebody claimed, with its source and confidence.
 * A **conclusion** is the value the tenant currently accepts. Keeping them apart from the
 * first migration is what lets contradictory records coexist instead of overwriting one
 * another — retrofitting this split is a known project-killer (R12).
 */

export const CONFIDENCE_LEVELS = ["low", "medium", "high"] as const;
export type Confidence = (typeof CONFIDENCE_LEVELS)[number];

export const SOURCE_KINDS = [
  "personal_knowledge",
  "family_story",
  "document",
  "photograph",
  "official_record",
  "dna",
  "other",
] as const;
export type SourceKind = (typeof SOURCE_KINDS)[number];

export interface AssertionSource {
  kind: SourceKind;
  /** Free-text citation: "Birth certificate, Kerala, 1948". */
  citation?: string | undefined;
  /** Media or document attachment. */
  mediaId?: string | undefined;
}

export interface Assertion<T = unknown> {
  id: string;
  tenantId: string;
  /** Entity the claim is about. */
  subjectId: string;
  /** Field being asserted, e.g. `birthDate` or `givenName`. */
  field: string;
  value: T;
  confidence: Confidence;
  source?: AssertionSource | undefined;
  submittedBy: string;
  submittedAt: Date;
  /** True when this assertion is the accepted conclusion for its field. */
  accepted: boolean;
}

const CONFIDENCE_RANK: Record<Confidence, number> = { low: 0, medium: 1, high: 2 };

const SOURCE_RANK: Record<SourceKind, number> = {
  official_record: 5,
  document: 4,
  dna: 4,
  photograph: 3,
  personal_knowledge: 2,
  family_story: 1,
  other: 0,
};

/**
 * Ranks competing claims so reviewers see the best-supported first. This orders
 * evidence for a human; it never silently picks a winner.
 */
export function rankAssertions<T>(assertions: readonly Assertion<T>[]): Assertion<T>[] {
  return [...assertions].sort((a, b) => {
    const byConfidence = CONFIDENCE_RANK[b.confidence] - CONFIDENCE_RANK[a.confidence];
    if (byConfidence !== 0) return byConfidence;

    const bySource =
      SOURCE_RANK[b.source?.kind ?? "other"] - SOURCE_RANK[a.source?.kind ?? "other"];
    if (bySource !== 0) return bySource;

    return b.submittedAt.getTime() - a.submittedAt.getTime();
  });
}

/** Claims for a field that disagree with the accepted conclusion. */
export function findConflicts<T>(
  assertions: readonly Assertion<T>[],
  isEqual: (a: T, b: T) => boolean = Object.is,
): Assertion<T>[] {
  const accepted = assertions.find((a) => a.accepted);
  if (accepted === undefined) return [];
  return assertions.filter((a) => !a.accepted && !isEqual(a.value, accepted.value));
}
