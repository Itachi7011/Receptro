"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Card, Alert } from "@/components/ui/Card";
import { formatMoney, formatDate } from "@/lib/format";
import type { AgingReport, AgingBucketKey } from "@/types";

const BUCKETS: { key: AgingBucketKey; label: string }[] = [
  { key: "current", label: "Current" },
  { key: "1-30", label: "1–30 days" },
  { key: "31-60", label: "31–60 days" },
  { key: "61-90", label: "61–90 days" },
  { key: "90+", label: "90+ days" },
];

export default function AgingReportPage() {
  const [report, setReport] = useState<AgingReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<AgingReport>("/api/reports/aging")
      .then(setReport)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load report."));
  }, []);

  if (error) return <Alert>{error}</Alert>;
  if (!report) return <p className="text-sm text-ink-soft">Loading…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display ledger-heading text-2xl">Aging report</h1>
        <p className="mt-2 text-sm text-ink-soft">As of {formatDate(report.asOf)}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {BUCKETS.map((b) => (
          <Card key={b.key}>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">{b.label}</p>
            <p className="font-ledger mt-2 text-lg font-semibold">{formatMoney(report.totals[b.key])}</p>
          </Card>
        ))}
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-ink-soft">
              <th className="px-5 py-3 font-medium">Dealer</th>
              {BUCKETS.map((b) => (
                <th key={b.key} className="px-5 py-3 text-right font-medium">
                  {b.label}
                </th>
              ))}
              <th className="px-5 py-3 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {report.rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-ink-soft">
                  Nothing outstanding right now.
                </td>
              </tr>
            )}
            {report.rows.map((row) => (
              <tr key={row.dealerId} className="border-b border-border last:border-0 hover:bg-ink/[0.02]">
                <td className="px-5 py-3">
                  <Link href={`/dealers/${row.dealerId}`} className="font-medium text-ink hover:text-primary">
                    {row.name}
                  </Link>
                </td>
                {BUCKETS.map((b) => (
                  <td key={b.key} className="font-ledger px-5 py-3 text-right">
                    {row.buckets[b.key] > 0 ? formatMoney(row.buckets[b.key]) : "—"}
                  </td>
                ))}
                <td className="font-ledger px-5 py-3 text-right font-semibold">{formatMoney(row.total)}</td>
              </tr>
            ))}
          </tbody>
          {report.rows.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-ink/20 font-semibold">
                <td className="px-5 py-3">Total</td>
                {BUCKETS.map((b) => (
                  <td key={b.key} className="font-ledger px-5 py-3 text-right">
                    {formatMoney(report.totals[b.key])}
                  </td>
                ))}
                <td className="font-ledger px-5 py-3 text-right">{formatMoney(report.grandTotal)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </Card>
    </div>
  );
}
