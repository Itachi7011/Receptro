import type { InvoiceStatus } from "@/types";

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-border bg-surface p-5 shadow-sm ${className}`}>{children}</div>
  );
}

export function Alert({ children, tone = "error" }: { children: React.ReactNode; tone?: "error" | "success" | "info" }) {
  const toneClasses = {
    error: "bg-red-soft text-red border-red/20",
    success: "bg-green-soft text-green border-green/20",
    info: "bg-primary-soft text-primary border-primary/20",
  }[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} aria-live="polite" className={`rounded-md border px-3 py-2 text-sm ${toneClasses}`}>
      {children}
    </div>
  );
}

const statusStyles: Record<InvoiceStatus, string> = {
  UNPAID: "bg-red-soft text-red border-red/30",
  PARTIAL: "bg-amber-soft text-amber border-amber/30",
  PAID: "bg-green-soft text-green border-green/30",
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${statusStyles[status]}`}>
      {status}
    </span>
  );
}

export function DealerStatusBadge({ status }: { status: "ACTIVE" | "INACTIVE" }) {
  const cls =
    status === "ACTIVE" ? "bg-green-soft text-green border-green/30" : "bg-ink/5 text-ink-soft border-ink/10";
  return <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>{status}</span>;
}
