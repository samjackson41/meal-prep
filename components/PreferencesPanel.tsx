"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { UserPreferences, CookingMethod } from "@/lib/schemas";

export const ALL_COOKING_METHODS: CookingMethod[] = [
  "pan_seared",
  "grill",
  "oven",
  "air_fryer",
  "crock_pot",
  "microwave",
];

const COOKING_METHODS: { id: CookingMethod; label: string }[] = [
  { id: "pan_seared", label: "Pan Seared / Stovetop" },
  { id: "grill", label: "Grill" },
  { id: "oven", label: "Oven / Bake" },
  { id: "air_fryer", label: "Air Fryer" },
  { id: "crock_pot", label: "Crock Pot / Slow Cooker" },
  { id: "microwave", label: "Microwave" },
];

const FAVOR_PRESETS: { id: string; label: string }[] = [
  { id: "high_protein", label: "High Protein" },
  { id: "whole_grains", label: "Whole Grains" },
  { id: "olive_oil", label: "Olive Oil" },
  { id: "grass_fed", label: "Grass-Fed" },
  { id: "low_sugar", label: "Low Sugar" },
  { id: "high_fiber", label: "High Fiber" },
  { id: "lean_meats", label: "Lean Meats" },
  { id: "leafy_greens", label: "Leafy Greens" },
];

const AVOID_PRESETS: { id: string; label: string }[] = [
  { id: "seed_oils", label: "Seed Oils" },
  { id: "refined_sugar", label: "Refined Sugar" },
  { id: "processed_flour", label: "Processed Flour" },
  { id: "gluten", label: "Gluten" },
  { id: "dairy", label: "Dairy" },
  { id: "soy", label: "Soy" },
  { id: "artificial_additives", label: "Artificial Additives" },
];

interface Props {
  preferences: UserPreferences;
  onSave: (prefs: UserPreferences) => void;
  /** If true, accordion starts open and cannot be collapsed until saved */
  requireSetup?: boolean;
}

function TokenPills({
  presets,
  selected,
  onChange,
}: {
  presets: { id: string; label: string }[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  function toggle(id: string) {
    onChange(
      selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {presets.map((p) => {
        const active = selected.includes(p.id);
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => toggle(p.id)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              active
                ? "bg-foreground text-background border-foreground"
                : "bg-background text-muted-foreground border-input hover:border-foreground"
            }`}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}

export function PreferencesPanel({ preferences, onSave, requireSetup = false }: Props) {
  const [open, setOpen] = useState(requireSetup);
  const [draft, setDraft] = useState<UserPreferences>(preferences);

  // Sync draft when preferences load from localStorage
  useEffect(() => {
    setDraft(preferences);
  }, [preferences]);

  // Force open when setup is required
  useEffect(() => {
    if (requireSetup) setOpen(true);
  }, [requireSetup]);

  const noMethodSelected = draft.cookingMethods.length === 0;

  function toggleMethod(id: CookingMethod) {
    setDraft((prev) => ({
      ...prev,
      cookingMethods: prev.cookingMethods.includes(id)
        ? prev.cookingMethods.filter((m) => m !== id)
        : [...prev.cookingMethods, id],
    }));
  }

  function handleSave() {
    if (noMethodSelected) return;
    onSave(draft);
    if (!requireSetup) setOpen(false);
  }

  function handleToggle() {
    if (requireSetup) return; // can't collapse until saved
    setOpen((v) => !v);
  }

  return (
    <div className="rounded-lg border bg-background mb-6 overflow-hidden">
      {/* Accordion header */}
      <button
        type="button"
        onClick={handleToggle}
        className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-left transition-colors ${
          requireSetup
            ? "cursor-default"
            : "hover:bg-muted/50"
        }`}
        aria-expanded={open}
      >
        <span>
          My Preferences
          {!requireSetup && !open && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {draft.cookingMethods.length} method{draft.cookingMethods.length !== 1 ? "s" : ""}
              {draft.healthProfile.favor.length + draft.healthProfile.avoid.length > 0
                ? ` · ${draft.healthProfile.favor.length + draft.healthProfile.avoid.length} health tags`
                : ""}
            </span>
          )}
        </span>
        {!requireSetup && (open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />)}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-6 border-t">

          {/* Cooking Methods */}
          <section className="pt-4">
            <div className="flex items-baseline justify-between mb-1">
              <h3 className="text-sm font-semibold">Cooking Methods</h3>
              <span className="text-xs text-muted-foreground">Select all that apply</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              At least one is required. Recipes will be matched to your available methods.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {COOKING_METHODS.map((m) => {
                const checked = draft.cookingMethods.includes(m.id);
                return (
                  <label
                    key={m.id}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                      checked
                        ? "border-foreground bg-muted"
                        : "border-input hover:border-muted-foreground"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleMethod(m.id)}
                      className="h-4 w-4 accent-foreground"
                    />
                    <span className="text-sm">{m.label}</span>
                  </label>
                );
              })}
            </div>
            {noMethodSelected && (
              <p className="text-xs text-destructive mt-2">Select at least one cooking method.</p>
            )}
          </section>

          {/* Health Profile */}
          <section>
            <h3 className="text-sm font-semibold mb-1">Health Profile</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Define what "healthy" means to you. These shape every recipe suggestion. You can also mention additional needs when chatting with the assistant.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-2 uppercase tracking-wide">
                  Favor
                </p>
                <TokenPills
                  presets={FAVOR_PRESETS}
                  selected={draft.healthProfile.favor}
                  onChange={(favor) =>
                    setDraft((prev) => ({
                      ...prev,
                      healthProfile: { ...prev.healthProfile, favor },
                    }))
                  }
                />
              </div>
              <div>
                <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-2 uppercase tracking-wide">
                  Avoid
                </p>
                <TokenPills
                  presets={AVOID_PRESETS}
                  selected={draft.healthProfile.avoid}
                  onChange={(avoid) =>
                    setDraft((prev) => ({
                      ...prev,
                      healthProfile: { ...prev.healthProfile, avoid },
                    }))
                  }
                />
              </div>
            </div>
          </section>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-1">
            {!requireSetup && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setDraft(preferences);
                  setOpen(false);
                }}
              >
                Cancel
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={noMethodSelected}
            >
              Save preferences
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
