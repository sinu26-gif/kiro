---
inclusion: always
---

# Himova — Coding Conventions

## TypeScript
- `strict: true` in `tsconfig.json`. No `any` unless absolutely necessary, then comment why.
- Prefer `type` aliases for unions and primitives, `interface` for object shapes that may be extended.
- All exported functions have explicit return types.

## File and Folder Naming
- Folders: `kebab-case` (`product-list`, `pos-session`).
- React components: `PascalCase.tsx` (`ProductCard.tsx`).
- Hooks: `useCamelCase.ts` (`useCart.ts`).
- Utilities: `camelCase.ts` (`formatNpr.ts`).

## Components
- One component per file.
- Server components by default; add `"use client"` only when you need state, effects, or browser APIs.
- Co-locate related components in a folder; export the public one from `index.ts`.
- Props are typed via a local `Props` type, not inline.

## Server Actions and Route Handlers
- Validate every input with Zod at the top of the handler.
- Always wrap database mutations that touch more than one table in a transaction (Supabase RPC or PostgREST patterns).
- Return typed responses: `{ ok: true, data }` or `{ ok: false, error }`.
- Never trust the client; re-derive permissions on the server.

## Database
- Migrations live in `supabase/migrations/` with timestamped filenames.
- RLS policies are mandatory on every table that holds user-scoped data.
- Foreign keys always have `ON DELETE` behaviour specified.

## Money and Numbers
- Money is stored as an integer in paisa.
- A `formatNpr(value)` utility converts to display strings like `Rs 4,250`.
- Never use `parseFloat` on money input from forms; parse to integer paisa immediately.

## Localisation
- No hard-coded user-facing strings in components — always use `useTranslations()` from `next-intl`.
- Keep translation keys hierarchical: `pos.actions.addToCart`, `orders.status.shipped`.

## Forms
- React Hook Form + Zod resolver.
- Show inline errors, not toast errors, for validation.
- Use toast only for server outcomes (success/failure of an action).

## Errors
- User-facing error messages are short, bilingual, and never leak stack traces.
- All server errors are logged with the user id and the action attempted.

## Accessibility
- Every interactive element is keyboard reachable.
- Tap targets on the shopkeeper UI are at least 44x44 px.
- Colour is never the only signal for state (icons + text always).

## Performance
- Images served via `next/image` with explicit `sizes` props.
- Defer non-critical JS with `next/dynamic`.
- Server-render lists; paginate anything that can grow past 50 rows.

## Git
- Branch per feature: `feat/<short-name>`.
- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`.
- Pull requests require a passing build and a one-line description of what changed and why.
