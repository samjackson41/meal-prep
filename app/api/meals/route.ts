import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { MealPlanSchema } from "@/lib/schemas";

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

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Generate exactly ${count} meal${count > 1 ? "s" : ""}: ${body.prompt.trim()}`,
        },
      ],
    });

    const raw =
      response.content[0].type === "text" ? response.content[0].text : "";
    const text = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
    const parsed = MealPlanSchema.parse(JSON.parse(text));

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Meal generation error:", err);
    return NextResponse.json(
      { error: "Failed to generate meals" },
      { status: 500 }
    );
  }
}
