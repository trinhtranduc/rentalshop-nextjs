/** Server-safe entry: types and pure logic. UI lives in `./ui` (client components). Nothing here imports from a host project. */
export * from "./core/types";
export { bucketsFor, countByBucket, parseMonths, teamWindow } from "./core/window";
export { STAGES, buildTeamReport } from "./core/report";
export * from "./core/teamRun";
export * from "./core/engine";
export * from "./core/pageAudit";
export * from "./core/competitors";
export * from "./core/rankings";
export * from "./core/rankReport";
export * from "./core/socialPosts";
