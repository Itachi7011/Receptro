"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, Alert } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea, FieldError } from "@/components/ui/Field";
import { DealerSelect } from "@/components/dealers/DealerSelect";
import { apiFetch, apiUpload, ApiError } from "@/lib/api-client";
import type { Invoice } from "@/types";

export default function NewInvoicePage() {
  return (
    <Suspense fallback={null}>
      <NewInvoiceForm />
    </Suspense>
  );
}

function NewInvoiceForm() {
  const router = useRouter();
  const params = useSearchParams();

  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    dealer: params.get("dealer") ?? "",
    invoiceNumber: "",
    amount: "",
    issueDate: today,
    dueDate: today,
    notes: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

  function update<K extends keyof typeof form>(key: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setLoading(true);
    try {
      let attachmentUrl: string | undefined;
      let attachmentPublicId: string | undefined;
      if (file) {
        const uploaded = await apiUpload<{ url: string; publicId: string }>("/api/upload", file);
        attachmentUrl = uploaded.url;
        attachmentPublicId = uploaded.publicId;
      }

      const data = await apiFetch<{ invoice: Invoice }>("/api/invoices", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          amount: Number(form.amount),
          attachmentUrl,
          attachmentPublicId,
        }),
      });
      router.push(`/invoices/${data.invoice.id}`);
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

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="font-display ledger-heading text-2xl">New invoice</h1>
      <Card>
        <form onSubmit={onSubmit} className="space-y-4">
          {error && <Alert>{error}</Alert>}
          <div>
            <Label htmlFor="dealer">Dealer</Label>
            <DealerSelect value={form.dealer} onChange={(id) => setForm((f) => ({ ...f, dealer: id }))} required />
            <FieldError>{fieldErrors.dealer?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="invoiceNumber">Invoice number</Label>
            <Input id="invoiceNumber" required value={form.invoiceNumber} onChange={update("invoiceNumber")} />
            <FieldError>{fieldErrors.invoiceNumber?.[0]}</FieldError>
          </div>
          <div>
            <Label htmlFor="amount">Amount (₹)</Label>
            <Input id="amount" type="number" min={0.01} step="0.01" required value={form.amount} onChange={update("amount")} />
            <FieldError>{fieldErrors.amount?.[0]}</FieldError>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="issueDate">Issue date</Label>
              <Input id="issueDate" type="date" required value={form.issueDate} onChange={update("issueDate")} />
            </div>
            <div>
              <Label htmlFor="dueDate">Due date</Label>
              <Input id="dueDate" type="date" required value={form.dueDate} onChange={update("dueDate")} />
              <FieldError>{fieldErrors.dueDate?.[0]}</FieldError>
            </div>
          </div>
          <div>
            <Label htmlFor="attachment">Attachment (JPG, PNG, or PDF — optional)</Label>
            <input
              id="attachment"
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-ink-soft file:mr-3 file:rounded-md file:border-0 file:bg-primary-soft file:px-3 file:py-2 file:text-primary"
            />
          </div>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={2} value={form.notes} onChange={update("notes")} />
          </div>
          <Button type="submit" loading={loading}>
            Create invoice
          </Button>
        </form>
      </Card>
    </div>
  );
}
