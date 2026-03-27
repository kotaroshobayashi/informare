import { DashboardShell } from "@/components/dashboard-shell";
import { HeroSection, InboxSection, ReuseSection } from "@/components/sections";
import { loadDashboardData } from "@/server/repository";

export default async function HomePage() {
  const { profile, items } = await loadDashboardData();

  return (
    <DashboardShell profile={profile}>
      <HeroSection profile={profile} />
      <InboxSection items={items} />
      <ReuseSection items={items} />
    </DashboardShell>
  );
}
