"use client";

import { useLocale } from "@/context/LocaleContext";
import type { Pagination as PaginationData } from "@/types";

export function Pagination({
  pagination,
  onPageChange,
}: {
  pagination: PaginationData;
  onPageChange: (page: number) => void;
}) {
  const { t } = useLocale();
  const { page, pages, total, limit } = pagination;
  if (pages <= 1) return null;

  const start = (page - 1) * limit + 1;
  const end = Math.min(total, page * limit);

  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <p className="text-ink-soft">
        {t.common.showing} {start}–{end} {t.common.of} {total} {t.common.results}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="rounded-md border border-border px-3 py-1.5 text-ink-soft hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t.common.previous}
        </button>
        <span className="font-ledger px-2 text-ink-soft">
          {t.common.page} {page} {t.common.of} {pages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pages}
          className="rounded-md border border-border px-3 py-1.5 text-ink-soft hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t.common.next}
        </button>
      </div>
    </nav>
  );
}
