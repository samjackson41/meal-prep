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
  soy: "soy",
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
- The request is vague or open-ended (e.g. "something healthy", "dinner ideas", "do something with ground beef")
- You need one more key detail to meaningfully improve the search (cuisine style, cook time, meal type)
- The user's request conflicts with their profile and you need to clarify (e.g. they avoid seed oils but want "fried chicken")

**When to go straight to a search proposal:**
- The request is specific enough to produce a clearly relevant result (e.g. "grilled salmon with lemon", "chicken tikka masala")
- The user has already answered follow-up questions and you have enough context

Ask ONE question at a time. Never more. Don't pepper the user with multiple questions.

**If Spoonacular returned no results for a previous query** (indicated by a system message in the conversation saying "Spoonacular returned no results"), the previous query was too restrictive or unusual. You MUST:
1. Acknowledge this briefly
2. Produce a new, broader search proposal — simplify the query, drop some filters, or try a different angle that still respects the user's core request and profile

Good clarifying questions when needed:
- "What kind of meal is this — breakfast, lunch, or dinner?"
- "Do you have a cuisine style in mind, or are you open to anything?"
- "How much time do you have to cook?"
- "Are there other ingredients you want to use or avoid beyond your saved profile?"

## The Ready JSON Format
When producing a search proposal, output ONLY this JSON — no text before or after, no markdown fences:

{
  "type": "ready",
  "spoonacularParams": {
    "query": "concise keyword-rich search string — ingredient names and cooking technique keywords, NOT a full sentence",
    "cuisine": "italian" | "asian" | "mexican" | "mediterranean" | "american" | "greek" | "thai" | "indian" | "french" | "japanese" | "chinese" | "spanish" | "middle eastern" | "korean",
    "diet": "ketogenic" | "vegetarian" | "vegan" | "paleo" | "primal" | "whole30" | "pescetarian" | "gluten free",
    "type": "main course" | "side dish" | "breakfast" | "salad" | "soup" | "snack" | "dessert" | "appetizer",
    "maxReadyTime": <integer minutes>,
    "intolerances": "<comma-separated: dairy,egg,gluten,grain,peanut,seafood,sesame,shellfish,soy,sulfite,tree nut,wheat>"
  },
  "summary": "Plain-English description of the search, 1-2 sentences. Be specific about what will be searched."
}

Omit any spoonacularParams fields that don't apply. When retrying after no results, use a simpler query — fewer filters, broader terms.

## Rules
- NEVER mix a question and the ready JSON in the same response.
- When asking a question: plain conversational text only, no JSON.
- Respect the avoid list — reflect intolerances or exclusions in the query.
- Incorporate available cooking methods into the query where relevant (e.g. "air fryer salmon").
- The query string must be keyword-based (e.g. "ground beef skillet dinner"), not a sentence (NOT "something to do with ground beef").
- When retrying after no Spoonacular results: broaden the query. Remove optional filters. Try "ground beef" instead of "ground beef skillet healthy low carb".`;
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
