import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { MealPlanSchema } from "@/lib/schemas";
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

async function searchSpoonacular(
  query: string,
  count: number
): Promise<SpoonacularSearchResponse | null> {
  const apiKey = process.env.SPOONACULAR_API_KEY;
  if (!apiKey) return null;

  const url = new URL("https://api.spoonacular.com/recipes/complexSearch");
  url.searchParams.set("query", query);
  url.searchParams.set("number", String(count));
  url.searchParams.set("addRecipeInformation", "true");
  url.searchParams.set("addRecipeNutrition", "true");
  url.searchParams.set("fillIngredients", "true");
  url.searchParams.set("apiKey", apiKey);

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) return null;
  return res.json() as Promise<SpoonacularSearchResponse>;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  if (!body || typeof body.prompt !== "string" || body.prompt.trim() === "") {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  const count = typeof body.count === "number" ? body.count : 3;
  if (count < 1 || count > 6) {
    return NextResponse.json(
      { error: "count must be between 1 and 6" },
      { status: 400 }
    );
  }

  const prompt = body.prompt.trim();

  // --- Spoonacular path ---
  try {
    const spoonacularData = await searchSpoonacular(prompt, count);
    if (spoonacularData && spoonacularData.results.length > 0) {
      const meals = spoonacularData.results
        .slice(0, count)
        .map(mapSpoonacularToMeal);
      const parsed = MealPlanSchema.parse({ meals });
      return NextResponse.json({ ...parsed, source: "spoonacular" });
    }
  } catch (err) {
    console.warn("Spoonacular search failed, falling back to Claude:", err);
  }

  // --- Claude fallback ---
  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Generate exactly ${count} meal${count > 1 ? "s" : ""}: ${prompt}`,
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
