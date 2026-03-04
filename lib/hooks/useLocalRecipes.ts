"use client";

import { useState, useEffect, useCallback } from "react";
import type { MealWithStatus } from "@/lib/types";

const STORAGE_KEY = "meal-prep:saved-recipes";

function readFromStorage(): MealWithStatus[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MealWithStatus[]) : [];
  } catch {
    return [];
  }
}

function writeToStorage(meals: MealWithStatus[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(meals));
  // Dispatch synthetic event so same-window listeners (e.g. nav badge) update.
  // The native storage event only fires in OTHER windows.
  window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
}

export function useLocalRecipes() {
  const [savedRecipes, setSavedRecipes] = useState<MealWithStatus[]>([]);

  useEffect(() => {
    setSavedRecipes(readFromStorage());

    function handleStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY || e.key === null) {
        setSavedRecipes(readFromStorage());
      }
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const saveRecipe = useCallback((meal: MealWithStatus) => {
    setSavedRecipes((prev) => {
      if (prev.some((m) => m.id === meal.id)) return prev;
      const next = [...prev, { ...meal, status: "approved" as const }];
      writeToStorage(next);
      return next;
    });
  }, []);

  const removeRecipe = useCallback((id: string) => {
    setSavedRecipes((prev) => {
      const next = prev.filter((m) => m.id !== id);
      writeToStorage(next);
      return next;
    });
  }, []);

  return { savedRecipes, saveRecipe, removeRecipe };
}
