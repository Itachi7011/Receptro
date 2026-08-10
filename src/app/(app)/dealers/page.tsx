"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Card, Alert, DealerStatusBadge } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Pagination } from "@/components/ui/Pagination";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { formatMoney } from "@/lib/format";
import { useLocale } from "@/context/LocaleContext";
import type { Dealer, Pagination as PaginationData } from "@/types";

export default function DealersPage() {
  const { t } = useLocale();
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      const qs = new URLSearchParams({ page: String(page) });
      if (search) qs.set("search", search);
      apiFetch<{ dealers: Dealer[]; pagination: PaginationData }>(`/api/dealers?${qs.toString()}`)
        .then((data) => {
          setDealers(data.dealers);
          setPagination(data.pagination);
        })
        .catch((err) => setError(err instanceof ApiError ? err.message : t.common.somethingWentWrong))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, page]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display ledger-heading text-2xl">{t.dealers.title}</h1>
        <div className="flex gap-2">
          <a href="/api/dealers/export">
            <Button variant="secondary">{t.common.export}</Button>
          </a>
          <Link href="/dealers/new">
            <Button>+ {t.dealers.addDealer}</Button>
          </Link>
        </div>
      </div>

      <Input
        placeholder={t.dealers.searchPlaceholder}
        aria-label={t.common.search}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {error && <Alert>{error}</Alert>}

      {loading && dealers.length === 0 ? (
        <TableSkeleton cols={4} />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-left text-sm">
            <caption className="sr-only">{t.dealers.title}</caption>
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-ink-soft">
                <th scope="col" className="px-5 py-3 font-medium">{t.common.name}</th>
                <th scope="col" className="px-5 py-3 font-medium">{t.dealers.contact}</th>
                <th scope="col" className="px-5 py-3 font-medium">{t.dealers.creditLimit}</th>
                <th scope="col" className="px-5 py-3 font-medium">{t.common.status}</th>
              </tr>
            </thead>
            <tbody>
              {!loading && dealers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-ink-soft">
                    {t.dealers.noDealers}
                  </td>
                </tr>
              )}
              {dealers.map((d) => (
                <tr key={d.id} className="border-b border-border last:border-0 hover:bg-ink/[0.02]">
                  <td className="px-5 py-3">
                    <Link href={`/dealers/${d.id}`} className="font-medium text-ink hover:text-primary">
                      {d.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-ink-soft">{d.phone || d.contactPerson || "—"}</td>
                  <td className="font-ledger px-5 py-3">{formatMoney(d.creditLimit)}</td>
                  <td className="px-5 py-3">
                    <DealerStatusBadge status={d.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {pagination && <Pagination pagination={pagination} onPageChange={setPage} />}
    </div>
  );
}
