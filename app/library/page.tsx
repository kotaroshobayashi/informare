import { DashboardShell } from "@/components/dashboard-shell";
import { ItemCard } from "@/components/item-card";
import { loadDashboardData } from "@/server/repository";

export default async function LibraryPage() {
  const { profile, items, source } = await loadDashboardData();

  return (
    <DashboardShell profile={profile}>
      <section className="sectionBlock">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">Library</p>
            <h2>All saved knowledge assets</h2>
          </div>
          <p className="muted">
            This view becomes the main control tower for triage and reuse.
            {source === "mock" ? " Currently showing mock data until Supabase is configured." : ""}
          </p>
        </div>

        <div className="toolbar">
          <div className="toolbarPill">all</div>
          <div className="toolbarPill">newest</div>
          <div className="toolbarPill">auto-tagged</div>
        </div>

        <div className="masonryGrid">
          {items.map((item, index) => (
            <ItemCard key={item.id} item={item} index={index} />
          ))}
        </div>
      </section>
    </DashboardShell>
  );
}
