"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
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
  const [meals, setMeals] = useState<MealWithStatus[]>([]);
  const [source, setSource] = useState<"spoonacular" | "claude" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<AppPhase>("idle");
  const [prompt, setPrompt] = useState("");
  const [count, setCount] = useState(3);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [confirmedParams, setConfirmedParams] = useState<SpoonacularParams | null>(null);
  const [generatePrompt, setGeneratePrompt] = useState<string | null>(null);
  const [confirmationSummary, setConfirmationSummary] = useState("");

  const { preferences, savePreferences, hasPreferences } = usePreferences();
  const { saveRecipe } = useLocalRecipes();

  const approvedCount = meals.filter((m) => m.status === "approved").length;

  // ----------------------------------------------------------------
  // Handlers
  // ----------------------------------------------------------------

  // Sends a message to /api/chat and handles question vs. ready response
  async function sendToChat(message: string, historyBefore: ChatMessage[]) {
    const newHistory: ChatMessage[] = [
      ...historyBefore,
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
          history: historyBefore,
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
        setPhase("chatting");
      } else if (data.type === "generate") {
        setChatHistory([
          ...newHistory,
          { role: "assistant", content: data.summary },
        ]);
        setConfirmedParams(null);
        setConfirmationSummary(data.summary);
        setGeneratePrompt(data.prompt);
        setPhase("confirming");
      } else {
        setChatHistory([
          ...newHistory,
          { role: "assistant", content: data.summary },
        ]);
        setConfirmedParams(data.spoonacularParams);
        setGeneratePrompt(null);
        setConfirmationSummary(data.summary);
        setPhase("confirming");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setChatLoading(false);
    }
  }

  // Called from idle form submit — kicks off the whole flow
  async function handleIdleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!prompt.trim() || chatLoading) return;
    await sendToChat(prompt.trim(), []);
  }

  // Called from the ChatThread in the chatting/confirming phase
  async function handleChatSend(message: string) {
    await sendToChat(message, chatHistory);
  }

  async function handleConfirmedSearch() {
    if (!confirmedParams && !generatePrompt) return;

    setPhase("loading");
    setError(null);
    setMeals([]);
    setSource(null);

    try {
      const res = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          confirmedParams
            ? { spoonacularParams: confirmedParams, count }
            : { prompt: generatePrompt, count }
        ),
      });

      // Spoonacular found nothing — drop back into chat so the user can
      // provide more info and Claude can produce new params to retry.
      if (res.status === 404) {
        setChatHistory((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "No recipes found for that search. Can you give me more to go on — any specific ingredients or a cuisine style? I'll try again. Or if you'd prefer, just say \"generate them\" and I'll create meals for you directly.",
          },
        ]);
        setPhase("chatting");
        return;
      }

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

  function resetToIdle() {
    setPhase("idle");
    setMeals([]);
    setSource(null);
    setError(null);
    setChatHistory([]);
    setConfirmedParams(null);
    setGeneratePrompt(null);
    setPrompt("");
  }

  // ----------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------

  const countSelect = (
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
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-10">

        <h1 className="text-3xl font-bold mb-2">Meal Planner</h1>
        <p className="text-muted-foreground mb-8">
          Describe what you want and get personalised meal suggestions.
        </p>

        {/* Preferences accordion — always visible on idle, always visible when not yet set up */}
        {(phase === "idle" || !hasPreferences) && (
          <PreferencesPanel
            preferences={preferences}
            onSave={savePreferences}
            requireSetup={!hasPreferences}
          />
        )}

        {/* ---- IDLE ---- */}
        {phase === "idle" && hasPreferences && (
          <form onSubmit={handleIdleSubmit} className="flex gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. high-protein dinner, quick weeknight meal, something on the grill…"
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              disabled={chatLoading}
            />
            {countSelect}
            <div className="flex items-center gap-2">
              <Button type="submit" disabled={!prompt.trim() || chatLoading}>
                {chatLoading ? "Thinking…" : "Search"}
              </Button>
              {approvedCount > 0 && (
                <Badge className="bg-green-500 text-white">{approvedCount} approved</Badge>
              )}
            </div>
          </form>
        )}

        {/* ---- CHATTING (Claude asked a clarifying question) ---- */}
        {phase === "chatting" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={resetToIdle}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Start over
              </button>
              {countSelect}
            </div>
            <div className="h-[320px] flex flex-col">
              <ChatThread
                history={chatHistory}
                onSend={handleChatSend}
                loading={chatLoading}
              />
            </div>
          </div>
        )}

        {/* ---- CONFIRMING ---- */}
        {phase === "confirming" && (confirmedParams || generatePrompt) && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={resetToIdle}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Start over
              </button>
              {countSelect}
            </div>
            <div className="h-[420px] flex flex-col">
              <ChatThread
                history={chatHistory}
                onSend={handleChatSend}
                loading={chatLoading}
                disabled={true}
                banner={
                  <ConfirmationBanner
                    summary={confirmationSummary}
                    params={confirmedParams ?? undefined}
                    onConfirm={handleConfirmedSearch}
                    onRefine={() => setPhase("chatting")}
                  />
                }
              />
            </div>
          </div>
        )}

        {/* ---- LOADING ---- */}
        {phase === "loading" && (
          <div className="flex items-center gap-3">
            <svg
              className="animate-spin h-4 w-4 text-muted-foreground"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
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
                <Button variant="outline" size="sm" onClick={() => setPhase("confirming")}>
                  Refine
                </Button>
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

        {error && (
          <p className="text-sm text-destructive mt-4">{error}</p>
        )}
      </div>
    </div>
  );
}
