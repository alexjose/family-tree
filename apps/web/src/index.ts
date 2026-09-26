import { CORE_PACKAGE } from "@family-tree/core";
import { UI_PACKAGE } from "@family-tree/ui";

// Next.js is scaffolded in I1 (walking skeleton); this placeholder proves workspace wiring.
export const WEB_APP = `${CORE_PACKAGE}+${UI_PACKAGE}` as const;
