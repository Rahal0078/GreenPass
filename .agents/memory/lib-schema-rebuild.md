---
name: Lib schema rebuild required
description: Must run typecheck:libs to regenerate composite lib declarations before artifact typechecks see new columns.
---

When new columns are added to `lib/db/src/schema/*.ts`, the TypeScript declarations for the lib package are stale until rebuilt. Artifact packages (`artifacts/api-server`, etc.) see the OLD inferred types until lib is rebuilt.

**Rule:** Always run `pnpm run typecheck:libs` after any schema change in `lib/`, BEFORE running artifact typechecks.

**Why:** `lib/db` is a composite TypeScript project (`composite: true`, `emitDeclarationOnly`). Its `.d.ts` output is what artifact packages import. The source `.ts` file is correct, but the emitted declaration is what TypeScript actually reads — so artifacts will report "property does not exist" even when the schema file has the correct column, until `tsc --build` regenerates the declarations.

**How to apply:** Any time you see "property does not exist on type '{ ... }'` errors in an artifact's typecheck where the property clearly exists in a lib schema file — run `pnpm run typecheck:libs` first, then re-run the artifact typecheck.
