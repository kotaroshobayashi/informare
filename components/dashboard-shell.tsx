import type { Route } from "next";
import Link from "next/link";
import { ReactNode } from "react";
import { getInitials } from "@/lib/utils";
import { UserProfile } from "@/lib/types";

interface DashboardShellProps {
  profile: UserProfile;
  children: ReactNode;
}

const navItems: Array<{ href: Route; label: string }> = [
  { href: "/", label: "Inbox" },
  { href: "/library", label: "Library" },
  { href: "/settings", label: "Settings" }
];

export function DashboardShell({ profile, children }: DashboardShellProps) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <p className="eyebrow">Informare</p>
          <h1>Capture once. Reuse later.</h1>
          <p className="muted">
            Telegram-first stock system for links that should not disappear.
          </p>
        </div>

        <nav className="nav">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="navItem">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="profileCard">
          <div className="avatar">{getInitials(profile.displayName)}</div>
          <div>
            <strong>{profile.displayName}</strong>
            <p className="muted">{profile.role}</p>
          </div>
        </div>
      </aside>

      <main className="content">{children}</main>
    </div>
  );
}
