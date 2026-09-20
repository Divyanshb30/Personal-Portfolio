import { NextRequest, NextResponse } from "next/server";
import { KNOWLEDGE, localAnswer } from "@/lib/intelligence";

/**
 * Intelligence provider adapter (the "wire a real LLM later" seam).
 *
 * Unconfigured (default): returns { configured: false } so the client answers
 * locally from real content. To activate a real model, set:
 *   INTELLIGENCE_API_URL  — an OpenAI-compatible chat-completions endpoint
 *   INTELLIGENCE_API_KEY  — bearer key
 *   INTELLIGENCE_MODEL    — optional, defaults to "gpt-4.1-mini"
 * The knowledge base below is passed as grounding so the model answers only
 * from the real portfolio.
 */

const SYSTEM = `You are the portfolio intelligence for Divyansh Bansal, an AI engineer. Answer ONLY from the grounding facts below, in 2-4 sentences, first-or-third person, warm and precise. If asked something the facts do not cover, say so and point to what you can speak to. Never invent metrics, employers, or claims.

GROUNDING:
${KNOWLEDGE.map((d) => `- [${d.topic}] ${d.text}`).join("\n")}`;

export async function POST(req: NextRequest) {
  let query = "";
  try {
    const body = (await req.json()) as { query?: string };
    query = (body.query ?? "").slice(0, 500);
  } catch {
    return NextResponse.json({ configured: false, error: "bad request" }, { status: 400 });
  }

  const url = process.env.INTELLIGENCE_API_URL;
  const key = process.env.INTELLIGENCE_API_KEY;
  if (!url || !key) {
    // Not wired yet — tell the client to answer locally.
    return NextResponse.json({ configured: false });
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: process.env.INTELLIGENCE_MODEL ?? "gpt-4.1-mini",
        temperature: 0.4,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: query },
        ],
      }),
    });
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error("empty completion");
    return NextResponse.json({ configured: true, text, topic: null });
  } catch {
    // Any upstream failure degrades gracefully to local grounding.
    const local = localAnswer(query);
    return NextResponse.json({ configured: true, text: local.text, topic: local.topic });
  }
}
