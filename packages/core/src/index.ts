/**
 * Domain layer. Must have zero runtime dependencies and no framework or I/O imports
 * so that federation, plugins, and API extraction stay possible (ADR-005).
 */
export const CORE_PACKAGE = "@family-tree/core" as const;

export * from "./relationship/relationship.js";
export * from "./assertion/assertion.js";
export * from "./date/genealogical-date.js";
export * from "./date/date-validation.js";
