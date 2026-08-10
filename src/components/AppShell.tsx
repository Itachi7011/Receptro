"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import { ThemeSwitcher } from "@/components/settings/ThemeSwitcher";
import { LanguageSwitcher } from "@/components/settings/LanguageSwitcher";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const { t } = useLocale();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdmin = user?.role === "OWNER" || user?.role === "ADMIN";

  const NAV_ITEMS = [
    { href: "/dashboard", label: t.nav.dashboard },
    { href: "/dealers", label: t.nav.dealers },
    { href: "/invoices", label: t.nav.invoices },
    { href: "/payments", label: t.nav.payments },
    { href: "/reports/aging", label: t.nav.agingReport },
    ...(isAdmin
      ? [
          { href: "/team", label: t.nav.team },
          { href: "/audit-log", label: t.nav.auditLog },
        ]
      : []),
    { href: "/settings", label: t.nav.settings },
  ];

  async function onLogout() {
    await logout();
    router.push("/login");
  }

  function isActive(href: string) {
    return pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
  }

  return (
    <div className="min-h-screen bg-paper">
      <div className="mx-auto flex max-w-7xl">
        <aside className="hidden w-56 shrink-0 border-r border-border px-4 py-6 md:block">
          <Link href="/dashboard" className="font-display block px-2 text-xl text-primary">
            Receptro
          </Link>
          <nav className="mt-8 space-y-1" aria-label="Primary">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    active ? "bg-primary-soft text-primary" : "text-ink-soft hover:bg-ink/5 hover:text-ink"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="font-display text-lg text-primary md:hidden">
                Receptro
              </Link>
              <button
                type="button"
                className="rounded-md border border-border px-2.5 py-1.5 text-sm md:hidden"
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-nav"
                onClick={() => setMobileMenuOpen((v) => !v)}
              >
                <span className="sr-only">Toggle navigation menu</span>
                ☰
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <ThemeSwitcher />
              <LanguageSwitcher />
              {!loading && user && (
                <div className="hidden text-right leading-tight sm:block">
                  <p className="text-sm font-medium text-ink">{user.companyName}</p>
                  <p className="text-xs text-ink-soft">
                    {user.name} · {user.role}
                  </p>
                </div>
              )}
              <button
                onClick={onLogout}
                className="rounded-md border border-border px-3 py-1.5 text-sm text-ink-soft hover:border-red hover:text-red"
              >
                {t.nav.logout}
              </button>
            </div>
          </header>
          <nav
            id="mobile-nav"
            aria-label="Primary"
            className={`${mobileMenuOpen ? "flex" : "hidden"} flex-col gap-1 border-b border-border px-4 py-2 md:hidden`}
          >
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                onClick={() => setMobileMenuOpen(false)}
                className={`rounded-md px-3 py-2 text-sm ${
                  isActive(item.href) ? "bg-primary-soft text-primary" : "text-ink-soft"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <main id="main-content" tabIndex={-1} className="px-4 py-8 sm:px-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
