"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Card, Alert } from "@/components/ui/Card";
import { Pagination } from "@/components/ui/Pagination";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { formatMoney, formatDate } from "@/lib/format";
import { useLocale } from "@/context/LocaleContext";
import type { Payment, Pagination as PaginationData, Dealer, Invoice } from "@/types";

const METHOD_KEY: Record<string, string> = {
  CASH: "cash",
  BANK_TRANSFER: "bankTransfer",
  UPI: "upi",
  CHEQUE: "cheque",
  OTHER: "other",
};

export default function PaymentsPage() {
  const { t } = useLocale();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch<{ payments: Payment[]; pagination: PaginationData }>(`/api/payments?page=${page}`)
      .then((data) => {
        setPayments(data.payments);
        setPagination(data.pagination);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : t.common.somethingWentWrong))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  return (
    <div className="space-y-6">
      <h1 className="font-display ledger-heading text-2xl">{t.payments.title}</h1>
      <p className="text-sm text-ink-soft">{t.payments.readOnlyHint}</p>

      {error && <Alert>{error}</Alert>}

      {loading && payments.length === 0 ? (
        <TableSkeleton cols={5} />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-left text-sm">
            <caption className="sr-only">{t.payments.title}</caption>
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-ink-soft">
                <th scope="col" className="px-5 py-3 font-medium">{t.common.date}</th>
                <th scope="col" className="px-5 py-3 font-medium">{t.invoices.dealer}</th>
                <th scope="col" className="px-5 py-3 font-medium">{t.invoices.title}</th>
                <th scope="col" className="px-5 py-3 font-medium">{t.payments.method}</th>
                <th scope="col" className="px-5 py-3 font-medium">{t.common.amount}</th>
              </tr>
            </thead>
            <tbody>
              {!loading && payments.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-ink-soft">
                    {t.dashboard.noPayments}
                  </td>
                </tr>
              )}
              {payments.map((p) => {
                const dealer = typeof p.dealer === "object" ? (p.dealer as Dealer) : null;
                const invoice = typeof p.invoice === "object" ? (p.invoice as Invoice) : null;
                return (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-ink/[0.02]">
                    <td className="px-5 py-3 text-ink-soft">{formatDate(p.paymentDate)}</td>
                    <td className="px-5 py-3">
                      {dealer ? (
                        <Link href={`/dealers/${dealer.id}`} className="font-medium text-ink hover:text-primary">
                          {dealer.name}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {invoice ? (
                        <Link href={`/invoices/${invoice.id}`} className="text-ink-soft hover:text-primary">
                          {invoice.invoiceNumber}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-5 py-3 text-ink-soft">{t.payments[METHOD_KEY[p.method] as keyof typeof t.payments] ?? p.method}</td>
                    <td className="font-ledger px-5 py-3 text-green">{formatMoney(p.amount)}</td>
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
