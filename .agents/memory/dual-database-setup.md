---
name: Dual database setup
description: The project uses two separate databases — Replit local PostgreSQL and Neon cloud. executeSql hits local; the API server uses Neon via NEON_DATABASE_URL.
---

## Rule
When adding columns or running schema changes via `executeSql`, those changes only apply to the **local Replit PostgreSQL**. The API server (and all Express routes) connect to **Neon** via `NEON_DATABASE_URL`. Any structural changes must be applied to both databases.

**Why:** `lib/db/src/index.ts` uses `NEON_DATABASE_URL ?? DATABASE_URL`. The Replit built-in `executeSql` tool connects to the local PostgreSQL (DATABASE_URL = local). So schema migrations done via `executeSql` never reach Neon.

**How to apply:** To migrate the Neon database, run an inline Node.js script using the pg package from the workspace:
```bash
node --input-type=module << 'EOF'
import pg from '/home/runner/workspace/node_modules/.pnpm/pg@8.20.0/node_modules/pg/lib/index.js';
const pool = new pg.Pool({ connectionString: process.env.NEON_DATABASE_URL });
await pool.query("ALTER TABLE ...");
await pool.end();
