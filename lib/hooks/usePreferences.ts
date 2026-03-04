"use client";

import { useState, useEffect, useCallback } from "react";
import { UserPreferencesSchema, type UserPreferences } from "@/lib/schemas";

const STORAGE_KEY = "meal-prep:preferences";

const DEFAULT_PREFS: UserPreferences = {
  cookingMethods: [],
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
  window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
}

export function usePreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setPreferences(readPrefs());
    setIsLoaded(true);

    function handleStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY || e.key === null) {
        setPreferences(readPrefs());
      }
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const savePreferences = useCallback((prefs: UserPreferences) => {
    const validated = UserPreferencesSchema.parse(prefs);
    writePrefs(validated);
    setPreferences(validated);
  }, []);

  const hasPreferences =
    isLoaded &&
    (preferences.cookingMethods.length > 0 ||
      preferences.healthProfile.favor.length > 0 ||
      preferences.healthProfile.avoid.length > 0);

  return { preferences, savePreferences, isLoaded, hasPreferences };
}
