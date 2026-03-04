"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { UserPreferences, CookingMethod } from "@/lib/schemas";

const COOKING_METHODS: { id: CookingMethod; label: string }[] = [
  { id: "pan_seared", label: "Pan Seared / Stovetop" },
  { id: "grill", label: "Grill" },
  { id: "oven", label: "Oven / Bake" },
  { id: "air_fryer", label: "Air Fryer" },
  { id: "crock_pot", label: "Crock Pot / Slow Cooker" },
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
  { id: "alcohol", label: "Alcohol" },
  { id: "artificial_additives", label: "Artificial Additives" },
];

const PRESET_IDS = new Set([
  ...FAVOR_PRESETS.map((p) => p.id),
  ...AVOID_PRESETS.map((p) => p.id),
]);

interface Props {
  open: boolean;
  onClose: () => void;
  preferences: UserPreferences;
  onSave: (prefs: UserPreferences) => void;
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
  const [customInput, setCustomInput] = useState("");

  function toggle(id: string) {
    onChange(
      selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]
    );
  }

  function addCustom() {
    const val = customInput.trim();
    if (!val || selected.includes(val)) return;
    onChange([...selected, val]);
    setCustomInput("");
  }

  const customItems = selected.filter((s) => !PRESET_IDS.has(s));

  return (
    <div className="space-y-3">
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
      {customItems.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {customItems.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-muted text-foreground border border-input"
            >
              {item}
              <button
                type="button"
                onClick={() => onChange(selected.filter((s) => s !== item))}
                className="ml-0.5 hover:text-destructive"
                aria-label={`Remove ${item}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustom())}
          placeholder="Add custom…"
          className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <Button type="button" variant="outline" size="sm" onClick={addCustom}>
          Add
        </Button>
      </div>
    </div>
  );
}

export function PreferencesPanel({ open, onClose, preferences, onSave }: Props) {
  const [draft, setDraft] = useState<UserPreferences>(preferences);

  useEffect(() => {
    if (open) setDraft(preferences);
  }, [open, preferences]);

  if (!open) return null;

  function toggleMethod(id: CookingMethod) {
    setDraft((prev) => ({
      ...prev,
      cookingMethods: prev.cookingMethods.includes(id)
        ? prev.cookingMethods.filter((m) => m !== id)
        : [...prev.cookingMethods, id],
    }));
  }

  function handleSave() {
    onSave(draft);
    onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-background shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">My Preferences</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-7">

          {/* Cooking Methods */}
          <section>
            <h3 className="text-sm font-semibold mb-3">Cooking Methods</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Check the methods you have access to. Recipes will be filtered and weighted accordingly.
            </p>
            <div className="grid grid-cols-2 gap-2">
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
          </section>

          {/* Health Profile */}
          <section>
            <h3 className="text-sm font-semibold mb-1">Health Profile</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Define what "healthy" means to you. These shape every recipe suggestion.
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
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" className="flex-1" onClick={handleSave}>
            Save preferences
          </Button>
        </div>
      </div>
    </>
  );
}
