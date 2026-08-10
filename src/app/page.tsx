import Link from "next/link";
import { ThemeSwitcher } from "@/components/settings/ThemeSwitcher";
import { LanguageSwitcher } from "@/components/settings/LanguageSwitcher";

const FEATURES = [
  {
    title: "Dealer credit limits",
    body: "Set a credit limit per dealer and see exposure at a glance — no more guessing who's near their cap.",
  },
  {
    title: "Invoices & collections",
    body: "Log invoices, record partial or full payments, and watch balances update automatically.",
  },
  {
    title: "Aging report",
    body: "A real 30/60/90+ day aging report per dealer, the way your accountant already thinks about it.",
  },
  {
    title: "Built for small distributors",
    body: "No ERP weight, no enterprise pricing — just credit, invoices, and collections, done well.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-paper">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="font-display text-2xl text-primary">Receptro</span>
        <nav className="flex items-center gap-3">
          <ThemeSwitcher />
          <LanguageSwitcher />
          <Link href="/login" className="text-sm font-medium text-ink-soft hover:text-ink">
            Log in
          </Link>
          <Link
            href="/register"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
          >
            Get started
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h1 className="font-display text-4xl leading-tight sm:text-5xl">
          Distributor credit &amp; collection management, without the ERP weight.
        </h1>
        <p className="mt-6 text-lg text-ink-soft">
          Receptro helps small distributors and wholesalers track dealer credit limits, invoices, and
          collections in one simple ledger — built for teams too small for a full ERP.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/register"
            className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-white hover:bg-primary-dark"
          >
            Create your account
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-border px-6 py-3 text-sm font-medium text-ink hover:border-primary hover:text-primary"
          >
            Log in
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="grid gap-6 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-lg border border-border bg-surface p-6">
              <h3 className="font-display ledger-heading text-lg">{f.title}</h3>
              <p className="mt-3 text-sm text-ink-soft">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border px-6 py-8 text-center text-xs text-ink-soft">
        © {new Date().getFullYear()} Receptro.
      </footer>
    </main>
  );
}
