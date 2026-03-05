"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SpoonacularParams } from "@/lib/schemas";

interface Props {
  summary: string;
  params?: SpoonacularParams;
  onConfirm: () => void;
  onRefine?: () => void;
}

const PARAM_LABELS: Record<string, string> = {
  query: "Search",
  cuisine: "Cuisine",
  diet: "Diet",
  type: "Meal type",
  maxReadyTime: "Max time",
  intolerances: "Intolerances",
};

export function ConfirmationBanner({ summary, params, onConfirm, onRefine }: Props) {
  const [expanded, setExpanded] = useState(false);

  const activeParams = params
    ? Object.entries(params).filter(([, v]) => v != null && v !== "")
    : [];

  return (
    <div className="rounded-xl border bg-muted/40 p-5 space-y-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl mt-0.5">{params ? "🥄" : "✦"}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold mb-1">{params ? "Ready to search" : "Ready to generate"}</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{summary}</p>
        </div>
      </div>

      {/* Collapsible params — only when searching Spoonacular */}
      {params && (
        <>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {expanded ? "Hide" : "Show"} search details
          </button>

          {expanded && (
            <div className="rounded-lg border bg-background px-4 py-3 space-y-1.5">
              {activeParams.map(([key, value]) => (
                <div key={key} className="flex gap-2 text-xs">
                  <span className="text-muted-foreground w-24 shrink-0">
                    {PARAM_LABELS[key] ?? key}
                  </span>
                  <span className="font-medium">
                    {key === "maxReadyTime" ? `${value} min` : String(value)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <div className="flex gap-3 pt-1">
        {onRefine && (
          <Button type="button" variant="outline" onClick={onRefine} className="flex-1">
            Refine
          </Button>
        )}
        <Button type="button" onClick={onConfirm} className="flex-1">
          {params ? "Find meals" : "Generate meals"}
        </Button>
      </div>
    </div>
  );
}
