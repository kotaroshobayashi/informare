import { SavedItemListEntry } from "@/lib/types";
import { formatRelativeDate } from "@/lib/utils";

interface ItemCardProps {
  item: SavedItemListEntry;
  index?: number;
}

type CardVariant = "reel" | "video" | "article" | "social" | "quote" | "note" | "plain";

function getCardVariant(item: SavedItemListEntry, thumbnailUrl: string | null): CardVariant {
  const p = item.platform?.toLowerCase() ?? "";

  if (p === "instagram" || p === "tiktok") return "reel";
  if (p === "youtube") return "video";
  if (p === "x" || p === "twitter") return "social";

  if (thumbnailUrl) return "article";

  const textLen = (item.mainPoint || item.summary || "").length;
  if (textLen > 180) return "quote";
  if (item.captureNote) return "note";
  return "plain";
}

function isBlockedCdnUrl(url: string) {
  return url.includes("cdninstagram.com") || url.includes("fbcdn.net");
}

function getFallbackThumbnail(item: SavedItemListEntry) {
  const p = item.platform?.toLowerCase() ?? "";
  // Instagram/TikTok CDN URLs require auth — 403 in browser. Show brand gradient instead.
  if (item.thumbnailUrl && !isBlockedCdnUrl(item.thumbnailUrl)) return item.thumbnailUrl;
  if (p === "instagram" || p === "tiktok") return null;
  if (item.canonicalUrl && item.canonicalUrl !== "#") {
    return `https://image.thum.io/get/width/1200/crop/900/noanimate/${encodeURIComponent(item.canonicalUrl)}`;
  }
  return null;
}

export function ItemCard({ item }: ItemCardProps) {
  const thumbnailUrl = getFallbackThumbnail(item);
  const variant = getCardVariant(item, thumbnailUrl);
  const displayText = item.mainPoint || item.summary;
  const href = item.canonicalUrl && item.canonicalUrl !== "#" ? item.canonicalUrl : undefined;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`itemCard itemCard-${variant}`}
      style={href ? undefined : { cursor: "default" }}
    >
      {thumbnailUrl ? (
        <div
          className="itemMedia"
          style={{
            backgroundImage: `linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.32) 100%), url(${thumbnailUrl})`
          }}
        >
          <span className="mediaPlatform">{item.platform || item.sourceDomain}</span>
        </div>
      ) : variant === "reel" ? (
        <div className="itemMedia itemMediaReel">
          <span className="mediaPlatform">{item.platform || item.sourceDomain}</span>
        </div>
      ) : null}

      <div className="itemCardBody">
        {variant === "quote" ? (
          <p className="quoteText">{displayText}</p>
        ) : (
          <>
            <h3>{item.title}</h3>
            {displayText ? <p className="summaryCompact">{displayText}</p> : null}
          </>
        )}

        <div className="itemFooter">
          <span className="pill">{item.sourceDomain}</span>
          <span className="muted">{formatRelativeDate(item.createdAt)}</span>
        </div>
      </div>
    </a>
  );
}
