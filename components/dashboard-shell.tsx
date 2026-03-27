import type { Route } from "next";
import Link from "next/link";
import { ReactNode } from "react";
import { getInitials } from "@/lib/utils";
import { UserProfile } from "@/lib/types";

interface DashboardShellProps {
  profile: UserProfile;
  children: ReactNode;
}

const navItems: Array<{ href: Route; label: string; short: string }> = [
  { href: "/", label: "Inbox", short: "In" },
  { href: "/library", label: "Library", short: "Lib" },
  { href: "/settings", label: "Settings", short: "Set" }
];

export function DashboardShell({ profile, children }: DashboardShellProps) {
  return (
    <div className="shell">
      <aside className="rail">
        <Link href="/" className="railBrand">
          i
        </Link>
        <nav className="nav">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="navItem" title={item.label}>
              {item.short}
            </Link>
          ))}
        </nav>
        <div className="avatar" style={{ marginTop: "auto", width: 36, height: 36, fontSize: "0.75rem" }}>
          {getInitials(profile.displayName)}
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <h1 className="topbarTitle">Search my mind.</h1>
          <div className="profilePill">
            <div className="avatar">{getInitials(profile.displayName)}</div>
            <div>
              <strong>{profile.displayName}</strong>
              <p className="muted" style={{ margin: 0, fontSize: "0.8rem" }}>{profile.role}</p>
            </div>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
