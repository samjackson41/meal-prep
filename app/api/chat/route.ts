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
  alcohol: "alcohol",
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
Have a natural conversation to gather enough detail to build an excellent Spoonacular recipe search. Ask ONE targeted question at a time. Ask no more than 4 questions total before committing to a search.

Good questions to ask (pick the most relevant given what you already know):
- How many people are you cooking for?
- How much time do you have? (e.g., under 20 minutes, up to an hour, slow cooker is fine)
- Do you have a cuisine preference? (e.g., Italian, Asian, Mexican, Mediterranean, American)
- Any specific ingredients you want to use or avoid beyond your saved profile?
- What kind of meal is this? (breakfast, lunch, dinner, snack, dessert)

## When You Have Enough Information
When you have a clear enough picture (at minimum a general dish direction), output ONLY this JSON — no text before or after, no markdown fences:

{
  "type": "ready",
  "spoonacularParams": {
    "query": "concise keyword-rich search string incorporating cooking method and key ingredients",
    "cuisine": "italian" | "asian" | "mexican" | "mediterranean" | "american" | "greek" | "thai" | "indian" | "french" | "japanese" | "chinese" | "spanish" | "middle eastern" | "korean",
    "diet": "ketogenic" | "vegetarian" | "vegan" | "paleo" | "primal" | "whole30" | "pescetarian" | "gluten free",
    "type": "main course" | "side dish" | "breakfast" | "salad" | "soup" | "snack" | "dessert" | "appetizer",
    "maxReadyTime": <integer minutes>,
    "intolerances": "<comma-separated: dairy,egg,gluten,grain,peanut,seafood,sesame,shellfish,soy,sulfite,tree nut,wheat>"
  },
  "summary": "Plain-English description of the search, 1-2 sentences, shown to the user for confirmation."
}

Omit any spoonacularParams fields that don't apply. The summary should be friendly and specific.

## Rules
- NEVER mix a question and the ready JSON in the same response.
- When asking a question: plain conversational text only, no JSON.
- Respect the avoid list absolutely — reflect intolerances or exclusions in the query.
- Incorporate available cooking methods into the query where helpful (e.g. "air fryer salmon" not just "salmon").
- If the user says "go ahead", "just search", "that's fine", or similar — commit immediately with what you know.
- The query field should use ingredient/technique keywords optimized for recipe search, not full sentences.`;
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
