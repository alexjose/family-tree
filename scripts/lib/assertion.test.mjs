import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { findConflicts, rankAssertions } from "../../packages/core/dist/index.js";

const at = (iso) => new Date(iso);

const claim = (overrides) => ({
  id: "a",
  tenantId: "t",
  subjectId: "p",
  field: "birthDate",
  value: "1948",
  confidence: "medium",
  submittedBy: "u",
  submittedAt: at("2026-01-01T00:00:00Z"),
  accepted: false,
  ...overrides,
});

describe("rankAssertions", () => {
  it("puts higher confidence first", () => {
    const ranked = rankAssertions([
      claim({ id: "low", confidence: "low" }),
      claim({ id: "high", confidence: "high" }),
      claim({ id: "medium", confidence: "medium" }),
    ]);
    assert.deepEqual(
      ranked.map((a) => a.id),
      ["high", "medium", "low"],
    );
  });

  it("breaks confidence ties by source strength", () => {
    const ranked = rankAssertions([
      claim({ id: "story", source: { kind: "family_story" } }),
      claim({ id: "record", source: { kind: "official_record" } }),
      claim({ id: "photo", source: { kind: "photograph" } }),
    ]);
    assert.deepEqual(
      ranked.map((a) => a.id),
      ["record", "photo", "story"],
    );
  });

  it("breaks remaining ties by recency", () => {
    const ranked = rankAssertions([
      claim({ id: "older", submittedAt: at("2020-01-01T00:00:00Z") }),
      claim({ id: "newer", submittedAt: at("2026-01-01T00:00:00Z") }),
    ]);
    assert.equal(ranked[0].id, "newer");
  });

  it("does not mutate its input", () => {
    const input = [
      claim({ id: "a", confidence: "low" }),
      claim({ id: "b", confidence: "high" }),
    ];
    rankAssertions(input);
    assert.equal(input[0].id, "a");
  });
});

describe("findConflicts", () => {
  // Contradictory records must coexist rather than overwrite one another.
  it("returns claims that disagree with the accepted conclusion", () => {
    const conflicts = findConflicts([
      claim({ id: "accepted", value: "1948", accepted: true }),
      claim({ id: "disagrees", value: "1949" }),
      claim({ id: "agrees", value: "1948" }),
    ]);
    assert.deepEqual(
      conflicts.map((a) => a.id),
      ["disagrees"],
    );
  });

  it("returns nothing when there is no accepted conclusion yet", () => {
    assert.deepEqual(
      findConflicts([claim({ value: "1948" }), claim({ value: "1949" })]),
      [],
    );
  });

  it("accepts a custom equality function for structured values", () => {
    const conflicts = findConflicts(
      [
        claim({ id: "accepted", value: { year: 1948 }, accepted: true }),
        claim({ id: "same", value: { year: 1948 } }),
        claim({ id: "different", value: { year: 1950 } }),
      ],
      (a, b) => a.year === b.year,
    );
    assert.deepEqual(
      conflicts.map((a) => a.id),
      ["different"],
    );
  });
});
