"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Alert } from "@/components/ui/Card";
import { Select, Label } from "@/components/ui/Field";
import { PaymentForm } from "@/components/payments/PaymentForm";
import { apiFetch, ApiError } from "@/lib/api-client";
import { formatMoney } from "@/lib/format";
import type { Invoice, Dealer } from "@/types";

export default function NewPaymentPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ invoices: Invoice[] }>("/api/invoices?limit=100")
      .then((data) => setInvoices(data.invoices.filter((i) => i.status !== "PAID")))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load invoices."));
  }, []);

  const selected = invoices.find((i) => i.id === selectedId) ?? null;

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="font-display ledger-heading text-2xl">Record a payment</h1>

      {error && <Alert>{error}</Alert>}

      <Card>
        <Label htmlFor="invoice">Outstanding invoice</Label>
        <Select id="invoice" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
          <option value="">Select an invoice…</option>
          {invoices.map((inv) => {
            const dealer = typeof inv.dealer === "object" ? (inv.dealer as Dealer) : null;
            return (
              <option key={inv.id} value={inv.id}>
                {inv.invoiceNumber} — {dealer?.name ?? "Dealer"} — balance {formatMoney(inv.amount - inv.paidAmount)}
              </option>
            );
          })}
        </Select>
      </Card>

      {selected && (
        <Card>
          <PaymentForm invoice={selected} onRecorded={() => router.push(`/invoices/${selected.id}`)} />
        </Card>
      )}
    </div>
  );
}
