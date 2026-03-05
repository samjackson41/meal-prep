"use client";

import { Dialog } from "radix-ui";
import { X } from "lucide-react";
import type { MealWithStatus } from "@/lib/types";

interface RecipeModalProps {
  meal: MealWithStatus;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RecipeModal({ meal, open, onOpenChange }: RecipeModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-background shadow-2xl focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          {/* Header image */}
          {meal.image && (
            <div className="relative w-full h-60">
              <img
                src={meal.image}
                alt={meal.name}
                className="w-full h-full object-cover rounded-t-xl"
              />
            </div>
          )}

          {/* Content */}
          <div className="p-6 space-y-5">
            {/* Title + close */}
            <div className="flex items-start justify-between gap-3">
              <Dialog.Title className="text-2xl font-bold leading-tight">
                {meal.name}
              </Dialog.Title>
              <Dialog.Close className="mt-1 shrink-0 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                <X className="h-5 w-5" />
                <span className="sr-only">Close</span>
              </Dialog.Close>
            </div>

            {/* Description */}
            <Dialog.Description className="text-sm text-muted-foreground">
              {meal.description}
            </Dialog.Description>

            {/* Stats */}
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
              <span>⏱ {meal.cookingTime} min</span>
              <span>🍽 {meal.servings} servings</span>
              {meal.calories > 0 && <span>🔥 {meal.calories} cal</span>}
              {meal.protein !== "0g" && <span>💪 {meal.protein} protein</span>}
            </div>

            {/* Ingredients */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Ingredients</h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-muted-foreground">
                {meal.ingredients.map((ing, i) => (
                  <li key={i} className="flex gap-1">
                    <span className="shrink-0">{ing.amount} {ing.unit}</span>
                    <span>{ing.name}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Instructions */}
            {meal.instructions && meal.instructions.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Instructions</h3>
                <ol className="space-y-3 text-sm text-muted-foreground">
                  {meal.instructions.map((step, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="shrink-0 font-medium text-foreground w-5 text-right">{i + 1}.</span>
                      <span className="leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Source link */}
            {meal.sourceUrl && (
              <a
                href={meal.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
              >
                View original recipe ↗
              </a>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
