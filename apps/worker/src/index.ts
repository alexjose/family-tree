import { DB_PACKAGE } from "@family-tree/db";

// Background job runner (pgmq consumer); implemented alongside the queue work in I0.
export const WORKER_APP = DB_PACKAGE;
