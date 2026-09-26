import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildParentChildIndex,
  findSiblings,
  isAncestorOf,
  RelationshipValidationError,
  validateParentChild,
  validatePartnership,
} from "../../packages/core/dist/index.js";

const parentChild = (parentId, childId, kind = "biological") => ({
  type: "parent_child",
  parentId,
  childId,
  kind,
});

/**
 * A blended family, which the schema must represent without change (issue #19):
 *
 *   ama ──(married, divorced)── apa ──(married)── stepmum
 *    │                          │                   │
 *    └────────┬─────────────────┘                   │
 *          kiran, meera (full siblings)             │
 *                                                   │
 *                        apa + stepmum ── arjun (half-sibling)
 *                        apa + stepmum ── rhea  (adopted)
 */
const blended = [
  parentChild("ama", "kiran"),
  parentChild("apa", "kiran"),
  parentChild("ama", "meera"),
  parentChild("apa", "meera"),
  parentChild("apa", "arjun"),
  parentChild("stepmum", "arjun"),
  parentChild("apa", "rhea", "adopted"),
  parentChild("stepmum", "rhea", "adopted"),
];

describe("parent-child validation", () => {
  it("rejects a person as their own parent", () => {
    assert.throws(
      () => validateParentChild(parentChild("ama", "ama"), []),
      (e) => e instanceof RelationshipValidationError && e.code === "self_reference",
    );
  });

  it("rejects a duplicate edge", () => {
    assert.throws(
      () => validateParentChild(parentChild("ama", "kiran"), blended),
      (e) => e.code === "duplicate",
    );
  });

  // Without this, a tree can be made to contain itself.
  it("rejects an edge that would create a cycle", () => {
    assert.throws(
      () => validateParentChild(parentChild("kiran", "ama"), blended),
      (e) => e.code === "cycle",
    );
  });

  it("rejects a deeper cycle through a grandchild", () => {
    const withGrandchild = [...blended, parentChild("kiran", "baby")];
    assert.throws(
      () => validateParentChild(parentChild("baby", "ama"), withGrandchild),
      (e) => e.code === "cycle",
    );
  });

  it("accepts a legitimate new edge", () => {
    assert.doesNotThrow(() => validateParentChild(parentChild("kiran", "baby"), blended));
  });

  it("accepts multiple parents of different kinds for one child", () => {
    assert.doesNotThrow(() =>
      validateParentChild(parentChild("guardian-1", "rhea", "guardian"), blended),
    );
  });
});

describe("partnership validation", () => {
  const partnership = (a, b, status = "married") => ({
    type: "partnership",
    partnerAId: a,
    partnerBId: b,
    status,
  });

  it("rejects a person partnered with themselves", () => {
    assert.throws(
      () => validatePartnership(partnership("apa", "apa"), []),
      (e) => e.code === "partner_self_reference",
    );
  });

  it("rejects a duplicate regardless of order", () => {
    const existing = [partnership("apa", "ama", "divorced")];
    assert.throws(
      () => validatePartnership(partnership("ama", "apa"), existing),
      (e) => e.code === "duplicate",
    );
  });

  // Remarriage after divorce must remain representable.
  it("accepts a second partnership after a divorce", () => {
    const existing = [partnership("apa", "ama", "divorced")];
    assert.doesNotThrow(() =>
      validatePartnership(partnership("apa", "stepmum"), existing),
    );
  });
});

describe("ancestry", () => {
  it("detects a direct ancestor", () => {
    assert.equal(isAncestorOf(buildParentChildIndex(blended), "ama", "kiran"), true);
  });

  it("detects an indirect ancestor", () => {
    const deep = [...blended, parentChild("kiran", "baby")];
    assert.equal(isAncestorOf(buildParentChildIndex(deep), "ama", "baby"), true);
  });

  it("does not treat an unrelated person as an ancestor", () => {
    assert.equal(isAncestorOf(buildParentChildIndex(blended), "stepmum", "kiran"), false);
  });
});

describe("siblings in a blended family", () => {
  it("distinguishes full from half siblings", () => {
    const { full, half } = findSiblings(blended, "kiran");
    assert.deepEqual(full, ["meera"], "shares both parents");
    assert.deepEqual(half, ["arjun", "rhea"], "shares only the father");
  });

  it("treats an adopted child as a sibling of the household", () => {
    const { full } = findSiblings(blended, "rhea");
    assert.ok(full.includes("arjun"), "rhea and arjun share both parents");
  });

  it("returns nothing for an only child", () => {
    const { full, half } = findSiblings([parentChild("ama", "solo")], "solo");
    assert.deepEqual(full, []);
    assert.deepEqual(half, []);
  });
});
