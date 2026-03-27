import { DashboardShell } from "@/components/dashboard-shell";
import { loadDashboardData } from "@/server/repository";

const notificationModes = [
  {
    value: "save_only",
    label: "Save only",
    description: "Only send the first processing result after a link is captured."
  },
  {
    value: "after_24h",
    label: "24h follow-up",
    description: "Nudge the user once if the item still looks valuable tomorrow."
  },
  {
    value: "weekly",
    label: "Weekly digest",
    description: "Send a weekly reread digest sorted by future usefulness."
  },
  {
    value: "monthly",
    label: "Monthly review",
    description: "Use a slower rhythm for users who stock more deliberately."
  }
];

export default async function SettingsPage() {
  const { profile } = await loadDashboardData();

  return (
    <DashboardShell profile={profile}>
      <section className="sectionBlock">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">Settings</p>
            <h2>Profile and assistant defaults</h2>
          </div>
        </div>

        <div className="settingsGrid">
          <div className="settingsCard">
            <span className="metaLabel">Role</span>
            <h3>{profile.role}</h3>
            <p className="muted">Used to frame summaries and reuse suggestions.</p>
          </div>
          <div className="settingsCard">
            <span className="metaLabel">Interest areas</span>
            <h3>{profile.interestAreas.join(", ")}</h3>
            <p className="muted">These seed the tagger and relevance ranking.</p>
          </div>
        </div>

        <div className="settingsList">
          {notificationModes.map((mode) => (
            <div className="settingsOption" key={mode.value}>
              <div>
                <strong>{mode.label}</strong>
                <p className="muted">{mode.description}</p>
              </div>
              <span className={`modeChip ${profile.notificationPreference === mode.value ? "active" : ""}`}>
                {profile.notificationPreference === mode.value ? "Selected" : "Available"}
              </span>
            </div>
          ))}
        </div>
      </section>
    </DashboardShell>
  );
}
