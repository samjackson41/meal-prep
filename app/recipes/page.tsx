"use client";

import Link from "next/link";
import { useLocalRecipes } from "@/lib/hooks/useLocalRecipes";
import { MealCard } from "@/components/MealCard";

export default function RecipesPage() {
  const { savedRecipes, removeRecipe } = useLocalRecipes();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-2">My Recipes</h1>
        <p className="text-muted-foreground mb-8">
          Your approved meals, saved locally.
        </p>

        {savedRecipes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No saved recipes yet.{" "}
            <Link href="/" className="underline underline-offset-2">
              Search for meals
            </Link>{" "}
            and approve ones you like.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedRecipes.map((meal) => (
              <MealCard
                key={meal.id}
                meal={meal}
                onRemove={removeRecipe}
                variant="saved"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
