import { SavedItemListEntry, UserProfile } from "@/lib/types";
import { ItemCard } from "@/components/item-card";

export function HeroSection({ profile }: { profile: UserProfile }) {
  return (
    <section className="heroCard">
      <div>
        <p className="eyebrow">Personal context</p>
        <h2>Saved links are interpreted through your role and interests.</h2>
      </div>
      <div className="heroInfo">
        <div>
          <span className="metaLabel">Role</span>
          <strong>{profile.role}</strong>
        </div>
        <div>
          <span className="metaLabel">Interest areas</span>
          <strong>{profile.interestAreas.join(" / ")}</strong>
        </div>
        <div>
          <span className="metaLabel">Notification mode</span>
          <strong>{profile.notificationPreference}</strong>
        </div>
      </div>
    </section>
  );
}

export function InboxSection({ items }: { items: SavedItemListEntry[] }) {
  return (
    <section className="sectionBlock">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Inbox</p>
          <h2>Recent captures from Telegram</h2>
        </div>
        <p className="muted">
          After each fetch, the bot can suggest purpose buttons and create reread reminders.
        </p>
      </div>

      <div className="cardGrid">
        {items.map((item) => (
          <ItemCard key={item.id} item={item} />
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
          <h2>Items most likely to matter again</h2>
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
