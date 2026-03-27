import { serverEnv } from "@/lib/env";
import { SavedPurpose, UserProfile } from "@/lib/types";

interface LlmEnrichmentInput {
  title: string;
  summary: string;
  language: string;
  domain: string;
  canonicalUrl: string;
  pageSnippet: string;
  fallbackTags: string[];
  fallbackPurposes: SavedPurpose[];
  fallbackRereadScore: number;
}

interface LlmEnrichmentOutput {
  summary: string;
  tags: string[];
  rationale: string;
  suggestedPurposes: SavedPurpose[];
  rereadScore: number;
}

const allowedPurposes = new Set<SavedPurpose>([
  "read_later",
  "reread",
  "share",
  "sns_seed",
  "networking",
  "idea_bank",
  "learning",
  "other"
]);

function sanitizePurposes(purposes: string[], fallback: SavedPurpose[]) {
  const valid = purposes.filter((purpose): purpose is SavedPurpose => allowedPurposes.has(purpose as SavedPurpose));
  return valid.length > 0 ? valid.slice(0, 4) : fallback;
}

function sanitizeTags(tags: string[], fallback: string[]) {
  const cleaned = tags.map((tag) => tag.trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned.slice(0, 6) : fallback;
}

function clampScore(score: number, fallback: number) {
  if (!Number.isFinite(score)) {
    return fallback;
  }

  return Math.max(1, Math.min(99, Math.round(score)));
}

export async function enrichWithLlm(
  input: LlmEnrichmentInput,
  profile: UserProfile
): Promise<LlmEnrichmentOutput | null> {
  if (!serverEnv.OPENAI_API_KEY) {
    return null;
  }

  const prompt = [
    "You are enriching a saved link for a personal knowledge stock system.",
    "Return strict JSON with keys: summary, tags, rationale, suggestedPurposes, rereadScore.",
    "summary must be 2-3 sentences and framed for the user's future reuse.",
    "tags must be short lowercase phrases.",
    "rationale must explain why this matters specifically to the user.",
    "suggestedPurposes must be an array chosen from: read_later, reread, share, sns_seed, networking, idea_bank, learning, other.",
    "rereadScore must be an integer from 1 to 99.",
    "",
    `User role: ${profile.role}`,
    `User interest areas: ${profile.interestAreas.join(", ") || "unknown"}`,
    `User languages: ${profile.languages.join(", ")}`,
    "",
    `URL: ${input.canonicalUrl}`,
    `Domain: ${input.domain}`,
    `Detected language: ${input.language}`,
    `Title: ${input.title}`,
    `Current summary: ${input.summary}`,
    `Page snippet: ${input.pageSnippet || "n/a"}`
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${serverEnv.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: prompt,
      text: {
        format: {
          type: "json_schema",
          name: "informare_enrichment",
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["summary", "tags", "rationale", "suggestedPurposes", "rereadScore"],
            properties: {
              summary: { type: "string" },
              tags: {
                type: "array",
                items: { type: "string" }
              },
              rationale: { type: "string" },
              suggestedPurposes: {
                type: "array",
                items: {
                  type: "string",
                  enum: ["read_later", "reread", "share", "sns_seed", "networking", "idea_bank", "learning", "other"]
                }
              },
              rereadScore: { type: "integer" }
            }
          }
        }
      }
    })
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as { output_text?: string };

  if (!data.output_text) {
    return null;
  }

  try {
    const parsed = JSON.parse(data.output_text) as {
      summary: string;
      tags: string[];
      rationale: string;
      suggestedPurposes: string[];
      rereadScore: number;
    };

    return {
      summary: parsed.summary?.trim() || input.summary,
      tags: sanitizeTags(parsed.tags ?? [], input.fallbackTags),
      rationale: parsed.rationale?.trim() || "Generated from the user's profile and captured page context.",
      suggestedPurposes: sanitizePurposes(parsed.suggestedPurposes ?? [], input.fallbackPurposes),
      rereadScore: clampScore(parsed.rereadScore, input.fallbackRereadScore)
    };
  } catch {
    return null;
  }
}
