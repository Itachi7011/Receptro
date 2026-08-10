"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Card, Alert, InvoiceStatusBadge } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select, Input } from "@/components/ui/Field";
import { Pagination } from "@/components/ui/Pagination";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { formatMoney, formatDate } from "@/lib/format";
import { useLocale } from "@/context/LocaleContext";
import type { Invoice, Pagination as PaginationData, Dealer } from "@/types";

export default function InvoicesPage() {
  const { t } = useLocale();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPage(1);
  }, [status, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      const qs = new URLSearchParams({ page: String(page) });
      if (status) qs.set("status", status);
      if (search) qs.set("search", search);
      apiFetch<{ invoices: Invoice[]; pagination: PaginationData }>(`/api/invoices?${qs.toString()}`)
        .then((data) => {
          setInvoices(data.invoices);
          setPagination(data.pagination);
        })
        .catch((err) => setError(err instanceof ApiError ? err.message : t.common.somethingWentWrong))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, search, page]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display ledger-heading text-2xl">{t.invoices.title}</h1>
        <div className="flex flex-wrap gap-2">
          <a href="/api/invoices/export">
            <Button variant="secondary">{t.common.export}</Button>
          </a>
          <Link href="/invoices/import">
            <Button variant="secondary">{t.invoices.importInvoices}</Button>
          </Link>
          <Link href="/invoices/new">
            <Button>+ {t.invoices.newInvoice}</Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder={t.common.search}
          aria-label={t.common.search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-xs" aria-label={t.common.status}>
          <option value="">{t.invoices.allStatuses}</option>
          <option value="UNPAID">{t.invoices.unpaid}</option>
          <option value="PARTIAL">{t.invoices.partial}</option>
          <option value="PAID">{t.invoices.paid}</option>
        </Select>
      </div>

      {error && <Alert>{error}</Alert>}

      {loading && invoices.length === 0 ? (
        <TableSkeleton cols={6} />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[700px] text-left text-sm">
            <caption className="sr-only">{t.invoices.title}</caption>
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-ink-soft">
                <th scope="col" className="px-5 py-3 font-medium">{t.invoices.invoiceNumber}</th>
                <th scope="col" className="px-5 py-3 font-medium">{t.invoices.dealer}</th>
                <th scope="col" className="px-5 py-3 font-medium">{t.invoices.dueDate}</th>
                <th scope="col" className="px-5 py-3 font-medium">{t.common.amount}</th>
                <th scope="col" className="px-5 py-3 font-medium">{t.common.balance}</th>
                <th scope="col" className="px-5 py-3 font-medium">{t.common.status}</th>
              </tr>
            </thead>
            <tbody>
              {!loading && invoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-ink-soft">
                    {t.invoices.noInvoices}
                  </td>
                </tr>
              )}
              {invoices.map((inv) => {
                const dealer = typeof inv.dealer === "object" ? (inv.dealer as Dealer) : null;
                const overdue = inv.status !== "PAID" && new Date(inv.dueDate) < new Date();
                return (
                  <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-ink/[0.02]">
                    <td className="px-5 py-3">
                      <Link href={`/invoices/${inv.id}`} className="font-medium text-ink hover:text-primary">
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      {dealer ? (
                        <Link href={`/dealers/${dealer.id}`} className="text-ink-soft hover:text-primary">
                          {dealer.name}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className={`px-5 py-3 ${overdue ? "text-red" : "text-ink-soft"}`}>{formatDate(inv.dueDate)}</td>
                    <td className="font-ledger px-5 py-3">{formatMoney(inv.amount)}</td>
                    <td className="font-ledger px-5 py-3">{formatMoney(inv.amount - inv.paidAmount)}</td>
                    <td className="px-5 py-3">
                      <InvoiceStatusBadge status={inv.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {pagination && <Pagination pagination={pagination} onPageChange={setPage} />}
    </div>
  );
}
