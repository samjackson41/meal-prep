# Meal Planner — Project Guidelines

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js (App Router) | React + Node in one project |
| Styling | Tailwind CSS 4 | Already configured |
| Components | shadcn/ui | Copy-into-repo model; files live in `components/ui/` — do not hand-edit |
| AI | Anthropic SDK — `claude-haiku-4-5-20251001` | Fast + cheap; sufficient for meal generation |
| Schema validation | Zod | Single source of truth in `lib/schemas.ts` |
| State | React built-ins (`useState`) | No Zustand/Jotai yet; add if state needs sharing across many components |
| Database | None yet | — |
| Auth | None yet | — |
| Deployment | Vercel | Free tier; connect GitHub repo for auto-deploy |

## Key Decisions & Reasoning

- **Haiku over Opus/Sonnet**: Meal generation doesn't need frontier reasoning. Haiku is 10–20× cheaper and responds in ~3–5 sec vs 10–15 sec.
- **Standard `messages.create` + Zod parse**: Preferred over beta structured output SDK features. Haiku reliably follows "return only JSON" instructions. Easier to debug.
- **shadcn/ui over Mantine**: Tailwind-native, we own the component code, huge community. Mantine would fight our Tailwind setup.
- **No global state manager yet**: All state is local to `app/page.tsx`. Add Zustand when approved meals need to appear in multiple unrelated parts of the UI.
- **No DB yet**: App is stateless — meals are generated fresh each session. Persistence can be added later (likely SQLite/Turso for simplicity).
- **No auth yet**: Single-user / small friend group. Add when sharing requires accounts.

## Project Structure

```
app/
  page.tsx              Main page — prompt input, meal count, card grid
  api/meals/route.ts    POST handler — calls Claude, returns MealPlan JSON
  layout.tsx            Root layout
components/
  MealCard.tsx          Meal card (pending / approved / removed states)
  ui/                   shadcn-generated — do not hand-edit
lib/
  schemas.ts            Zod schemas + inferred TS types (Ingredient, Meal, MealPlan)
```

## Patterns to Follow

- **Types from Zod**: Never write `interface` or `type` for API data shapes. Use `z.infer<typeof SomeSchema>`.
- **API key stays server-side**: Only call Anthropic from `app/api/` routes. Never import the SDK in client components.
- **MealWithStatus is frontend-only**: Extends `Meal` with `id` and `status`. Defined in `page.tsx`, not in `lib/schemas.ts`.
- **shadcn components**: Add new ones via `npx shadcn@latest add <component>`. Never manually edit `components/ui/`.

## Environment

```
ANTHROPIC_API_KEY=sk-ant-...   # required — add to .env.local, never commit
```

## Common Commands

```bash
npm run dev          # start dev server
npx tsc --noEmit     # type-check without building
npx shadcn@latest add <component>   # add a shadcn component
```
