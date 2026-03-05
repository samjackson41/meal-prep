import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { MealPlanSchema, SpoonacularParamsSchema, type SpoonacularParams } from "@/lib/schemas";
import {
  mapSpoonacularToMeal,
  type SpoonacularSearchResponse,
} from "@/lib/spoonacular";

const client = new Anthropic();

const SYSTEM_PROMPT = `You are a professional nutritionist and personal chef.
When asked to generate meals, respond with ONLY a valid JSON object — no markdown, no explanation, no code fences.

The JSON must match this exact structure:
{
  "meals": [
    {
      "name": "string",
      "description": "string",
      "cookingTime": number (minutes),
      "servings": number,
      "calories": number (per serving),
      "protein": "string (e.g. \\"32g\\")",
      "ingredients": [
        { "name": "string", "amount": "string", "unit": "string" }
      ]
    }
  ]
}`;

function buildSpoonacularUrl(count: number, apiKey: string): URL {
  const url = new URL("https://api.spoonacular.com/recipes/complexSearch");
  url.searchParams.set("number", String(count));
  url.searchParams.set("addRecipeInformation", "true");
  url.searchParams.set("addRecipeNutrition", "true");
  url.searchParams.set("fillIngredients", "true");
  url.searchParams.set("apiKey", apiKey);
  return url;
}


async function searchSpoonacularWithParams(
  params: SpoonacularParams,
  count: number
): Promise<SpoonacularSearchResponse | null> {
  const apiKey = process.env.SPOONACULAR_API_KEY;
  if (!apiKey) return null;

  const url = buildSpoonacularUrl(count, apiKey);
  url.searchParams.set("query", params.query);
  if (params.cuisine) url.searchParams.set("cuisine", params.cuisine);
  if (params.diet) url.searchParams.set("diet", params.diet);
  if (params.type) url.searchParams.set("type", params.type);
  if (params.maxReadyTime) url.searchParams.set("maxReadyTime", String(params.maxReadyTime));
  if (params.intolerances) url.searchParams.set("intolerances", params.intolerances);

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) return null;
  return res.json() as Promise<SpoonacularSearchResponse>;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  const hasPrompt = typeof body.prompt === "string" && body.prompt.trim() !== "";
  const hasParams = body.spoonacularParams != null;
  if (!body || (!hasPrompt && !hasParams)) {
    return NextResponse.json(
      { error: "prompt or spoonacularParams is required" },
      { status: 400 }
    );
  }

  const count = typeof body.count === "number" ? body.count : 3;
  if (count < 1 || count > 6) {
    return NextResponse.json(
      { error: "count must be between 1 and 6" },
      { status: 400 }
    );
  }

  // --- Structured params path (from chat confirmation) ---
  if (body.spoonacularParams) {
    const paramsParsed = SpoonacularParamsSchema.safeParse(body.spoonacularParams);
    if (paramsParsed.success) {
      try {
        const spoonacularData = await searchSpoonacularWithParams(paramsParsed.data, count);
        if (spoonacularData && spoonacularData.results.length > 0) {
          const meals = spoonacularData.results.slice(0, count).map(mapSpoonacularToMeal);
          const parsed = MealPlanSchema.parse({ meals });
          return NextResponse.json({ ...parsed, source: "spoonacular" });
        }
        // Spoonacular returned 0 results — tell the frontend so it can re-enter the chat
        return NextResponse.json({ error: "no_results" }, { status: 404 });
      } catch (err) {
        console.warn("Spoonacular structured search failed:", err);
        return NextResponse.json({ error: "no_results" }, { status: 404 });
      }
    }
  }

  // --- No-key fallback: Claude generates meals directly ---
  // Only reached when there is no Spoonacular API key at all.
  try {
    const fallbackPrompt = body.prompt?.trim() ?? "";
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Generate exactly ${count} meal${count > 1 ? "s" : ""}: ${fallbackPrompt}`,
        },
      ],
    });

    const raw =
      response.content[0].type === "text" ? response.content[0].text : "";
    const text = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();
    const parsed = MealPlanSchema.parse(JSON.parse(text));

    return NextResponse.json({ ...parsed, source: "claude" });
  } catch (err) {
    console.error("Meal generation error:", err);
    return NextResponse.json(
      { error: "Failed to generate meals" },
      { status: 500 }
    );
  }
}
