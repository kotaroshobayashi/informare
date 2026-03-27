import { SavedPurpose, UserProfile } from "@/lib/types";
import { enrichWithLlm } from "@/server/llm";

interface ExtractedSource {
  title: string;
  summary: string;
  mainPoint: string;
  canonicalUrl: string;
  domain: string;
  platform: string;
  thumbnailUrl?: string;
  language: string;
  tags: string[];
  rationale: string;
  suggestedPurposes: SavedPurpose[];
  rereadScore: number;
}

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractMetaContent(html: string, key: string, attr: "name" | "property" = "name") {
  // attr before content: <meta property="og:image" content="...">
  const p1 = new RegExp(`<meta[^>]+${attr}=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*\/?>`, "i");
  // content before attr: <meta content="..." property="og:image">
  const p2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+${attr}=["']${key}["'][^>]*\/?>`, "i");
  return html.match(p1)?.[1]?.trim() ?? html.match(p2)?.[1]?.trim();
}

function extractTitle(html: string) {
  return html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim();
}

function extractCanonical(html: string) {
  return html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i)?.[1]?.trim();
}

function extractJsonLdImage(html: string) {
  const matches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];

  for (const match of matches) {
    try {
      const parsed = JSON.parse(match[1]);
      const entries = Array.isArray(parsed) ? parsed : [parsed];

      for (const entry of entries) {
        const image = entry?.image;

        if (typeof image === "string") {
          return image;
        }

        if (Array.isArray(image) && typeof image[0] === "string") {
          return image[0];
        }

        if (image?.url && typeof image.url === "string") {
          return image.url;
        }
      }
    } catch {
      continue;
    }
  }

  return undefined;
}

function detectPlatform(hostname: string) {
  const host = hostname.toLowerCase();

  if (host.includes("instagram.com")) return "instagram";
  if (host.includes("youtube.com") || host.includes("youtu.be")) return "youtube";
  if (host.includes("tiktok.com")) return "tiktok";
  if (host.includes("x.com") || host.includes("twitter.com")) return "x";
  if (host.includes("note.com")) return "note";
  if (host.includes("substack.com")) return "substack";

  return host.replace(/^www\./, "");
}

function resolveAssetUrl(assetUrl: string | undefined, baseUrl: string) {
  if (!assetUrl) return undefined;

  try {
    return new URL(assetUrl, baseUrl).toString();
  } catch {
    return assetUrl;
  }
}

function extractYouTubeId(rawUrl: string): string | undefined {
  try {
    const u = new URL(rawUrl);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1).split("?")[0];
    return u.searchParams.get("v") ?? undefined;
  } catch {
    return undefined;
  }
}

function isBlockedCdnUrl(url: string) {
  return url.includes("cdninstagram.com") || url.includes("fbcdn.net");
}

function buildThumbnailFallback(platform: string, rawUrl: string): string {
  if (platform === "youtube") {
    const videoId = extractYouTubeId(rawUrl);
    if (videoId) return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  }
  const encoded = encodeURIComponent(rawUrl);
  return `https://image.thum.io/get/width/1200/crop/900/noanimate/${encoded}`;
}

function inferMainPoint(title: string, summary: string) {
  const source = summary.trim() || title.trim();
  const firstSentence = source.split(/[.!?。！？]\s/)[0]?.trim() || source;
  return firstSentence.length > 140 ? `${firstSentence.slice(0, 139)}…` : firstSentence;
}

function inferTags(title: string, summary: string, domain: string) {
  const corpus = `${title} ${summary} ${domain}`.toLowerCase();
  const tags = new Set<string>();

  if (corpus.includes("ai")) tags.add("ai");
  if (corpus.includes("product")) tags.add("product");
  if (corpus.includes("design")) tags.add("design");
  if (corpus.includes("workflow")) tags.add("workflow");
  if (corpus.includes("network")) tags.add("networking");
  if (corpus.includes("content")) tags.add("content");
  if (corpus.includes("note")) tags.add("notes");

  if (tags.size === 0) {
    tags.add(domain.replace(/^www\./, ""));
  }

  return [...tags].slice(0, 5);
}

function inferPurposes(title: string, summary: string): SavedPurpose[] {
  const corpus = `${title} ${summary}`.toLowerCase();
  const purposes = new Set<SavedPurpose>(["reread"]);

  if (corpus.includes("share") || corpus.includes("community")) purposes.add("share");
  if (corpus.includes("social") || corpus.includes("sns")) purposes.add("sns_seed");
  if (corpus.includes("idea") || corpus.includes("creative")) purposes.add("idea_bank");
  if (corpus.includes("learn") || corpus.includes("guide")) purposes.add("learning");

  return [...purposes];
}

function computeRereadScore(title: string, summary: string, tags: string[]) {
  const base = 55;
  const longformBonus = Math.min(summary.length / 8, 18);
  const tagBonus = tags.length * 4;
  const titleBonus = title.length > 40 ? 10 : 4;

  return Math.max(1, Math.min(99, Math.round(base + longformBonus + tagBonus + titleBonus)));
}

async function fetchPage(rawUrl: string) {
  const response = await fetch(rawUrl, {
    headers: {
      "user-agent": "InformareBot/0.1 (+https://informare.local)"
    },
    redirect: "follow"
  });

  const finalUrl = response.url || rawUrl;
  const html = await response.text();

  return { finalUrl, html };
}

export async function extractSourcePreview(rawUrl: string): Promise<ExtractedSource> {
  const url = new URL(rawUrl);

  try {
    const { finalUrl, html } = await fetchPage(rawUrl);
    const canonicalUrl = extractCanonical(html) || finalUrl;
    const title = extractTitle(html) || url.hostname;
    const summary =
      extractMetaContent(html, "description") ||
      extractMetaContent(html, "og:description", "property") ||
      "Captured by Informare. Full extraction and summarization pipeline can enrich this further.";
    const language = html.match(/<html[^>]+lang=["']([^"']+)["']/i)?.[1]?.trim() || "unknown";
    const domain = new URL(canonicalUrl).hostname;
    const platform = detectPlatform(domain);
    const rawThumbnailUrl =
      resolveAssetUrl(
        extractMetaContent(html, "og:image:secure_url", "property") ||
          extractMetaContent(html, "og:image:url", "property") ||
          extractMetaContent(html, "og:image", "property") ||
          extractMetaContent(html, "twitter:image") ||
          extractMetaContent(html, "twitter:image:src") ||
          html.match(/<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["'][^>]*>/i)?.[1]?.trim() ||
          extractJsonLdImage(html),
        canonicalUrl
      );
    // Instagram CDN URLs require auth — blocked cross-origin. Use thum.io for non-Instagram, skip for Instagram.
    const thumbnailUrl = rawThumbnailUrl && isBlockedCdnUrl(rawThumbnailUrl)
      ? (platform === "instagram" || platform === "tiktok" ? undefined : buildThumbnailFallback(platform, canonicalUrl))
      : rawThumbnailUrl ?? buildThumbnailFallback(platform, canonicalUrl);
    const tags = inferTags(title, summary, domain);
    const suggestedPurposes = inferPurposes(title, summary);
    const mainPoint = inferMainPoint(title, summary);

    return {
      title,
      summary,
      mainPoint,
      canonicalUrl,
      domain,
      platform,
      thumbnailUrl,
      language,
      tags,
      rationale:
        "The item was ranked from URL metadata and page copy. This will get more accurate once profile-aware LLM enrichment is added.",
      suggestedPurposes,
      rereadScore: computeRereadScore(title, summary, tags)
    };
  } catch {
    const domain = url.hostname;
    const title = domain.replace(/^www\./, "");
    const summary = "The URL was captured, but full metadata extraction failed. You can still keep it in the library.";
    const platform = detectPlatform(domain);
    const tags = inferTags(title, summary, domain);

    return {
      title,
      summary,
      mainPoint: inferMainPoint(title, summary),
      canonicalUrl: rawUrl,
      domain,
      platform,
      thumbnailUrl: buildThumbnailFallback(platform, rawUrl),
      language: "unknown",
      tags,
      rationale: "The page could not be fetched, so the system stored a minimal fallback record.",
      suggestedPurposes: ["read_later", "reread"],
      rereadScore: computeRereadScore(title, summary, tags)
    };
  }
}

export async function extractSourcePreviewForProfile(rawUrl: string, profile: UserProfile): Promise<ExtractedSource> {
  const extracted = await extractSourcePreview(rawUrl);

  try {
    const { html } = await fetchPage(rawUrl);
    const pageSnippet = stripHtml(html).slice(0, 3000);
    const enriched = await enrichWithLlm(
      {
        title: extracted.title,
        summary: extracted.summary,
        language: extracted.language,
        domain: extracted.domain,
        canonicalUrl: extracted.canonicalUrl,
        pageSnippet,
        fallbackTags: extracted.tags,
        fallbackPurposes: extracted.suggestedPurposes,
        fallbackRereadScore: extracted.rereadScore
      },
      profile
    );

    if (!enriched) {
      return extracted;
    }

    return {
      ...extracted,
      summary: enriched.summary,
      mainPoint: inferMainPoint(extracted.title, enriched.summary),
      tags: enriched.tags,
      rationale: enriched.rationale,
      suggestedPurposes: enriched.suggestedPurposes,
      rereadScore: enriched.rereadScore
    };
  } catch {
    return extracted;
  }
}
