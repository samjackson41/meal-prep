import type { Meal } from "@/lib/schemas";

export type MealStatus = "pending" | "approved" | "removed";

export interface MealWithStatus extends Meal {
  id: string;
  status: MealStatus;
}
