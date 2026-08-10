"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea, FieldError } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Card";
import { apiFetch, ApiError } from "@/lib/api-client";
import type { Invoice, Payment } from "@/types";

export function PaymentForm({
  invoice,
  onRecorded,
}: {
  invoice: Invoice;
  onRecorded: (result: { payment: Payment; invoice: Invoice }) => void;
}) {
  const outstanding = invoice.amount - invoice.paidAmount;
  const [form, setForm] = useState({
    amount: outstanding > 0 ? String(outstanding) : "",
    paymentDate: new Date().toISOString().slice(0, 10),
    method: "BANK_TRANSFER",
    referenceNumber: "",
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

  function update<K extends keyof typeof form>(key: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setLoading(true);
    try {
      const result = await apiFetch<{ payment: Payment; invoice: Invoice }>("/api/payments", {
        method: "POST",
        body: JSON.stringify({ ...form, invoice: invoice.id, amount: Number(form.amount) }),
      });
      onRecorded(result);
      setForm((f) => ({ ...f, amount: "", referenceNumber: "", notes: "" }));
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.details && typeof err.details === "object") setFieldErrors(err.details as Record<string, string[]>);
      } else {
        setError("Something went wrong.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (outstanding <= 0) {
    return <p className="text-sm text-green">This invoice is fully paid.</p>;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {error && <Alert>{error}</Alert>}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="amount">Amount (₹)</Label>
          <Input id="amount" type="number" min={0.01} max={outstanding} step="0.01" required value={form.amount} onChange={update("amount")} />
          <FieldError>{fieldErrors.amount?.[0]}</FieldError>
        </div>
        <div>
          <Label htmlFor="paymentDate">Date</Label>
          <Input id="paymentDate" type="date" required value={form.paymentDate} onChange={update("paymentDate")} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="method">Method</Label>
          <Select id="method" value={form.method} onChange={update("method")}>
            <option value="CASH">Cash</option>
            <option value="BANK_TRANSFER">Bank transfer</option>
            <option value="UPI">UPI</option>
            <option value="CHEQUE">Cheque</option>
            <option value="OTHER">Other</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="referenceNumber">Reference # (optional)</Label>
          <Input id="referenceNumber" value={form.referenceNumber} onChange={update("referenceNumber")} />
        </div>
      </div>
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" rows={2} value={form.notes} onChange={update("notes")} />
      </div>
      <Button type="submit" loading={loading}>
        Record payment
      </Button>
    </form>
  );
}
