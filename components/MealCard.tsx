"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Meal } from "@/lib/schemas";

export type MealStatus = "pending" | "approved" | "removed";

export interface MealWithStatus extends Meal {
  id: string;
  status: MealStatus;
}

interface MealCardProps {
  meal: MealWithStatus;
  onApprove: (id: string) => void;
  onRemove: (id: string) => void;
}

export function MealCard({ meal, onApprove, onRemove }: MealCardProps) {
  const isApproved = meal.status === "approved";
  const isRemoved = meal.status === "removed";

  return (
    <Card
      className={[
        "flex flex-col transition-all",
        isApproved ? "border-green-500 ring-2 ring-green-500" : "",
        isRemoved ? "opacity-40" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg">{meal.name}</CardTitle>
          {isApproved && (
            <Badge className="bg-green-500 text-white shrink-0">Approved</Badge>
          )}
          {isRemoved && (
            <Badge variant="secondary" className="shrink-0">
              Removed
            </Badge>
          )}
        </div>
        <CardDescription>{meal.description}</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 flex-1">
        {/* Stats row */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span>⏱ {meal.cookingTime} min</span>
          <span>🍽 {meal.servings} servings</span>
          <span>🔥 {meal.calories} cal</span>
          <span>💪 {meal.protein} protein</span>
        </div>

        {/* Ingredients */}
        <div>
          <p className="text-sm font-medium mb-1">Ingredients</p>
          <ul className="text-sm text-muted-foreground space-y-0.5">
            {meal.ingredients.map((ing, i) => (
              <li key={i}>
                {ing.amount} {ing.unit} {ing.name}
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        {!isRemoved && (
          <div className="flex gap-2 mt-auto pt-2">
            {!isApproved && (
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => onApprove(meal.id)}
              >
                Approve
              </Button>
            )}
            <Button
              size="sm"
              variant={isApproved ? "ghost" : "secondary"}
              onClick={() => onRemove(meal.id)}
            >
              {isApproved ? "Remove from plan" : "Remove"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
