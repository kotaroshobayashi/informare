import { SavedItemListEntry } from "@/lib/types";
import { formatRelativeDate } from "@/lib/utils";

interface ItemCardProps {
  item: SavedItemListEntry;
  index?: number;
}

function getCardTone(index: number) {
  const tones = ["quote", "soft", "wide", "note", "plain"];
  return tones[index % tones.length];
}

function getFallbackThumbnail(item: SavedItemListEntry) {
  if (item.thumbnailUrl) {
    return item.thumbnailUrl;
  }

  if (item.canonicalUrl && item.canonicalUrl !== "#") {
    return `https://image.thum.io/get/width/1200/crop/900/noanimate/${encodeURIComponent(item.canonicalUrl)}`;
  }

  return null;
}

export function ItemCard({ item, index = 0 }: ItemCardProps) {
  const thumbnailUrl = getFallbackThumbnail(item);
  const tone = thumbnailUrl ? "visual" : getCardTone(index);
  const displaySummary = item.mainPoint || item.summary;

  return (
    <article className={`itemCard itemCard-${tone}`}>
      {thumbnailUrl ? (
        <div
          className="itemMedia"
          style={{
            backgroundImage: `linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.28) 100%), url(${thumbnailUrl})`
          }}
        >
          <span className="mediaPlatform">{item.platform || item.sourceDomain}</span>
        </div>
      ) : null}

      <div className="itemCardBody">
        <h3>{item.title}</h3>
        {displaySummary ? (
          <p className="summaryCompact">{displaySummary}</p>
        ) : null}

        <div className="itemFooter">
          <span className="pill">{item.sourceDomain}</span>
          <span className="muted">{formatRelativeDate(item.createdAt)}</span>
        </div>
      </div>
    </article>
  );
}
