import { SavedItemListEntry, UserProfile } from "@/lib/types";
import { ItemCard } from "@/components/item-card";

export function HeroSection({ profile }: { profile: UserProfile }) {
  return (
    <section className="heroCard">
      <div className="heroStatement">
        <p className="eyebrow">Personal context</p>
        <h2>Everything you save is reinterpreted through your role, interests, and future intent.</h2>
      </div>
      <div className="heroInfo">
        <div>
          <span className="metaLabel">Role</span>
          <strong>{profile.role}</strong>
        </div>
        <div>
          <span className="metaLabel">Interests</span>
          <strong>{profile.interestAreas.join(" / ")}</strong>
        </div>
        <div>
          <span className="metaLabel">Review</span>
          <strong>{profile.notificationPreference}</strong>
        </div>
      </div>
    </section>
  );
}

export function InboxSection({ items }: { items: SavedItemListEntry[] }) {
  return (
    <section className="sectionBlock gallerySection">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Library</p>
          <h2>Objects, ideas, fragments, and links worth keeping close.</h2>
        </div>
        <p className="muted">
          Telegram captures become a quiet board for rereading, sharing, and turning into future use.
        </p>
      </div>

      <div className="masonryGrid">
        {items.map((item, index) => (
          <ItemCard key={item.id} item={item} index={index} />
        ))}
      </div>
    </section>
  );
}

export function ReuseSection({ items }: { items: SavedItemListEntry[] }) {
  const topItems = [...items].sort((a, b) => b.rereadScore - a.rereadScore).slice(0, 2);

  return (
    <section className="sectionBlock">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Reread</p>
          <h2>Signals your future self is most likely to want back.</h2>
        </div>
      </div>

      <div className="cardGrid twoUp">
        {topItems.map((item) => (
          <div className="spotlightCard" key={item.id}>
            <p className="spotlightScore">{item.rereadScore}</p>
            <h3>{item.title}</h3>
            <p>{item.summary}</p>
            <span className="pill">{item.suggestedPurpose}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
