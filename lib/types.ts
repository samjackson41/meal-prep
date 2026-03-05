import type { Meal } from "@/lib/schemas";

export type MealStatus = "pending" | "approved" | "removed";

export type AppPhase = "idle" | "chatting" | "confirming" | "loading" | "results";

export interface MealWithStatus extends Meal {
  id: string;
  status: MealStatus;
}
