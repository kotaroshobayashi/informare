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

export function ItemCard({ item, index = 0 }: ItemCardProps) {
  const isVisual = Boolean(item.thumbnailUrl) || item.platform === "instagram" || item.platform === "youtube";
  const tone = isVisual ? "visual" : getCardTone(index);
  const showSummary = !isVisual;

  return (
    <article className={`itemCard itemCard-${tone}`}>
      {item.thumbnailUrl ? (
        <div
          className="itemMedia"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(20,20,24,0.08), rgba(20,20,24,0.18)), url(${item.thumbnailUrl})`
          }}
        >
          <span className="mediaPlatform">{item.platform || item.sourceDomain}</span>
        </div>
      ) : null}

      <div className="itemTopline">
        <span className="pill">{item.sourceDomain}</span>
        <span className="muted">{formatRelativeDate(item.createdAt)}</span>
      </div>

      <h3>{item.title}</h3>
      {item.mainPoint ? <p className="mainPoint">{item.mainPoint}</p> : null}
      {showSummary ? <p className="summary">{item.summary}</p> : null}

      <div className="metaGrid">
        <div>
          <span className="metaLabel">Use</span>
          <strong>{item.suggestedPurpose}</strong>
        </div>
        <div>
          <span className="metaLabel">Reread</span>
          <strong>{item.rereadScore}</strong>
        </div>
        <div>
          <span className="metaLabel">Lang</span>
          <strong>{item.language.toUpperCase()}</strong>
        </div>
      </div>

      <div className="tagRow">
        {item.tags.map((tag) => (
          <span key={tag} className="tag">
            {tag}
          </span>
        ))}
      </div>

      {(item.captureNote || item.userMemo) && (
        <div className="notes">
          {item.captureNote ? <p>Capture: {item.captureNote}</p> : null}
          {item.userMemo ? <p>Memo: {item.userMemo}</p> : null}
        </div>
      )}
    </article>
  );
}
