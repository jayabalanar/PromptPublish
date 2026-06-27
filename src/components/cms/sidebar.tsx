"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface Site {
  id: string | number;
  name: string;
  githubRepo: string;
  framework: string;
}

interface SidebarProps {
  sites: Site[];
}

export function Sidebar({ sites }: SidebarProps) {
  const pathname = usePathname();

  const activeSiteId = (() => {
    const m = pathname.match(/^\/cms\/sites\/([^/]+)/);
    return m ? m[1] : null;
  })();

  return (
    <aside className="w-[220px] shrink-0 flex flex-col border-r border-border bg-sidebar h-screen overflow-hidden">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-border">
        <Link href="/cms" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center shrink-0">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 3h10M2 7h6M2 11h8" stroke="white" strokeWidth="1.75" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="text-sm font-semibold text-foreground">PromptPublish</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {/* Overview */}
        <NavItem
          href="/cms"
          active={pathname === "/cms"}
          icon={
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M1.5 7.5L7.5 1.5L13.5 7.5V13H9.5V9.5H5.5V13H1.5V7.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
            </svg>
          }
        >
          All Sites
        </NavItem>

        {/* Sites section */}
        {sites.length > 0 && (
          <div className="pt-3 pb-1">
            <p className="px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">
              Sites
            </p>
            <div className="space-y-0.5">
              {sites.map((site) => {
                const isActive = activeSiteId === String(site.id);
                return (
                  <Link
                    key={site.id}
                    href={`/cms/sites/${site.id}`}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors group ${
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                    }`}
                  >
                    <FrameworkIcon framework={site.framework} />
                    <span className="truncate">{site.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border space-y-1">
        <NavItem
          href="/cms/settings"
          active={pathname === "/cms/settings"}
          icon={
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M7.5 1v1.5M7.5 12.5V14M14 7.5h-1.5M2.5 7.5H1M12.2 2.8l-1 1M3.8 11.2l-1 1M12.2 12.2l-1-1M3.8 3.8l-1-1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          }
        >
          Settings
        </NavItem>
        <Link
          href="/cms/connect"
          className="flex items-center justify-center gap-2 w-full rounded-md px-3 py-2 text-sm font-medium bg-brand text-brand-foreground hover:opacity-90 transition-opacity"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
          </svg>
          Connect Site
        </Link>
      </div>
    </aside>
  );
}

function NavItem({
  href,
  active,
  icon,
  children,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
      }`}
    >
      <span className="shrink-0 text-current opacity-60">{icon}</span>
      {children}
    </Link>
  );
}

function FrameworkIcon({ framework }: { framework: string }) {
  if (framework === "nextjs") {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
        <path d="M7 0a7 7 0 1 0 0 14A7 7 0 0 0 7 0zM5.25 4.5H6.5v3.94l4.017-5.19.633.49L6.36 9.5H5.25V4.5zM9.5 9.5V5.56l1.25-1.615V9.5H9.5z"/>
      </svg>
    );
  }
  if (framework === "react") {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="1.5" fill="currentColor"/>
        <ellipse cx="7" cy="7" rx="5.5" ry="2" stroke="currentColor" strokeWidth="1" fill="none"/>
        <ellipse cx="7" cy="7" rx="5.5" ry="2" stroke="currentColor" strokeWidth="1" fill="none" transform="rotate(60 7 7)"/>
        <ellipse cx="7" cy="7" rx="5.5" ry="2" stroke="currentColor" strokeWidth="1" fill="none" transform="rotate(120 7 7)"/>
      </svg>
    );
  }
  return (
    <div className="w-3.5 h-3.5 rounded-sm bg-current/20 text-[8px] flex items-center justify-center font-bold">W</div>
  );
}
