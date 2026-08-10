"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Card, Alert } from "@/components/ui/Card";
import { Pagination } from "@/components/ui/Pagination";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useLocale } from "@/context/LocaleContext";
import type { Pagination as PaginationData } from "@/types";

interface AuditLogEntry {
  id: string;
  actorName: string;
  action: string;
  entityType: string;
  entityLabel: string | null;
  createdAt: string;
}

function formatAction(action: string): string {
  return action.replace(".", " → ").replace(/_/g, " ");
}

export default function AuditLogPage() {
  const { t } = useLocale();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch<{ logs: AuditLogEntry[]; pagination: PaginationData }>(`/api/audit-logs?page=${page}`)
      .then((data) => {
        setLogs(data.logs);
        setPagination(data.pagination);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : t.common.somethingWentWrong))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  return (
    <div className="space-y-6">
      <h1 className="font-display ledger-heading text-2xl">{t.auditLog.title}</h1>

      {error && <Alert>{error}</Alert>}

      {loading ? (
        <TableSkeleton cols={3} />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-ink-soft">
                <th scope="col" className="px-5 py-3 font-medium">{t.auditLog.who}</th>
                <th scope="col" className="px-5 py-3 font-medium">{t.auditLog.what}</th>
                <th scope="col" className="px-5 py-3 font-medium">{t.auditLog.when}</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-5 py-8 text-center text-ink-soft">
                    {t.auditLog.noActivity}
                  </td>
                </tr>
              )}
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3 font-medium text-ink">{log.actorName}</td>
                  <td className="px-5 py-3 text-ink-soft">
                    {formatAction(log.action)}
                    {log.entityLabel ? ` — ${log.entityLabel}` : ""}
                  </td>
                  <td className="px-5 py-3 text-ink-soft">{new Date(log.createdAt).toLocaleString()}</td>
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
