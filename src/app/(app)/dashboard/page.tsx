"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Card, Alert } from "@/components/ui/Card";
import { CardsSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { formatMoney, formatDate } from "@/lib/format";
import { useLocale } from "@/context/LocaleContext";
import type { DashboardSummary } from "@/types";

export default function DashboardPage() {
  const { t } = useLocale();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<DashboardSummary>("/api/dashboard/summary")
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : t.common.somethingWentWrong));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) return <Alert>{error}</Alert>;

  if (!data) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-8 w-48" />
        <CardsSkeleton />
        <div className="grid gap-6 lg:grid-cols-2">
          <CardsSkeleton count={1} />
          <CardsSkeleton count={1} />
        </div>
      </div>
    );
  }

  const stats = [
    {
      label: t.dashboard.totalOutstanding,
      value: data.totalOutstanding,
      sub: `${data.outstandingInvoiceCount} ${t.dashboard.invoicesCount}`,
      stripClass: "border-l-primary",
    },
    {
      label: t.dashboard.overdue,
      value: data.overdueAmount,
      sub: `${data.overdueInvoiceCount} ${t.dashboard.invoicesCount}`,
      stripClass: "border-l-red",
    },
    {
      label: t.dashboard.dueIn7Days,
      value: data.dueSoonAmount,
      sub: `${data.dueSoonInvoiceCount} ${t.dashboard.invoicesCount}`,
      stripClass: "border-l-amber",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display ledger-heading text-2xl">{t.dashboard.title}</h1>
        <p className="mt-2 text-sm text-ink-soft">
          {data.dealerCount} {t.dashboard.dealersOnRecord} · {data.invoiceCount} {t.dashboard.invoicesOnRecord}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label} className={`status-strip ${s.stripClass}`}>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">{s.label}</p>
            <p className="font-ledger mt-2 text-2xl font-semibold">{formatMoney(s.value)}</p>
            <p className="mt-1 text-xs text-ink-soft">{s.sub}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-display ledger-heading mb-4 text-lg">{t.dashboard.mostOverdueDealers}</h2>
          {data.topOverdueDealers.length === 0 ? (
            <p className="text-sm text-ink-soft">{t.dashboard.nothingOverdue}</p>
          ) : (
            <ul className="divide-y divide-border">
              {data.topOverdueDealers.map((d) => (
                <li key={d.dealerId} className="flex items-center justify-between py-2.5 text-sm">
                  <Link href={`/dealers/${d.dealerId}`} className="font-medium text-ink hover:text-primary">
                    {d.name}
                  </Link>
                  <div className="text-right">
                    <p className="font-ledger text-red">{formatMoney(d.outstanding)}</p>
                    <p className="text-xs text-ink-soft">
                      {d.invoiceCount} {t.dashboard.invoicesCount}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="font-display ledger-heading mb-4 text-lg">{t.dashboard.recentPayments}</h2>
          {data.recentPayments.length === 0 ? (
            <p className="text-sm text-ink-soft">{t.dashboard.noPayments}</p>
          ) : (
            <ul className="divide-y divide-border">
              {data.recentPayments.map((p) => {
                const dealer = typeof p.dealer === "object" ? p.dealer : null;
                const invoice = typeof p.invoice === "object" ? p.invoice : null;
                return (
                  <li key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                    <div>
                      <p className="font-medium text-ink">{dealer?.name ?? "Dealer"}</p>
                      <p className="text-xs text-ink-soft">
                        {invoice && "invoiceNumber" in invoice ? invoice.invoiceNumber : ""} ·{" "}
                        {formatDate(p.paymentDate)}
                      </p>
                    </div>
                    <p className="font-ledger text-green">{formatMoney(p.amount)}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
