import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import {
  ChatRequestSchema,
  ChatResponseSchema,
  type UserPreferences,
} from "@/lib/schemas";

const client = new Anthropic();

const COOKING_METHOD_LABELS: Record<string, string> = {
  pan_seared: "pan seared / stovetop",
  grill: "grill",
  oven: "oven / baked",
  air_fryer: "air fryer",
  crock_pot: "slow cooker / crock pot",
  microwave: "microwave",
};

const FAVOR_LABELS: Record<string, string> = {
  high_protein: "high protein",
  whole_grains: "whole grains",
  olive_oil: "olive oil",
  grass_fed: "grass-fed meats",
  low_sugar: "low sugar",
  high_fiber: "high fiber",
  lean_meats: "lean meats",
  leafy_greens: "leafy greens",
};

const AVOID_LABELS: Record<string, string> = {
  seed_oils: "seed oils (canola, soybean, vegetable oil)",
  refined_sugar: "refined sugar",
  processed_flour: "processed / refined flour",
  gluten: "gluten",
  dairy: "dairy",
  artificial_additives: "artificial additives and preservatives",
};

function labelToken(token: string, map: Record<string, string>): string {
  return map[token] ?? token;
}

function buildSystemPrompt(prefs: UserPreferences, count: number): string {
  const methods =
    prefs.cookingMethods
      .map((m) => labelToken(m, COOKING_METHOD_LABELS))
      .join(", ") || "any method";

  const favor =
    prefs.healthProfile.favor
      .map((f) => labelToken(f, FAVOR_LABELS))
      .join(", ") || "none specified";

  const avoid =
    prefs.healthProfile.avoid
      .map((a) => labelToken(a, AVOID_LABELS))
      .join(", ") || "none specified";

  return `You are a meal planning assistant helping a user find ${count} meal suggestion(s) they will love.

## User's Kitchen & Health Profile
- Cooking methods available: ${methods}
- Health goals / ingredients to favor: ${favor}
- Dietary restrictions / ingredients to avoid: ${avoid}

## Your Job
Help the user find great recipes by having a natural conversation, then building an optimized Spoonacular search query.

**When to ask follow-up questions first (before producing a search):**
- The request is vague or open-ended AND you need a specific ingredient or cuisine to make a meaningful search (e.g. "something healthy" with no other context)
- The user's request conflicts with their profile and you need to clarify

**When to go straight to a search proposal:**
- The request mentions any specific ingredient, protein, or food (e.g. "something with chicken", "ground beef", "salmon")
- The request mentions a cuisine or dish type
- The user has already answered a follow-up question
- When in doubt, search — don't ask

Ask ONE question at a time. Never more. Don't pepper the user with multiple questions.

**IMPORTANT — Do NOT ask about things already in the profile:**
- Do NOT ask about cooking methods — they're already set in the profile above
- Do NOT ask about dietary restrictions or intolerances — already in the profile
- Do NOT ask about cook time or how long they have — cooking methods cover this
- Only ask follow-ups about: specific ingredients they want to use, or cuisine/dish type

**If a previous search returned no results** (you'll see an assistant message in history saying "No recipes found"), the previous query was too restrictive. When the user replies with more context, use it to produce a new, broader search proposal — simpler query, fewer filters, or a different angle.

Good clarifying questions when needed:
- "Any specific ingredients you want to use?"
- "Do you have a cuisine style in mind, or are you open to anything?"

## JSON Response Formats
When producing any response that isn't a question, output ONLY the JSON — no text before or after, no markdown fences.

**Option A — Search Spoonacular (default):**
{
  "type": "ready",
  "spoonacularParams": {
    "query": "1–3 keywords max — just the core ingredient(s) or dish name, nothing else (e.g. 'chicken thighs', 'shrimp tacos', 'lentil soup'). Do NOT add health descriptors, cooking methods, or adjectives.",
    "cuisine": "italian" | "asian" | "mexican" | "mediterranean" | "american" | "greek" | "thai" | "indian" | "french" | "japanese" | "chinese" | "spanish" | "middle eastern" | "korean",
    "diet": "ketogenic" | "vegetarian" | "vegan" | "paleo" | "primal" | "whole30" | "pescetarian" | "gluten free",
    "type": "main course" | "side dish" | "breakfast" | "salad" | "soup" | "snack" | "dessert" | "appetizer",
    "maxReadyTime": <integer minutes>,
    "intolerances": "<comma-separated: dairy,egg,gluten,grain,peanut,seafood,sesame,shellfish,soy,sulfite,tree nut,wheat>"
  },
  "summary": "Plain-English description of the search, 1-2 sentences."
}

Omit any spoonacularParams fields that don't apply. When retrying after no results, use a simpler query — fewer filters, broader terms.

**Option B — AI-generate meals (only when the user explicitly asks for it):**
{
  "type": "generate",
  "prompt": "A detailed description of the meals to generate, incorporating the user's request and their full health profile",
  "summary": "Plain-English description of what will be generated, 1-2 sentences."
}

## Rules
- NEVER mix a question and the ready JSON in the same response.
- When asking a question: plain conversational text only, no JSON.
- Respect the avoid list — reflect intolerances or exclusions in the query.
- Do NOT put cooking methods in the query string — use the dedicated "type" field or omit entirely.
- Do NOT add health words (healthy, clean, lean, nutritious) to the query — the diet/intolerances fields handle that.
- The query must be 1–3 words: the ingredient or dish name only (e.g. "ground beef", "salmon", "chicken tikka masala").
- When retrying after no results: drop all optional fields, simplify query to 1 word if needed. Use any new info the user just provided.`;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = ChatRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { message, history, preferences, count } = parsed.data;
  const systemPrompt = buildSystemPrompt(preferences, count);

  const messages: Anthropic.MessageParam[] = [
    ...history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: message },
  ];

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    const raw =
      response.content[0].type === "text" ? response.content[0].text : "";
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();

    if (cleaned.startsWith("{")) {
      try {
        const chatResponse = ChatResponseSchema.parse(JSON.parse(cleaned));
        return NextResponse.json(chatResponse);
      } catch {
        // JSON parse failed — fall through to treat as a question
      }
    }

    return NextResponse.json({ type: "question", content: cleaned });
  } catch (err) {
    console.error("Chat endpoint error:", err);
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 }
    );
  }
}
