import type { Meal, Ingredient } from "@/lib/schemas";

export interface SpoonacularNutrient {
  name: string;
  amount: number;
  unit: string;
}

export interface SpoonacularIngredient {
  nameClean?: string;
  name: string;
  amount: number;
  unit: string;
  measures?: {
    metric?: { amount: number; unitShort: string };
  };
}

export interface SpoonacularStep {
  number: number;
  step: string;
}

export interface SpoonacularRecipe {
  id: number;
  title: string;
  summary: string;
  readyInMinutes: number;
  servings: number;
  image?: string;
  sourceUrl?: string;
  nutrition?: {
    nutrients: SpoonacularNutrient[];
  };
  extendedIngredients?: SpoonacularIngredient[];
  analyzedInstructions?: Array<{ steps: SpoonacularStep[] }>;
}

export interface SpoonacularSearchResponse {
  results: SpoonacularRecipe[];
  totalResults: number;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&[a-z]+;/gi, " ").trim();
}

function getNutrientValue(
  nutrients: SpoonacularNutrient[],
  name: string
): number {
  return Math.round(
    nutrients.find((n) => n.name.toLowerCase() === name.toLowerCase())?.amount ?? 0
  );
}

export function mapSpoonacularToMeal(recipe: SpoonacularRecipe): Meal {
  const nutrients = recipe.nutrition?.nutrients ?? [];

  const ingredients: Ingredient[] = (recipe.extendedIngredients ?? []).map(
    (ing) => ({
      name: ing.nameClean ?? ing.name,
      amount: String(ing.measures?.metric?.amount ?? ing.amount),
      unit: ing.measures?.metric?.unitShort ?? ing.unit ?? "",
    })
  );

  const instructions: string[] =
    recipe.analyzedInstructions?.[0]?.steps.map((s) => s.step) ?? [];

  return {
    name: recipe.title,
    description: stripHtml(recipe.summary).slice(0, 250),
    cookingTime: recipe.readyInMinutes,
    servings: recipe.servings,
    calories: getNutrientValue(nutrients, "calories"),
    protein: `${getNutrientValue(nutrients, "protein")}g`,
    ingredients,
    instructions: instructions.length > 0 ? instructions : undefined,
    sourceUrl: recipe.sourceUrl,
    image: recipe.image,
  };
}
