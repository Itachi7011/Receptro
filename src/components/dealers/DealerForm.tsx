"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea, FieldError } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Card";
import { apiFetch, ApiError } from "@/lib/api-client";
import type { Dealer } from "@/types";

export interface DealerFormValues {
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  gstNumber: string;
  creditLimit: string;
  status: "ACTIVE" | "INACTIVE";
  notes: string;
}

const emptyValues: DealerFormValues = {
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  gstNumber: "",
  creditLimit: "0",
  status: "ACTIVE",
  notes: "",
};

export function dealerToFormValues(d: Dealer): DealerFormValues {
  return {
    name: d.name,
    contactPerson: d.contactPerson ?? "",
    phone: d.phone ?? "",
    email: d.email ?? "",
    address: d.address ?? "",
    gstNumber: d.gstNumber ?? "",
    creditLimit: String(d.creditLimit),
    status: d.status,
    notes: d.notes ?? "",
  };
}

export function DealerForm({
  initialValues,
  mode,
  dealerId,
  onSaved,
}: {
  initialValues?: DealerFormValues;
  mode: "create" | "edit";
  dealerId?: string;
  onSaved: (dealer: Dealer) => void;
}) {
  const [form, setForm] = useState<DealerFormValues>(initialValues ?? emptyValues);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

  function update<K extends keyof DealerFormValues>(key: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }) as DealerFormValues);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setLoading(true);
    try {
      const payload = { ...form, creditLimit: Number(form.creditLimit || 0) };
      const path = mode === "create" ? "/api/dealers" : `/api/dealers/${dealerId}`;
      const method = mode === "create" ? "POST" : "PUT";
      const data = await apiFetch<{ dealer: Dealer }>(path, { method, body: JSON.stringify(payload) });
      onSaved(data.dealer);
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
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <Alert>{error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="name">Dealer / business name</Label>
          <Input id="name" required value={form.name} onChange={update("name")} />
          <FieldError>{fieldErrors.name?.[0]}</FieldError>
        </div>
        <div>
          <Label htmlFor="contactPerson">Contact person</Label>
          <Input id="contactPerson" value={form.contactPerson} onChange={update("contactPerson")} />
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" value={form.phone} onChange={update("phone")} />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={form.email} onChange={update("email")} />
          <FieldError>{fieldErrors.email?.[0]}</FieldError>
        </div>
        <div>
          <Label htmlFor="creditLimit">Credit limit (₹)</Label>
          <Input id="creditLimit" type="number" min={0} step="0.01" value={form.creditLimit} onChange={update("creditLimit")} />
        </div>
        <div>
          <Label htmlFor="gstNumber">GST number</Label>
          <Input id="gstNumber" value={form.gstNumber} onChange={update("gstNumber")} />
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <Select id="status" value={form.status} onChange={update("status")}>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </Select>
        </div>
      </div>
      <div>
        <Label htmlFor="address">Address</Label>
        <Textarea id="address" rows={2} value={form.address} onChange={update("address")} />
      </div>
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" rows={2} value={form.notes} onChange={update("notes")} />
      </div>
      <Button type="submit" loading={loading}>
        {mode === "create" ? "Add dealer" : "Save changes"}
      </Button>
    </form>
  );
}
