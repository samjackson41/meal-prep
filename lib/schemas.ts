import { z } from "zod";

export const IngredientSchema = z.object({
  name: z.string(),
  amount: z.string(),
  unit: z.string(),
});

export const MealSchema = z.object({
  name: z.string(),
  description: z.string(),
  cookingTime: z.number(),
  servings: z.number(),
  calories: z.number(),
  protein: z.string(),
  ingredients: z.array(IngredientSchema),
  instructions: z.array(z.string()).optional(),
  sourceUrl: z.string().url().optional(),
  image: z.string().url().optional(),
});

export const MealPlanSchema = z.object({
  meals: z.array(MealSchema),
});

export type Ingredient = z.infer<typeof IngredientSchema>;
export type Meal = z.infer<typeof MealSchema>;
export type MealPlan = z.infer<typeof MealPlanSchema>;
