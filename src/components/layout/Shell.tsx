"use client";

import { useSiteUrl } from "@/hooks/useSiteUrl";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ExternalLink, LogOut, Menu, X } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { contentTypesApi, pagesApi } from "@/features/content/api";
import { pendingTotal, SUBMISSIONS_CHANGED, submissionsApi } from "@/features/submissions/api";
import { useQuery } from "@/hooks/useQuery";
import { cn } from "@/lib/cn";
import { ROLE_LABELS } from "@/lib/format";
import { NAV_GROUPS, type NavEntry, type SubLink } from "./nav";

type SubLinks = Partial<Record<NonNullable<NavEntry["children"]>, SubLink[]>>;

const matchesPath = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

function isActive(pathname: string, item: NavEntry, all: NavEntry[]): boolean {
  if (item.href === "/") return pathname === "/";
  const matches = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  if (!matches(item.href) && !(item.match ?? []).some(matches)) return false;
  // A more specific entry (e.g. /pages/global vs /pages) wins.
  return !all.some((other) => other !== item && other.href.length > item.href.length && matches(other.href));
}

type Badges = Partial<Record<NonNullable<NavEntry["badge"]>, number>>;

function Sidebar({ subLinks, badges, onNavigate }: { subLinks: SubLinks; badges: Badges; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user, can, logout } = useAuth();
  const viewUrl = useSiteUrl();
  // Submenus the user opened or closed by hand; otherwise a submenu is open while its section is active.
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const visible = NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => can(...i.permissions)) })).filter((g) => g.items.length);
  const all = visible.flatMap((g) => g.items);

  return (
    <div className="flex h-full flex-col bg-navy-900 text-white">
      <div className="flex h-20 shrink-0 items-center gap-3 px-6">
        <Link href="/" onClick={onNavigate} aria-label="Tableau de bord">
          <Image src="/brand/logo.png" alt="Taki Academy International School" width={150} height={60} priority className="h-11 w-auto" />
        </Link>
        <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-brand-light">Backoffice</span>
      </div>

      <nav aria-label="Navigation principale" className="flex-1 space-y-6 overflow-y-auto px-3 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {visible.map((group) => (
          <div key={group.title}>
            <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.1em] text-white/40">{group.title}</p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(pathname, item, all);
                // Pages that already have their own menu entry (e.g. site settings) are not repeated here.
                const children = (item.children ? subLinks[item.children] ?? [] : []).filter((c) => !all.some((o) => o.href === c.href));
                const activeChild = active ? children.find((c) => matchesPath(pathname, c.href)) : undefined;
                const expanded = children.length > 0 && (toggled[item.href] ?? active);
                const submenuId = `nav-sub-${item.href.replace(/\W+/g, "-")}`;
                const badge = item.badge ? badges[item.badge] ?? 0 : 0;
                return (
                  <li key={item.href}>
                    <div className="relative">
                      <Link
                        href={item.href}
                        onClick={() => {
                          setToggled((t) => ({ ...t, [item.href]: true }));
                          onNavigate?.();
                        }}
                        aria-current={active && !activeChild ? "page" : undefined}
                        className={cn(
                          "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14.5px] font-medium transition-colors",
                          children.length > 0 && "pr-11",
                          active && !activeChild
                            ? "bg-white/10 font-semibold text-white"
                            : active
                              ? "font-semibold text-white hover:bg-white/5"
                              : "text-white/70 hover:bg-white/5 hover:text-white",
                        )}
                      >
                        {active && !activeChild && <span className="absolute inset-y-2 left-0 w-1 rounded-full bg-sun" aria-hidden />}
                        <item.icon size={18} className={active ? "text-brand-light" : ""} aria-hidden />
                        {item.label}
                        {badge > 0 && (
                          <span className="ml-auto rounded-full bg-sun px-2 py-0.5 text-[11.5px] font-bold leading-none text-navy-900">
                            {badge > 99 ? "99+" : badge}
                            <span className="sr-only"> en attente</span>
                          </span>
                        )}
                      </Link>
                      {children.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setToggled((t) => ({ ...t, [item.href]: !expanded }))}
                          aria-expanded={expanded}
                          aria-controls={submenuId}
                          aria-label={`${expanded ? "Replier" : "Déplier"} ${item.label}`}
                          className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-white/55 hover:bg-white/10 hover:text-white"
                        >
                          <ChevronDown size={16} className={cn("transition-transform", expanded && "rotate-180")} aria-hidden />
                        </button>
                      )}
                    </div>
                    {expanded && (
                      <ul id={submenuId} className="mb-1.5 ml-[21px] mt-1 space-y-0.5 border-l border-white/10 pl-3">
                        {children.map((child) => {
                          const current = child === activeChild;
                          return (
                            <li key={child.href}>
                              <Link
                                href={child.href}
                                onClick={onNavigate}
                                aria-current={current ? "page" : undefined}
                                title={child.label}
                                className={cn(
                                  "relative block truncate rounded-lg px-3 py-1.5 text-[13.5px] transition-colors",
                                  current ? "bg-white/10 font-semibold text-white" : "text-white/60 hover:bg-white/5 hover:text-white",
                                )}
                              >
                                {current && <span className="absolute inset-y-1.5 -left-[13px] w-0.5 rounded-full bg-sun" aria-hidden />}
                                {child.label}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-white/10 p-3">
        <a
          href={viewUrl("/")}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium text-white/70 hover:bg-white/5 hover:text-white"
        >
          <ExternalLink size={17} aria-hidden />
          Voir le site
        </a>
        <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-linear-to-r from-[#2fa5de] to-[#6ebfe8] text-sm font-bold" aria-hidden>
            {user.name.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-white/55">{ROLE_LABELS[user.role]}</p>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            aria-label="Se déconnecter"
            title="Se déconnecter"
            className="grid size-9 shrink-0 place-items-center rounded-full text-white/65 hover:bg-white/10 hover:text-white"
          >
            <LogOut size={17} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Dashboard frame: fixed sidebar on desktop, drawer on smaller screens, content on the right. */
export function Shell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { can } = useAuth();

  // Sublinks of the "Pages" and "Contenus" menus, loaded once for both the sidebar and the mobile drawer.
  const canReadContent = can("content:read");
  const pages = useQuery(async (signal) => (canReadContent ? pagesApi.list(signal) : []), [canReadContent]);
  const types = useQuery(async (signal) => (canReadContent ? contentTypesApi.list(signal) : []), [canReadContent]);
  const subLinks = useMemo<SubLinks>(
    () => ({
      pages: (pages.data ?? []).map((p) => ({ label: p.label, href: `/pages/${p.key}` })),
      contentTypes: (types.data ?? []).map((t) => ({ label: t.label, href: `/content/${t.key}` })),
    }),
    [pages.data, types.data],
  );

  // Submissions still pending, shown as a counter in the menu; refreshed when the inbox changes one.
  const canReadSubmissions = can("submissions:read");
  const submissions = useQuery(async (signal) => (canReadSubmissions ? submissionsApi.counts(signal) : null), [canReadSubmissions, pathname]);
  const reloadSubmissions = submissions.reload;
  useEffect(() => {
    const refresh = () => void reloadSubmissions();
    window.addEventListener(SUBMISSIONS_CHANGED, refresh);
    return () => window.removeEventListener(SUBMISSIONS_CHANGED, refresh);
  }, [reloadSubmissions]);
  const badges = useMemo<Badges>(() => ({ submissions: submissions.data ? pendingTotal(submissions.data) : 0 }), [submissions.data]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Close the drawer when the route changes (back/forward navigation included).
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  return (
    <div className="min-h-dvh lg:pl-[272px]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[272px] lg:block">
        <Sidebar subLinks={subLinks} badges={badges} />
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-white/92 px-4 backdrop-blur-xl lg:hidden">
        <Link href="/" aria-label="Tableau de bord">
          <Image src="/brand/logo-light.svg" alt="Taki Academy International School" width={150} height={60} priority unoptimized className="h-11 w-auto" />
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Ouvrir le menu"
          aria-expanded={open}
          className="grid size-11 place-items-center rounded-full text-navy hover:bg-mist"
        >
          <Menu size={22} aria-hidden />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Fermer le menu" onClick={() => setOpen(false)} className="absolute inset-0 animate-fade-in bg-navy-900/60 backdrop-blur-sm" />
          <div className="absolute inset-y-0 left-0 w-[min(300px,86vw)] animate-fade-in shadow-2xl">
            <Sidebar subLinks={subLinks} badges={badges} onNavigate={() => setOpen(false)} />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fermer le menu"
              className="absolute right-3 top-5 grid size-10 place-items-center rounded-full text-white/80 hover:bg-white/10"
            >
              <X size={20} aria-hidden />
            </button>
          </div>
        </div>
      )}

      <main id="main" className="mx-auto w-full max-w-[1680px] px-4 py-5 sm:px-6 sm:py-6">
        {children}
      </main>
    </div>
  );
}
