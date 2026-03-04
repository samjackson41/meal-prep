# Meal Planner — Project Guidelines

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js (App Router) | React + Node in one project |
| Styling | Tailwind CSS 4 | Already configured |
| Components | shadcn/ui | Copy-into-repo model; files live in `components/ui/` — do not hand-edit |
| AI | Anthropic SDK — `claude-haiku-4-5-20251001` | Fast + cheap; fallback when Spoonacular finds nothing |
| Recipe data | Spoonacular API | Primary source — real recipes with images, instructions, nutrition |
| Schema validation | Zod | Single source of truth in `lib/schemas.ts` |
| State | React built-ins (`useState`) + `useLocalRecipes` hook | No Zustand yet |
| Persistence | localStorage (`meal-prep:saved-recipes`) | MVP only — swap for cloud DB when deploying |
| Database | None yet | Future: Turso/Vercel Postgres |
| Auth | None yet | — |
| Deployment | Vercel | Free tier; connect GitHub repo for auto-deploy |

## Key Decisions & Reasoning

- **Haiku over Opus/Sonnet**: Meal generation doesn't need frontier reasoning. Haiku is 10–20× cheaper and responds in ~3–5 sec vs 10–15 sec.
- **Standard `messages.create` + Zod parse**: Preferred over beta structured output SDK features. Haiku reliably follows "return only JSON" instructions. Easier to debug.
- **shadcn/ui over Mantine**: Tailwind-native, we own the component code, huge community. Mantine would fight our Tailwind setup.
- **Spoonacular-first, Claude fallback**: `/api/meals` searches Spoonacular first for real recipes with images and instructions. Falls back to Claude Haiku if Spoonacular returns nothing or key is missing.
- **localStorage for recipe persistence**: Approved meals saved to `meal-prep:saved-recipes` via `useLocalRecipes` hook. MVP only — swap for cloud DB when deploying multi-user.
- **Cross-component sync via storage events**: Nav badge ↔ save action sync uses native `storage` event + synthetic dispatch from `writeToStorage`. Add Zustand if state complexity grows.
- **No auth yet**: Single-user / small friend group. Add when sharing requires accounts.

## Project Structure

```
app/
  page.tsx              Main page — prompt input, meal count, card grid
  recipes/page.tsx      My Recipes page — saved/approved meals from localStorage
  api/meals/route.ts    POST handler — Spoonacular first, Claude fallback
  layout.tsx            Root layout with NavBar
components/
  MealCard.tsx          Meal card (pending / approved / removed states; variant="search"|"saved")
  NavBar.tsx            Nav with Search + My Recipes links; live saved-count badge
  ui/                   shadcn-generated — do not hand-edit
lib/
  schemas.ts            Zod schemas + inferred TS types (Ingredient, Meal, MealPlan)
  types.ts              Frontend-only types (MealStatus, MealWithStatus)
  spoonacular.ts        Spoonacular response types + mapSpoonacularToMeal()
  hooks/
    useLocalRecipes.ts  localStorage hook — savedRecipes, saveRecipe, removeRecipe
```

## Patterns to Follow

- **Types from Zod**: Never write `interface` or `type` for API data shapes. Use `z.infer<typeof SomeSchema>`.
- **API keys stay server-side**: Only call Anthropic/Spoonacular from `app/api/` routes. Never import these SDKs in client components.
- **MealWithStatus lives in `lib/types.ts`**: Frontend-only type extending `Meal` with `id` and `status`.
- **shadcn components**: Add new ones via `npx shadcn@latest add <component>`. Never manually edit `components/ui/`.

## Environment

```
ANTHROPIC_API_KEY=sk-ant-...      # required — add to .env.local, never commit
SPOONACULAR_API_KEY=...            # optional — falls back to Claude if missing; get key at spoonacular.com/food-api
```

## Common Commands

```bash
npm run dev          # start dev server
npx tsc --noEmit     # type-check without building
npx shadcn@latest add <component>   # add a shadcn component
```
