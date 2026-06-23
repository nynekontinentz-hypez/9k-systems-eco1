import { env } from "./env";

/**
 * Provider-agnostic text generation for the Studio. One env var picks the
 * provider; the same prompt runs against Gemini, Groq, OpenAI, or Anthropic.
 * Defaults favour the free tiers (Gemini, then Groq).
 */

export type ScriptDraft = {
  hook: string;
  titles: string[];
  script: string;
};

const DEFAULT_MODELS: Record<string, string> = {
  gemini: "gemini-2.0-flash",
  groq: "llama-3.3-70b-versatile",
  openai: "gpt-4o-mini",
  anthropic: "claude-3-5-haiku-latest",
};

function model(): string {
  return env.studioAiModel || DEFAULT_MODELS[env.studioAiProvider] || "gemini-2.0-flash";
}

async function withTimeout(input: RequestInfo, init: RequestInit, ms = 45000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(input, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Run the configured model; returns raw text (expected to be JSON). */
async function callModel(system: string, user: string): Promise<string> {
  const key = env.studioAiKey;
  if (!key) throw new Error("Studio AI is not configured (set STUDIO_AI_API_KEY).");
  const provider = env.studioAiProvider;

  if (provider === "gemini") {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model()}:generateContent?key=${key}`;
    const res = await withTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.85 },
      }),
    });
    if (!res.ok) throw new Error(`Gemini error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  }

  if (provider === "anthropic") {
    const res = await withTimeout("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model(),
        max_tokens: 4096,
        temperature: 0.85,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data?.content?.[0]?.text ?? "";
  }

  // OpenAI-compatible: openai + groq
  const base =
    provider === "groq"
      ? "https://api.groq.com/openai/v1"
      : "https://api.openai.com/v1";
  const res = await withTimeout(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model(),
      temperature: 0.85,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok)
    throw new Error(`${provider} error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

/** Tolerant JSON parse — handles models that wrap output in prose or fences. */
function parseDraft(raw: string): ScriptDraft {
  let text = raw.trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) text = fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1) text = text.slice(start, end + 1);

  const obj = JSON.parse(text) as Partial<ScriptDraft>;
  return {
    hook: typeof obj.hook === "string" ? obj.hook : "",
    titles: Array.isArray(obj.titles)
      ? obj.titles.filter((t): t is string => typeof t === "string").slice(0, 6)
      : [],
    script: typeof obj.script === "string" ? obj.script : "",
  };
}

/** Generate a hook, title options, and a voiceover script from a one-line idea. */
export async function generateScript(
  idea: string,
  channel?: string | null,
): Promise<ScriptDraft> {
  const system =
    "You are a senior scriptwriter for faceless YouTube videos. You write tight, " +
    "high-retention voiceover scripts with a strong cold open, clear narrative " +
    "beats, and a natural CTA. Avoid filler and AI clichés. Respond ONLY with a " +
    'JSON object: {"hook": string, "titles": string[5], "script": string}. ' +
    "The script is plain narration text (no scene labels unless useful).";

  const user = [
    `Idea: ${idea}`,
    channel ? `Channel / niche: ${channel}` : "",
    "Write: (1) a 1–2 sentence hook for the first 5 seconds, (2) exactly 5 " +
      "click-worthy but honest title options, (3) a full voiceover script of " +
      "roughly 600–900 words.",
  ]
    .filter(Boolean)
    .join("\n");

  const raw = await callModel(system, user);
  if (!raw) throw new Error("The model returned an empty response.");
  return parseDraft(raw);
}
