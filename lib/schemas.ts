import { z } from "zod";

// --- Preferences ---

export const CookingMethodSchema = z.enum([
  "pan_seared",
  "grill",
  "oven",
  "air_fryer",
  "crock_pot",
  "microwave",
]);

export const FavorTokenSchema = z.enum([
  "high_protein",
  "whole_grains",
  "olive_oil",
  "grass_fed",
  "low_sugar",
  "high_fiber",
  "lean_meats",
  "leafy_greens",
]);

export const HealthProfileSchema = z.object({
  favor: z.array(z.union([FavorTokenSchema, z.string()])),
});

export const UserPreferencesSchema = z.object({
  cookingMethods: z.array(CookingMethodSchema),
  healthProfile: HealthProfileSchema,
});

export type CookingMethod = z.infer<typeof CookingMethodSchema>;
export type FavorToken = z.infer<typeof FavorTokenSchema>;
export type HealthProfile = z.infer<typeof HealthProfileSchema>;
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;

// --- Chat ---

export const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

export const SpoonacularParamsSchema = z.object({
  query: z.string(),
  cuisine: z.string().optional(),
  diet: z.string().optional(),
  type: z.string().optional(),
  maxReadyTime: z.number().int().positive().optional(),
});

export const ChatRequestSchema = z.object({
  message: z.string().min(1),
  history: z.array(ChatMessageSchema),
  preferences: UserPreferencesSchema,
  count: z.number().int().min(1).max(6),
});

export const ChatResponseSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("question"), content: z.string() }),
  z.object({
    type: z.literal("ready"),
    spoonacularParams: SpoonacularParamsSchema,
    summary: z.string(),
  }),
  z.object({
    type: z.literal("generate"),
    prompt: z.string(),
    summary: z.string(),
  }),
]);

export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type SpoonacularParams = z.infer<typeof SpoonacularParamsSchema>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type ChatResponse = z.infer<typeof ChatResponseSchema>;

// --- Meals ---

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
