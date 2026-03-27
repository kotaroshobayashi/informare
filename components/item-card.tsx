import { SavedItemListEntry } from "@/lib/types";
import { formatRelativeDate } from "@/lib/utils";

interface ItemCardProps {
  item: SavedItemListEntry;
}

export function ItemCard({ item }: ItemCardProps) {
  return (
    <article className="itemCard">
      <div className="itemTopline">
        <span className="pill">{item.sourceDomain}</span>
        <span className="muted">{formatRelativeDate(item.createdAt)}</span>
      </div>

      <h3>{item.title}</h3>
      <p className="summary">{item.summary}</p>

      <div className="metaGrid">
        <div>
          <span className="metaLabel">Suggested use</span>
          <strong>{item.suggestedPurpose}</strong>
        </div>
        <div>
          <span className="metaLabel">Reread score</span>
          <strong>{item.rereadScore}</strong>
        </div>
        <div>
          <span className="metaLabel">Language</span>
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
