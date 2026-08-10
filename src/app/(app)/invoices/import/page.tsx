"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, Alert } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Field";
import { ApiError } from "@/lib/api-client";
import { useLocale } from "@/context/LocaleContext";

interface ImportResult {
  created: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

const TEMPLATE_CSV =
  "dealer,invoiceNumber,amount,issueDate,dueDate,notes\nSharma Traders,INV-2001,15000,2026-07-01,2026-07-31,\n";

export default function ImportInvoicesPage() {
  const { t } = useLocale();
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "receptro-invoice-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onSubmit() {
    if (!file) return;
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/invoices/import", { method: "POST", credentials: "include", body: form });
      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new ApiError(body.error ?? "Import failed.", res.status);
      }
      setResult(body.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.common.somethingWentWrong);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display ledger-heading text-2xl">{t.importPage.title}</h1>
        <Link href="/invoices" className="text-sm text-primary hover:underline">
          ← {t.common.back}
        </Link>
      </div>

      <Card>
        <p className="mb-4 text-sm text-ink-soft">{t.importPage.hint}</p>
        <button type="button" onClick={downloadTemplate} className="mb-4 text-sm text-primary hover:underline">
          {t.importPage.downloadTemplate}
        </button>

        {error && (
          <div className="mb-4">
            <Alert>{error}</Alert>
          </div>
        )}

        <Label htmlFor="csv-file">{t.importPage.chooseFile}</Label>
        <input
          id="csv-file"
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="mb-4 w-full text-sm text-ink-soft file:mr-3 file:rounded-md file:border-0 file:bg-primary-soft file:px-3 file:py-2 file:text-primary"
        />
        <Button onClick={onSubmit} disabled={!file} loading={loading}>
          {t.importPage.uploadAndImport}
        </Button>

        {result && (
          <div className="mt-6 space-y-3">
            <Alert tone={result.errors.length > 0 ? "info" : "success"}>
              {result.created} {t.importPage.created}, {result.skipped} {t.importPage.skipped}
            </Alert>
            {result.errors.length > 0 && (
              <ul className="max-h-64 space-y-1 overflow-y-auto rounded-md border border-border p-3 text-xs text-ink-soft">
                {result.errors.map((e, i) => (
                  <li key={i}>
                    {e.row > 0 ? `Row ${e.row}: ` : ""}
                    {e.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
