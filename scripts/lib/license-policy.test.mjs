import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  findViolations,
  isAllowed,
  parseExpression,
  parsePnpmOutput,
} from "./license-policy.mjs";

describe("isAllowed", () => {
  it("accepts permissive identifiers", () => {
    for (const id of ["MIT", "Apache-2.0", "ISC", "BSD-3-Clause", "0BSD"]) {
      assert.equal(isAllowed(id), true, id);
    }
  });

  it("rejects copyleft identifiers", () => {
    for (const id of ["GPL-3.0", "AGPL-3.0", "LGPL-2.1", "MPL-2.0", "SSPL-1.0"]) {
      assert.equal(isAllowed(id), false, id);
    }
  });

  it("rejects licenses that were never explicitly approved", () => {
    for (const id of ["WTFPL", "CC0-1.0", "Unlicense", "UNKNOWN", ""]) {
      assert.equal(isAllowed(id), false, id);
    }
  });

  it("accepts an OR expression when any branch is permissive", () => {
    assert.equal(isAllowed("MIT OR GPL-3.0"), true);
    assert.equal(isAllowed("(MIT OR Apache-2.0)"), true);
  });

  it("rejects an OR expression when no branch is permissive", () => {
    assert.equal(isAllowed("GPL-3.0 OR AGPL-3.0"), false);
  });

  // The defect this guards: AND once behaved like OR, letting GPL through.
  it("rejects an AND expression unless every license is permissive", () => {
    assert.equal(isAllowed("MIT AND GPL-3.0"), false);
    assert.equal(isAllowed("MIT AND Apache-2.0"), true);
  });

  it("treats a mixed expression as AND so it fails closed", () => {
    assert.equal(isAllowed("MIT OR Apache-2.0 AND GPL-3.0"), false);
  });

  it("ignores a trailing '+' version marker", () => {
    assert.equal(parseExpression("Apache-2.0+").ids[0], "Apache-2.0");
  });
});

describe("parsePnpmOutput", () => {
  it("parses JSON output", () => {
    assert.deepEqual(parsePnpmOutput('{"MIT":[]}'), { MIT: [] });
  });

  it("treats pnpm's empty notice as no dependencies", () => {
    assert.deepEqual(parsePnpmOutput("No licenses in packages found"), {});
  });

  // The defect this guards: unparseable output once returned {} and exited 0.
  it("throws on unexpected output rather than reporting a false pass", () => {
    assert.throws(() => parsePnpmOutput("ERR_PNPM_NO_LOCKFILE"), /did not run/);
    assert.throws(() => parsePnpmOutput(""), /did not run/);
  });
});

describe("findViolations", () => {
  it("returns nothing when every license is permissive", () => {
    assert.deepEqual(findViolations({ MIT: [{ name: "a", versions: ["1.0.0"] }] }), []);
  });

  it("reports each package carrying a disallowed license", () => {
    const violations = findViolations({
      "GPL-3.0": [
        { name: "bad", versions: ["1.0.0"] },
        { name: "worse", versions: ["2.0.0"] },
      ],
      MIT: [{ name: "fine", versions: ["1.0.0"] }],
    });
    assert.equal(violations.length, 2);
    assert.deepEqual(
      violations.map((v) => v.name),
      ["bad", "worse"],
    );
  });

  it("tolerates a package with no version list", () => {
    assert.equal(findViolations({ "GPL-3.0": [{ name: "bad" }] })[0].versions, "");
  });
});
