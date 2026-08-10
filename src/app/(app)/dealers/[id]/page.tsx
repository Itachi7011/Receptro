"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Card, Alert, InvoiceStatusBadge, DealerStatusBadge } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CardsSkeleton } from "@/components/ui/Skeleton";
import { DealerForm, dealerToFormValues } from "@/components/dealers/DealerForm";
import { formatMoney, formatDate } from "@/lib/format";
import { useLocale } from "@/context/LocaleContext";
import type { Dealer, Invoice, Payment, Pagination } from "@/types";

export default function DealerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t } = useLocale();
  const [dealer, setDealer] = useState<Dealer | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [tab, setTab] = useState<"invoices" | "payments">("invoices");
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function load() {
    apiFetch<{ dealer: Dealer }>(`/api/dealers/${id}`)
      .then((d) => setDealer(d.dealer))
      .catch((err) => setError(err instanceof ApiError ? err.message : t.common.somethingWentWrong));
    apiFetch<{ invoices: Invoice[]; pagination: Pagination }>(`/api/invoices?dealer=${id}&limit=50`)
      .then((d) => setInvoices(d.invoices))
      .catch(() => {});
    apiFetch<{ payments: Payment[]; pagination: Pagination }>(`/api/payments?dealer=${id}&limit=50`)
      .then((d) => setPayments(d.payments))
      .catch(() => {});
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function onDelete() {
    if (!confirm(t.dealers.deleteConfirm)) return;
    setDeleteError(null);
    try {
      await apiFetch(`/api/dealers/${id}`, { method: "DELETE" });
      router.push("/dealers");
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : t.common.somethingWentWrong);
    }
  }

  if (error) return <Alert>{error}</Alert>;
  if (!dealer) return <CardsSkeleton />;

  const outstanding = invoices.reduce((sum, i) => sum + (i.amount - i.paidAmount), 0);
  const utilization = dealer.creditLimit > 0 ? Math.min(100, (outstanding / dealer.creditLimit) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display ledger-heading text-2xl">{dealer.name}</h1>
          <div className="mt-2 flex items-center gap-2">
            <DealerStatusBadge status={dealer.status} />
            {dealer.gstNumber && <span className="text-xs text-ink-soft">GST: {dealer.gstNumber}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setEditing((v) => !v)}>
            {editing ? t.common.cancel : t.common.edit}
          </Button>
          <Button variant="danger" onClick={onDelete}>
            {t.common.delete}
          </Button>
          <Link href={`/invoices/new?dealer=${dealer.id}`}>
            <Button>+ {t.invoices.newInvoice}</Button>
          </Link>
        </div>
      </div>

      {deleteError && <Alert>{deleteError}</Alert>}

      {editing ? (
        <Card className="max-w-2xl">
          <DealerForm
            mode="edit"
            dealerId={dealer.id}
            initialValues={dealerToFormValues(dealer)}
            onSaved={(d) => {
              setDealer(d);
              setEditing(false);
            }}
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">{t.dealers.creditLimit}</p>
            <p className="font-ledger mt-2 text-xl font-semibold">{formatMoney(dealer.creditLimit)}</p>
          </Card>
          <Card>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">{t.dealers.outstanding}</p>
            <p className="font-ledger mt-2 text-xl font-semibold">{formatMoney(outstanding)}</p>
            {dealer.creditLimit > 0 && (
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink/10" role="progressbar" aria-valuenow={Math.round(utilization)} aria-valuemin={0} aria-valuemax={100} aria-label={t.dealers.outstanding}>
                <div
                  className={`h-full ${utilization >= 100 ? "bg-red" : utilization >= 75 ? "bg-amber" : "bg-primary"}`}
                  style={{ width: `${utilization}%` }}
                />
              </div>
            )}
          </Card>
          <Card>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">{t.dealers.contact}</p>
            <p className="mt-2 text-sm">{dealer.contactPerson || "—"}</p>
            <p className="text-sm text-ink-soft">{dealer.phone || dealer.email || ""}</p>
          </Card>
        </div>
      )}

      <div>
        <div className="mb-4 flex gap-1 border-b border-border" role="tablist">
          <button
            role="tab"
            aria-selected={tab === "invoices"}
            onClick={() => setTab("invoices")}
            className={`px-4 py-2 text-sm font-medium ${tab === "invoices" ? "border-b-2 border-primary text-primary" : "text-ink-soft"}`}
          >
            {t.dealers.invoicesTab} ({invoices.length})
          </button>
          <button
            role="tab"
            aria-selected={tab === "payments"}
            onClick={() => setTab("payments")}
            className={`px-4 py-2 text-sm font-medium ${tab === "payments" ? "border-b-2 border-primary text-primary" : "text-ink-soft"}`}
          >
            {t.dealers.paymentsTab} ({payments.length})
          </button>
        </div>

        {tab === "invoices" ? (
          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-ink-soft">
                  <th scope="col" className="px-5 py-3 font-medium">{t.invoices.invoiceNumber}</th>
                  <th scope="col" className="px-5 py-3 font-medium">{t.invoices.dueDate}</th>
                  <th scope="col" className="px-5 py-3 font-medium">{t.common.amount}</th>
                  <th scope="col" className="px-5 py-3 font-medium">{t.common.balance}</th>
                  <th scope="col" className="px-5 py-3 font-medium">{t.common.status}</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-ink-soft">
                      {t.invoices.noInvoices}
                    </td>
                  </tr>
                )}
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-ink/[0.02]">
                    <td className="px-5 py-3">
                      <Link href={`/invoices/${inv.id}`} className="font-medium text-ink hover:text-primary">
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-ink-soft">{formatDate(inv.dueDate)}</td>
                    <td className="font-ledger px-5 py-3">{formatMoney(inv.amount)}</td>
                    <td className="font-ledger px-5 py-3">{formatMoney(inv.amount - inv.paidAmount)}</td>
                    <td className="px-5 py-3">
                      <InvoiceStatusBadge status={inv.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ) : (
          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-ink-soft">
                  <th scope="col" className="px-5 py-3 font-medium">{t.common.date}</th>
                  <th scope="col" className="px-5 py-3 font-medium">{t.invoices.title}</th>
                  <th scope="col" className="px-5 py-3 font-medium">{t.payments.method}</th>
                  <th scope="col" className="px-5 py-3 font-medium">{t.common.amount}</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-ink-soft">
                      {t.dashboard.noPayments}
                    </td>
                  </tr>
                )}
                {payments.map((p) => {
                  const invoice = typeof p.invoice === "object" ? (p.invoice as Invoice) : null;
                  return (
                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-ink/[0.02]">
                      <td className="px-5 py-3 text-ink-soft">{formatDate(p.paymentDate)}</td>
                      <td className="px-5 py-3">
                        {invoice ? (
                          <Link href={`/invoices/${invoice.id}`} className="text-ink hover:text-primary">
                            {invoice.invoiceNumber}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-5 py-3 text-ink-soft">{p.method.replace("_", " ")}</td>
                      <td className="font-ledger px-5 py-3 text-green">{formatMoney(p.amount)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}
