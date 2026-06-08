---
name: Express params type cast
description: req.params values in Express are typed string|string[]; must cast before passing to Drizzle eq()
---

## Rule
Always cast `req.params` values with `String(req.params.x)` before passing to Drizzle's `eq()` or `parseInt()`.

```ts
// Wrong — TS error: string|string[] not assignable to string
const id = parseInt(req.params.id);
eq(table.token, req.params.token)

// Correct
const id = parseInt(String(req.params.id));
const token = String(req.params.token);
eq(table.token, token)
```

**Why:** Express types `req.params` as `Record<string, string | string[]>` because some router configurations allow array-valued params. Drizzle's `eq()` only accepts `string | SQLWrapper`, not `string[]`.
