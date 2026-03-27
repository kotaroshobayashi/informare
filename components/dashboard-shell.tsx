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
      <aside className="rail">
        <Link href="/" className="railBrand">
          i
        </Link>
        <nav className="nav">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="navItem">
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">my informare</p>
            <h1 className="topbarTitle">Search my mind...</h1>
          </div>
          <div className="profilePill">
            <div className="avatar">{getInitials(profile.displayName)}</div>
            <div>
              <strong>{profile.displayName}</strong>
              <p className="muted">{profile.role}</p>
            </div>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
