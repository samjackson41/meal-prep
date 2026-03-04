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
import type { MealWithStatus } from "@/lib/types";

// Re-export for any existing imports from this module
export type { MealWithStatus } from "@/lib/types";
export type { MealStatus } from "@/lib/types";

interface MealCardProps {
  meal: MealWithStatus;
  onApprove?: (id: string) => void;
  onRemove: (id: string) => void;
  variant?: "search" | "saved";
}

export function MealCard({
  meal,
  onApprove,
  onRemove,
  variant = "search",
}: MealCardProps) {
  const isApproved = meal.status === "approved";
  const isRemoved = meal.status === "removed";

  return (
    <Card
      className={[
        "flex flex-col transition-all overflow-hidden",
        isApproved && variant === "search"
          ? "border-green-500 ring-2 ring-green-500"
          : "",
        isRemoved ? "opacity-40" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {meal.image && (
        <img
          src={meal.image}
          alt={meal.name}
          className="w-full h-44 object-cover"
        />
      )}

      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg">{meal.name}</CardTitle>
          {isApproved && variant === "search" && (
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
          {meal.calories > 0 && <span>🔥 {meal.calories} cal</span>}
          {meal.protein !== "0g" && <span>💪 {meal.protein} protein</span>}
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

        {/* Instructions */}
        {meal.instructions && meal.instructions.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-1">Instructions</p>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              {meal.instructions.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2 mt-auto pt-2">
          {variant === "saved" ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onRemove(meal.id)}
            >
              Remove from saved
            </Button>
          ) : (
            !isRemoved && (
              <div className="flex gap-2">
                {!isApproved && (
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => onApprove?.(meal.id)}
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
            )
          )}

          {meal.sourceUrl && (
            <a
              href={meal.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground underline underline-offset-2"
            >
              View original recipe ↗
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
