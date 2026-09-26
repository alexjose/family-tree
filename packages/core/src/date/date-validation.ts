import type { GenealogicalDate } from "./genealogical-date.js";
import { earliestBound, latestBound } from "./genealogical-date.js";

/**
 * Date plausibility is reported as warnings, never hard errors. Real family records
 * legitimately contain surprising dates, and refusing the entry would lose the record
 * along with the contributor's willingness to keep typing.
 */

export type DateWarningCode =
  | "death_before_birth"
  | "child_before_parent"
  | "parent_too_young"
  | "implausible_age"
  | "future_date";

export interface DateWarning {
  code: DateWarningCode;
  message: string;
}

/** Below this, a parent is biologically implausible rather than merely surprising. */
const MIN_PARENT_AGE_YEARS = 12;
const MAX_AGE_YEARS = 122;

function year(date: GenealogicalDate | undefined): number | undefined {
  return date?.value?.year;
}

/** True only when the first date is certainly after the second, never when unclear. */
function certainlyAfter(a: GenealogicalDate, b: GenealogicalDate): boolean {
  const earliestA = earliestBound(a);
  const latestB = latestBound(b);
  if (earliestA === undefined || latestB === undefined) return false;
  return earliestA > latestB;
}

export function checkLifespan(
  birth: GenealogicalDate | undefined,
  death: GenealogicalDate | undefined,
  now: Date = new Date(),
): DateWarning[] {
  const warnings: DateWarning[] = [];

  if (birth !== undefined && death !== undefined && certainlyAfter(birth, death)) {
    warnings.push({
      code: "death_before_birth",
      message: "This death date is before the birth date.",
    });
  }

  const birthYear = year(birth);
  const deathYear = year(death);
  if (birthYear !== undefined && deathYear !== undefined) {
    if (deathYear - birthYear > MAX_AGE_YEARS) {
      warnings.push({
        code: "implausible_age",
        message: `That would make this person over ${MAX_AGE_YEARS} years old. Please double-check.`,
      });
    }
  }

  const currentYear = now.getUTCFullYear();
  for (const [date, label] of [
    [birth, "birth"],
    [death, "death"],
  ] as const) {
    const value = year(date);
    if (value !== undefined && value > currentYear) {
      warnings.push({
        code: "future_date",
        message: `This ${label} date is in the future.`,
      });
    }
  }

  return warnings;
}

export function checkParentChild(
  parentBirth: GenealogicalDate | undefined,
  childBirth: GenealogicalDate | undefined,
): DateWarning[] {
  if (parentBirth === undefined || childBirth === undefined) return [];
  const warnings: DateWarning[] = [];

  if (certainlyAfter(parentBirth, childBirth)) {
    warnings.push({
      code: "child_before_parent",
      message: "This child was born before their parent.",
    });
    return warnings;
  }

  const parentYear = year(parentBirth);
  const childYear = year(childBirth);
  if (parentYear !== undefined && childYear !== undefined) {
    const age = childYear - parentYear;
    if (age >= 0 && age < MIN_PARENT_AGE_YEARS) {
      warnings.push({
        code: "parent_too_young",
        message: `The parent would have been about ${age} years old. Please double-check.`,
      });
    }
  }

  return warnings;
}
