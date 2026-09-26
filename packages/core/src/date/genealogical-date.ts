/**
 * Genealogical dates are frequently imprecise. Storing strings or bare dates forces a
 * painful migration later, so precision is modelled explicitly from the start.
 */

export type DatePrecision =
  | "exact"
  | "approximate"
  | "range"
  | "before"
  | "after"
  | "year"
  | "yearMonth"
  | "unknown";

/** A partial calendar date. Month and day are absent when unknown. */
export interface PartialDate {
  year: number;
  month?: number | undefined;
  day?: number | undefined;
}

export interface GenealogicalDate {
  precision: DatePrecision;
  /** Primary value. Absent only when precision is `unknown`. */
  value?: PartialDate | undefined;
  /** Upper bound, for `range`. */
  end?: PartialDate | undefined;
  /** What the contributor actually typed, preserved verbatim. */
  original?: string | undefined;
}

export const UNKNOWN_DATE: GenealogicalDate = { precision: "unknown" };

export class DateParseError extends Error {}

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
] as const;

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function isValidPartialDate(date: PartialDate): boolean {
  if (!Number.isInteger(date.year)) return false;
  if (date.month !== undefined) {
    if (!Number.isInteger(date.month) || date.month < 1 || date.month > 12) return false;
  }
  if (date.day !== undefined) {
    if (date.month === undefined) return false;
    if (!Number.isInteger(date.day) || date.day < 1) return false;
    if (date.day > daysInMonth(date.year, date.month)) return false;
  }
  return true;
}

function pad(n: number, width = 2): string {
  return String(Math.abs(n)).padStart(width, "0");
}

function toIsoBound(date: PartialDate, edge: "start" | "end"): string {
  const year = pad(date.year, 4);
  if (date.month === undefined) {
    return edge === "start" ? `${year}-01-01` : `${year}-12-31`;
  }
  if (date.day === undefined) {
    return edge === "start"
      ? `${year}-${pad(date.month)}-01`
      : `${year}-${pad(date.month)}-${pad(daysInMonth(date.year, date.month))}`;
  }
  return `${year}-${pad(date.month)}-${pad(date.day)}`;
}

/**
 * Sortable bounds. `before`/`after` are open-ended on one side, so comparisons must
 * tolerate `undefined` rather than assuming a value.
 */
export function earliestBound(date: GenealogicalDate): string | undefined {
  if (date.precision === "before" || date.value === undefined) return undefined;
  return toIsoBound(date.value, "start");
}

export function latestBound(date: GenealogicalDate): string | undefined {
  if (date.precision === "after") return undefined;
  const value = date.precision === "range" ? (date.end ?? date.value) : date.value;
  if (value === undefined) return undefined;
  return toIsoBound(value, "end");
}

function parsePartial(text: string): PartialDate | undefined {
  const iso = /^(\d{3,4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?$/.exec(text);
  if (iso) {
    const date: PartialDate = { year: Number(iso[1]) };
    if (iso[2] !== undefined) date.month = Number(iso[2]);
    if (iso[3] !== undefined) date.day = Number(iso[3]);
    return isValidPartialDate(date) ? date : undefined;
  }

  // "12 March 1901", "March 1901"
  const words = /^(?:(\d{1,2}) )?([a-z]{3,})\.? (\d{3,4})$/.exec(text);
  if (words) {
    const prefix = (words[2] ?? "").slice(0, 3);
    const index = MONTHS.findIndex((m) => m.startsWith(prefix));
    if (index === -1) return undefined;
    const date: PartialDate = { year: Number(words[3]), month: index + 1 };
    if (words[1] !== undefined) date.day = Number(words[1]);
    return isValidPartialDate(date) ? date : undefined;
  }

  return undefined;
}

function qualified(
  precision: DatePrecision,
  text: string,
  original: string,
  input: string,
): GenealogicalDate {
  const value = parsePartial(text);
  if (value === undefined) throw new DateParseError(unreadable(input));
  return { precision, value, original };
}

function unreadable(input: string): string {
  return `Could not read the date "${input}". Try a year like 1958, "about 1940", or "12 March 1901".`;
}

/**
 * Accepts what people actually write: "1901", "about 1940", "1940s", "before 1965",
 * "1914-1918", "12 March 1901", "12/03/1901".
 */
export function parseDate(input: string): GenealogicalDate {
  const original = input.trim();
  if (original === "") return UNKNOWN_DATE;

  const text = original.toLowerCase().replace(/\s+/g, " ");

  if (/^(unknown|unk|\?+|n\/a)$/.test(text)) return { precision: "unknown", original };

  // EDTF forms, so our own exported values can be read back unchanged.
  const edtfApproximate = /^(.+)~$/.exec(text);
  if (edtfApproximate)
    return qualified("approximate", edtfApproximate[1] ?? "", original, input);

  const edtfBefore = /^\.\.\/(.+)$/.exec(text);
  if (edtfBefore) return qualified("before", edtfBefore[1] ?? "", original, input);

  const edtfAfter = /^(.+)\/\.\.$/.exec(text);
  if (edtfAfter) return qualified("after", edtfAfter[1] ?? "", original, input);

  const edtfRange = /^(.+)\/(.+)$/.exec(text);
  if (edtfRange) {
    const start = parsePartial((edtfRange[1] ?? "").trim());
    const end = parsePartial((edtfRange[2] ?? "").trim());
    if (start !== undefined && end !== undefined) {
      return { precision: "range", value: start, end, original };
    }
  }

  // A decade is a ten-year range.
  const decade = /^(\d{3,4})0s$/.exec(text);
  if (decade) {
    const start = Number(`${decade[1]}0`);
    return {
      precision: "range",
      value: { year: start },
      end: { year: start + 9 },
      original,
    };
  }

  const about = /^(?:about|abt\.?|circa|ca?\.?|around|approx\.?|~)\s*(.+)$/.exec(text);
  if (about) return qualified("approximate", about[1] ?? "", original, input);

  const before = /^(?:before|bef\.?|prior to|<)\s*(.+)$/.exec(text);
  if (before) return qualified("before", before[1] ?? "", original, input);

  const after = /^(?:after|aft\.?|since|>)\s*(.+)$/.exec(text);
  if (after) return qualified("after", after[1] ?? "", original, input);

  const range = /^(?:between\s+)?(.+?)\s*(?:–|—|\sto\s|\sand\s|-)\s*(.+)$/.exec(text);
  if (range) {
    const start = parsePartial((range[1] ?? "").trim());
    const end = parsePartial((range[2] ?? "").trim());
    if (start !== undefined && end !== undefined) {
      return { precision: "range", value: start, end, original };
    }
  }

  // Day-first numeric, the dominant convention outside the United States.
  const numeric = /^(\d{1,2})[/.](\d{1,2})[/.](\d{3,4})$/.exec(text);
  if (numeric) {
    const date: PartialDate = {
      year: Number(numeric[3]),
      month: Number(numeric[2]),
      day: Number(numeric[1]),
    };
    if (isValidPartialDate(date)) return { precision: "exact", value: date, original };
    throw new DateParseError(unreadable(input));
  }

  const partial = parsePartial(text);
  if (partial !== undefined) {
    const precision: DatePrecision =
      partial.day !== undefined
        ? "exact"
        : partial.month !== undefined
          ? "yearMonth"
          : "year";
    return { precision, value: partial, original };
  }

  throw new DateParseError(unreadable(input));
}

function formatCompact(value: PartialDate | undefined): string {
  if (value === undefined) return "";
  const year = pad(value.year, 4);
  if (value.month === undefined) return year;
  if (value.day === undefined) return `${year}-${pad(value.month)}`;
  return `${year}-${pad(value.month)}-${pad(value.day)}`;
}

/** ISO 8601 / EDTF-style rendering for export. */
export function toIso(date: GenealogicalDate): string {
  switch (date.precision) {
    case "unknown":
      return "";
    case "range":
      return `${earliestBound(date) ?? ""}/${latestBound(date) ?? ""}`;
    case "before":
      return `../${latestBound(date) ?? ""}`;
    case "after":
      return `${earliestBound(date) ?? ""}/..`;
    case "approximate":
      return `${formatCompact(date.value)}~`;
    default:
      return formatCompact(date.value);
  }
}

/** GEDCOM 7.0 date rendering. */
export function toGedcom(date: GenealogicalDate): string {
  const render = (value: PartialDate | undefined): string => {
    if (value === undefined) return "";
    const parts: string[] = [];
    if (value.day !== undefined) parts.push(String(value.day));
    if (value.month !== undefined) {
      parts.push((MONTHS[value.month - 1] ?? "").slice(0, 3).toUpperCase());
    }
    parts.push(String(value.year));
    return parts.join(" ");
  };

  switch (date.precision) {
    case "unknown":
      return "";
    case "approximate":
      return `ABT ${render(date.value)}`;
    case "before":
      return `BEF ${render(date.value)}`;
    case "after":
      return `AFT ${render(date.value)}`;
    case "range":
      return `BET ${render(date.value)} AND ${render(date.end)}`;
    default:
      return render(date.value);
  }
}

/** Locale-aware display. Falls back to the original text when precision is unknown. */
export function formatDate(date: GenealogicalDate, locale = "en"): string {
  if (date.precision === "unknown") return date.original ?? "Unknown";

  const render = (value: PartialDate | undefined): string => {
    if (value === undefined) return "";
    if (value.month === undefined) return String(value.year);
    const utc = Date.UTC(value.year, value.month - 1, value.day ?? 1);
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "long",
      ...(value.day !== undefined ? { day: "numeric" } : {}),
      timeZone: "UTC",
    }).format(new Date(utc));
  };

  switch (date.precision) {
    case "approximate":
      return `about ${render(date.value)}`;
    case "before":
      return `before ${render(date.value)}`;
    case "after":
      return `after ${render(date.value)}`;
    case "range":
      return `${render(date.value)}–${render(date.end)}`;
    default:
      return render(date.value);
  }
}
