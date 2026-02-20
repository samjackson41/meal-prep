"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MealCard, type MealWithStatus } from "@/components/MealCard";
import type { MealPlan } from "@/lib/schemas";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [count, setCount] = useState(3);
  const [meals, setMeals] = useState<MealWithStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const approvedCount = meals.filter((m) => m.status === "approved").length;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setError(null);
    setMeals([]);

    try {
      const res = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), count }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Something went wrong");
      }

      const data: MealPlan = await res.json();
      const now = Date.now();
      setMeals(
        data.meals.map((meal, i) => ({
          ...meal,
          id: `meal-${now}-${i}`,
          status: "pending",
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleApprove(id: string) {
    setMeals((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: "approved" } : m))
    );
  }

  function handleRemove(id: string) {
    setMeals((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: "removed" } : m))
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-2">Meal Planner</h1>
        <p className="text-muted-foreground mb-8">
          Describe what you want and get personalised meal suggestions.
        </p>

        <form onSubmit={handleSubmit} className="flex gap-2 mb-8">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. healthy high-protein meals under 30 minutes"
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            disabled={loading}
          />
          <select
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            disabled={loading}
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n} meal{n > 1 ? "s" : ""}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <Button type="submit" disabled={loading || !prompt.trim()}>
              {loading ? "Generating…" : "Generate"}
            </Button>
            {approvedCount > 0 && (
              <Badge className="bg-green-500 text-white">
                {approvedCount} approved
              </Badge>
            )}
          </div>
        </form>

        {error && (
          <p className="text-sm text-destructive mb-6">{error}</p>
        )}

        {loading && (
          <p className="text-sm text-muted-foreground">
            Generating meals — this usually takes a few seconds…
          </p>
        )}

        {meals.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {meals.map((meal) => (
              <MealCard
                key={meal.id}
                meal={meal}
                onApprove={handleApprove}
                onRemove={handleRemove}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
