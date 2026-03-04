"use client";

import { useState } from "react";
import { Settings, MessageSquare, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MealCard } from "@/components/MealCard";
import { PreferencesPanel } from "@/components/PreferencesPanel";
import { ChatThread } from "@/components/ChatThread";
import { ConfirmationBanner } from "@/components/ConfirmationBanner";
import type { MealWithStatus, AppPhase } from "@/lib/types";
import { useLocalRecipes } from "@/lib/hooks/useLocalRecipes";
import { usePreferences } from "@/lib/hooks/usePreferences";
import type { MealPlan, ChatMessage, ChatResponse, SpoonacularParams } from "@/lib/schemas";

export default function Home() {
  // --- Meal state ---
  const [meals, setMeals] = useState<MealWithStatus[]>([]);
  const [source, setSource] = useState<"spoonacular" | "claude" | null>(null);
  const [error, setError] = useState<string | null>(null);

  // --- App phase ---
  const [phase, setPhase] = useState<AppPhase>("idle");

  // --- Direct submit ---
  const [prompt, setPrompt] = useState("");
  const [count, setCount] = useState(3);

  // --- Chat ---
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

  // --- Confirmation ---
  const [confirmedParams, setConfirmedParams] = useState<SpoonacularParams | null>(null);
  const [confirmationSummary, setConfirmationSummary] = useState("");

  // --- Preferences panel ---
  const [showPreferences, setShowPreferences] = useState(false);

  const { preferences, savePreferences, hasPreferences } = usePreferences();
  const { saveRecipe } = useLocalRecipes();

  const approvedCount = meals.filter((m) => m.status === "approved").length;

  // ----------------------------------------------------------------
  // Handlers
  // ----------------------------------------------------------------

  async function handleDirectSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!prompt.trim()) return;

    setPhase("loading");
    setError(null);
    setMeals([]);
    setSource(null);

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

      const data: MealPlan & { source?: "spoonacular" | "claude" } = await res.json();
      setSource(data.source ?? null);
      const now = Date.now();
      setMeals(
        data.meals.map((meal, i) => ({
          ...meal,
          id: `meal-${now}-${i}`,
          status: "pending",
        }))
      );
      setPhase("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setPhase("idle");
    }
  }

  async function handleChatSend(message: string) {
    const newHistory: ChatMessage[] = [
      ...chatHistory,
      { role: "user", content: message },
    ];
    setChatHistory(newHistory);
    setChatLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history: chatHistory,
          preferences,
          count,
        }),
      });

      if (!res.ok) throw new Error("Chat request failed");

      const data: ChatResponse = await res.json();

      if (data.type === "question") {
        setChatHistory([
          ...newHistory,
          { role: "assistant", content: data.content },
        ]);
      } else {
        setChatHistory([
          ...newHistory,
          { role: "assistant", content: `Got it! ${data.summary}` },
        ]);
        setConfirmedParams(data.spoonacularParams);
        setConfirmationSummary(data.summary);
        setPhase("confirming");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setChatLoading(false);
    }
  }

  async function handleConfirmedSearch() {
    if (!confirmedParams) return;

    setPhase("loading");
    setError(null);
    setMeals([]);
    setSource(null);

    try {
      const res = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spoonacularParams: confirmedParams, count }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Something went wrong");
      }

      const data: MealPlan & { source?: "spoonacular" | "claude" } = await res.json();
      setSource(data.source ?? null);
      const now = Date.now();
      setMeals(
        data.meals.map((meal, i) => ({
          ...meal,
          id: `meal-${now}-${i}`,
          status: "pending",
        }))
      );
      setPhase("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setPhase("confirming");
    }
  }

  function handleApprove(id: string) {
    setMeals((prev) => {
      const updated = prev.map((m) =>
        m.id === id ? { ...m, status: "approved" as const } : m
      );
      const approvedMeal = updated.find((m) => m.id === id);
      if (approvedMeal) saveRecipe(approvedMeal);
      return updated;
    });
  }

  function handleRemove(id: string) {
    setMeals((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: "removed" as const } : m))
    );
  }

  function startChat() {
    setChatHistory([]);
    setConfirmedParams(null);
    setConfirmationSummary("");
    setError(null);
    setPhase("chatting");
  }

  function resetToIdle() {
    setPhase("idle");
    setMeals([]);
    setSource(null);
    setError(null);
    setChatHistory([]);
    setConfirmedParams(null);
  }

  // ----------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold">Meal Planner</h1>
          <button
            type="button"
            onClick={() => setShowPreferences(true)}
            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Preferences"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
        <p className="text-muted-foreground mb-8">
          Describe what you want and get personalised meal suggestions.
        </p>

        {/* Soft preferences nudge */}
        {!hasPreferences && phase === "idle" && (
          <button
            type="button"
            onClick={() => setShowPreferences(true)}
            className="w-full mb-6 rounded-lg border border-dashed border-muted-foreground/40 px-4 py-3 text-sm text-muted-foreground hover:border-muted-foreground hover:text-foreground transition-colors text-left"
          >
            <span className="font-medium">Set up your preferences</span> — tell us your cooking
            methods and what healthy means to you for better suggestions. →
          </button>
        )}

        {/* ---- IDLE ---- */}
        {phase === "idle" && (
          <>
            <form onSubmit={handleDirectSubmit} className="flex gap-2 mb-4">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. healthy high-protein meals under 30 minutes"
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <select
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n} meal{n > 1 ? "s" : ""}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-2">
                <Button type="submit" disabled={!prompt.trim()}>
                  Generate
                </Button>
                {approvedCount > 0 && (
                  <Badge className="bg-green-500 text-white">{approvedCount} approved</Badge>
                )}
              </div>
            </form>
            <button
              type="button"
              onClick={startChat}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <MessageSquare className="h-4 w-4" />
              Chat to refine your search
            </button>
          </>
        )}

        {/* ---- CHATTING ---- */}
        {phase === "chatting" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={resetToIdle}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <span className="text-sm text-muted-foreground">|</span>
                <span className="text-sm text-muted-foreground">
                  Chatting with your meal assistant
                </span>
              </div>
              <select
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n} meal{n > 1 ? "s" : ""}
                  </option>
                ))}
              </select>
            </div>

            {chatHistory.length === 0 && (
              <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">
                Tell me what you&apos;re in the mood for and I&apos;ll ask a few questions to find
                the best recipes for you.
              </p>
            )}

            <div className="h-[400px] flex flex-col">
              <ChatThread
                history={chatHistory}
                onSend={handleChatSend}
                loading={chatLoading}
              />
            </div>
          </div>
        )}

        {/* ---- CONFIRMING ---- */}
        {phase === "confirming" && confirmedParams && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setPhase("chatting")}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Back to chat
            </button>
            <ConfirmationBanner
              summary={confirmationSummary}
              params={confirmedParams}
              onConfirm={handleConfirmedSearch}
              onBack={() => setPhase("chatting")}
            />
          </div>
        )}

        {/* ---- LOADING ---- */}
        {phase === "loading" && (
          <div className="flex items-center gap-3 mb-6">
            <svg
              className="animate-spin h-4 w-4 text-muted-foreground"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <p className="text-sm text-muted-foreground">Searching for meals…</p>
          </div>
        )}

        {/* ---- RESULTS ---- */}
        {phase === "results" && (
          <>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                {source && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    Results from{" "}
                    {source === "spoonacular" ? (
                      <span className="inline-flex items-center gap-1 font-medium text-orange-600">
                        <span>🥄</span> Spoonacular
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-medium text-purple-600">
                        <span>✦</span> Claude AI
                      </span>
                    )}
                  </p>
                )}
                {approvedCount > 0 && (
                  <Badge className="bg-green-500 text-white">{approvedCount} approved</Badge>
                )}
              </div>
              <div className="flex gap-2">
                {chatHistory.length > 0 && (
                  <Button variant="outline" size="sm" onClick={() => setPhase("chatting")}>
                    Refine
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={resetToIdle}>
                  New search
                </Button>
              </div>
            </div>

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
          </>
        )}

        {/* Error */}
        {error && (
          <p className="text-sm text-destructive mt-4">{error}</p>
        )}
      </div>

      {/* Preferences panel */}
      <PreferencesPanel
        open={showPreferences}
        onClose={() => setShowPreferences(false)}
        preferences={preferences}
        onSave={savePreferences}
      />
    </div>
  );
}
