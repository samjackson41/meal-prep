"use client";

import { useState, useEffect, useCallback } from "react";
import { UserPreferencesSchema, CookingMethodSchema, type UserPreferences } from "@/lib/schemas";

const STORAGE_KEY = "meal-prep:preferences";
const SAVED_FLAG_KEY = "meal-prep:preferences:saved";

// All methods on by default so the first-time form is ready to save immediately
const DEFAULT_PREFS: UserPreferences = {
  cookingMethods: CookingMethodSchema.options.slice(),
  healthProfile: { favor: [], avoid: [] },
};

function readPrefs(): UserPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const result = UserPreferencesSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

function writePrefs(prefs: UserPreferences): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  localStorage.setItem(SAVED_FLAG_KEY, "1");
  window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
}

export function usePreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFS);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);

  useEffect(() => {
    setPreferences(readPrefs());
    setHasSaved(localStorage.getItem(SAVED_FLAG_KEY) === "1");
    setIsLoaded(true);

    function handleStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY || e.key === null) {
        setPreferences(readPrefs());
        setHasSaved(localStorage.getItem(SAVED_FLAG_KEY) === "1");
      }
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const savePreferences = useCallback((prefs: UserPreferences) => {
    const validated = UserPreferencesSchema.parse(prefs);
    writePrefs(validated);
    setPreferences(validated);
    setHasSaved(true);
  }, []);

  // hasPreferences is true only after the user has explicitly hit Save at least once
  const hasPreferences = isLoaded && hasSaved;

  return { preferences, savePreferences, isLoaded, hasPreferences };
}
