"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Card, Alert, InvoiceStatusBadge } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CardsSkeleton } from "@/components/ui/Skeleton";
import { PaymentForm } from "@/components/payments/PaymentForm";
import { formatMoney, formatDate } from "@/lib/format";
import { useLocale } from "@/context/LocaleContext";
import type { Invoice, Payment, Dealer } from "@/types";

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t } = useLocale();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [sendingReminder, setSendingReminder] = useState(false);

  function load() {
    apiFetch<{ invoice: Invoice; payments: Payment[] }>(`/api/invoices/${id}`)
      .then((data) => {
        setInvoice(data.invoice);
        setPayments(data.payments);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : t.common.somethingWentWrong));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function onDeleteInvoice() {
    if (!confirm(t.invoices.deleteConfirm)) return;
    setActionError(null);
    try {
      await apiFetch(`/api/invoices/${id}`, { method: "DELETE" });
      router.push("/invoices");
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : t.common.somethingWentWrong);
    }
  }

  async function onDeletePayment(paymentId: string) {
    if (!confirm(t.payments.removeConfirm)) return;
    setActionError(null);
    try {
      await apiFetch(`/api/payments/${paymentId}`, { method: "DELETE" });
      load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : t.common.somethingWentWrong);
    }
  }

  async function onSendReminder() {
    setActionError(null);
    setActionNotice(null);
    setSendingReminder(true);
    try {
      await apiFetch(`/api/invoices/${id}/remind`, { method: "POST" });
      setActionNotice(t.invoices.reminderSent);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : t.common.somethingWentWrong);
    } finally {
      setSendingReminder(false);
    }
  }

  if (error) return <Alert>{error}</Alert>;
  if (!invoice) return <CardsSkeleton />;

  const dealer = typeof invoice.dealer === "object" ? (invoice.dealer as Dealer) : null;
  const balance = invoice.amount - invoice.paidAmount;
  const overdue = invoice.status !== "PAID" && new Date(invoice.dueDate) < new Date();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display ledger-heading text-2xl">
            {t.invoices.title} {invoice.invoiceNumber}
          </h1>
          <div className="mt-2 flex items-center gap-2">
            <InvoiceStatusBadge status={invoice.status} />
            {overdue && <span className="text-xs font-medium text-red">{t.dashboard.overdue}</span>}
            {dealer && (
              <Link href={`/dealers/${dealer.id}`} className="text-sm text-ink-soft hover:text-primary">
                {dealer.name}
              </Link>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {invoice.status !== "PAID" && (
            <Button variant="secondary" onClick={onSendReminder} loading={sendingReminder}>
              {t.invoices.sendReminder}
            </Button>
          )}
          <Button variant="danger" onClick={onDeleteInvoice}>
            {t.common.delete}
          </Button>
        </div>
      </div>

      {actionError && <Alert>{actionError}</Alert>}
      {actionNotice && <Alert tone="success">{actionNotice}</Alert>}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">{t.common.amount}</p>
          <p className="font-ledger mt-2 text-xl font-semibold">{formatMoney(invoice.amount)}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">{t.common.balance}</p>
          <p className={`font-ledger mt-2 text-xl font-semibold ${balance > 0 ? "text-red" : "text-green"}`}>
            {formatMoney(balance)}
          </p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">{t.invoices.dueDate}</p>
          <p className="mt-2 text-sm">
            {t.invoices.issueDate}: {formatDate(invoice.issueDate)}
            <br />
            {t.invoices.dueDate}: {formatDate(invoice.dueDate)}
          </p>
        </Card>
      </div>

      {invoice.attachmentUrl && (
        <a href={invoice.attachmentUrl} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">
          {t.invoices.viewAttachment} ↗
        </a>
      )}
      {invoice.notes && <p className="text-sm text-ink-soft">{invoice.notes}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="font-display ledger-heading mb-4 text-lg">{t.payments.title}</h2>
          <Card className="overflow-hidden p-0">
            {payments.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-ink-soft">{t.dashboard.noPayments}</p>
            ) : (
              <ul className="divide-y divide-border">
                {payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between px-5 py-3 text-sm">
                    <div>
                      <p className="font-ledger font-medium text-ink">{formatMoney(p.amount)}</p>
                      <p className="text-xs text-ink-soft">
                        {formatDate(p.paymentDate)} · {p.method.replace("_", " ")}
                        {p.referenceNumber ? ` · ${p.referenceNumber}` : ""}
                      </p>
                    </div>
                    <button onClick={() => onDeletePayment(p.id)} className="text-xs text-red hover:underline">
                      {t.common.delete}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <div>
          <h2 className="font-display ledger-heading mb-4 text-lg">{t.payments.recordAPayment}</h2>
          <Card>
            <PaymentForm
              invoice={invoice}
              onRecorded={(result) => {
                setInvoice(result.invoice);
                setPayments((p) => [result.payment, ...p]);
              }}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
