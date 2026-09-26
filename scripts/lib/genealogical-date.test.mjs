import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  checkLifespan,
  checkParentChild,
  DateParseError,
  formatDate,
  isValidPartialDate,
  parseDate,
  toGedcom,
  toIso,
} from "../../packages/core/dist/index.js";

describe("parseDate", () => {
  it("reads a bare year", () => {
    const d = parseDate("1901");
    assert.equal(d.precision, "year");
    assert.equal(d.value.year, 1901);
  });

  it("reads a full ISO date", () => {
    const d = parseDate("1901-03-12");
    assert.equal(d.precision, "exact");
    assert.deepEqual(d.value, { year: 1901, month: 3, day: 12 });
  });

  it("reads month names, long and abbreviated", () => {
    assert.deepEqual(parseDate("12 March 1901").value, { year: 1901, month: 3, day: 12 });
    assert.deepEqual(parseDate("Mar 1901").value, { year: 1901, month: 3 });
  });

  // Elders type approximations far more often than exact dates.
  it("reads approximations in several spellings", () => {
    for (const input of ["about 1940", "abt 1940", "circa 1940", "c. 1940", "~1940"]) {
      assert.equal(parseDate(input).precision, "approximate", input);
      assert.equal(parseDate(input).value.year, 1940, input);
    }
  });

  it("reads a decade as a ten-year range", () => {
    const d = parseDate("1940s");
    assert.equal(d.precision, "range");
    assert.equal(d.value.year, 1940);
    assert.equal(d.end.year, 1949);
  });

  it("reads before and after", () => {
    assert.equal(parseDate("before 1965").precision, "before");
    assert.equal(parseDate("bef. 1965").precision, "before");
    assert.equal(parseDate("after 1918").precision, "after");
  });

  it("reads explicit ranges", () => {
    for (const input of ["1914-1918", "1914 to 1918", "between 1914 and 1918"]) {
      const d = parseDate(input);
      assert.equal(d.precision, "range", input);
      assert.equal(d.value.year, 1914, input);
      assert.equal(d.end.year, 1918, input);
    }
  });

  // Day-first is the dominant convention outside the United States.
  it("reads numeric dates day-first", () => {
    assert.deepEqual(parseDate("12/03/1901").value, { year: 1901, month: 3, day: 12 });
  });

  it("treats empty and unknown input as unknown", () => {
    assert.equal(parseDate("").precision, "unknown");
    assert.equal(parseDate("unknown").precision, "unknown");
    assert.equal(parseDate("?").precision, "unknown");
  });

  it("preserves what the contributor typed", () => {
    assert.equal(parseDate("  About 1940 ").original, "About 1940");
  });

  it("rejects impossible calendar dates", () => {
    assert.throws(() => parseDate("30/02/1901"), DateParseError);
    assert.throws(() => parseDate("1901-13-01"), DateParseError);
  });

  it("gives a plain-language error, not a regex", () => {
    assert.throws(
      () => parseDate("sometime in the war"),
      (e) => /Try a year like 1958/.test(e.message),
    );
  });
});

describe("isValidPartialDate", () => {
  it("accepts a leap day in a leap year and rejects it otherwise", () => {
    assert.equal(isValidPartialDate({ year: 2020, month: 2, day: 29 }), true);
    assert.equal(isValidPartialDate({ year: 2021, month: 2, day: 29 }), false);
  });

  it("rejects a day without a month", () => {
    assert.equal(isValidPartialDate({ year: 1901, day: 12 }), false);
  });
});

describe("rendering", () => {
  it("renders ISO/EDTF", () => {
    assert.equal(toIso(parseDate("1901-03-12")), "1901-03-12");
    assert.equal(toIso(parseDate("about 1940")), "1940~");
    assert.equal(toIso(parseDate("1914-1918")), "1914-01-01/1918-12-31");
    assert.equal(toIso(parseDate("before 1965")), "../1965-12-31");
    assert.equal(toIso(parseDate("after 1918")), "1918-01-01/..");
  });

  it("renders GEDCOM 7.0", () => {
    assert.equal(toGedcom(parseDate("1901-03-12")), "12 MAR 1901");
    assert.equal(toGedcom(parseDate("about 1940")), "ABT 1940");
    assert.equal(toGedcom(parseDate("before 1965")), "BEF 1965");
    assert.equal(toGedcom(parseDate("1914-1918")), "BET 1914 AND 1918");
  });

  it("renders for display in plain language", () => {
    assert.equal(formatDate(parseDate("1901")), "1901");
    assert.match(formatDate(parseDate("about 1940")), /^about /);
    assert.match(formatDate(parseDate("1901-03-12")), /1901/);
  });

  it("round-trips parse → render → parse without loss of precision", () => {
    for (const input of [
      "1901",
      "1901-03",
      "1901-03-12",
      "about 1940",
      "1914-1918",
      "before 1965",
      "after 1918",
    ]) {
      const first = parseDate(input);
      const second = parseDate(toIso(first));
      assert.equal(second.precision, first.precision, input);
      assert.deepEqual(second.value?.year, first.value?.year, input);
    }
  });
});

describe("plausibility warnings", () => {
  // Warnings, never hard errors: real records contain surprising dates.
  it("flags a death before a birth", () => {
    const warnings = checkLifespan(parseDate("1950"), parseDate("1940"));
    assert.equal(warnings[0].code, "death_before_birth");
  });

  it("does not flag overlapping imprecise dates", () => {
    assert.deepEqual(checkLifespan(parseDate("about 1950"), parseDate("1950")), []);
  });

  it("flags an implausible lifespan", () => {
    const warnings = checkLifespan(parseDate("1800"), parseDate("1950"));
    assert.ok(warnings.some((w) => w.code === "implausible_age"));
  });

  it("flags a future date", () => {
    const warnings = checkLifespan(parseDate("2100"), undefined, new Date("2026-01-01Z"));
    assert.ok(warnings.some((w) => w.code === "future_date"));
  });

  it("flags a child born before their parent", () => {
    const warnings = checkParentChild(parseDate("1970"), parseDate("1950"));
    assert.equal(warnings[0].code, "child_before_parent");
  });

  it("flags an implausibly young parent", () => {
    const warnings = checkParentChild(parseDate("1950"), parseDate("1958"));
    assert.equal(warnings[0].code, "parent_too_young");
  });

  it("accepts a normal parent-child gap", () => {
    assert.deepEqual(checkParentChild(parseDate("1950"), parseDate("1975")), []);
  });

  it("says nothing when a date is missing", () => {
    assert.deepEqual(checkParentChild(undefined, parseDate("1975")), []);
    assert.deepEqual(checkLifespan(undefined, undefined), []);
  });
});
