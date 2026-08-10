"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { Select } from "@/components/ui/Field";
import type { Dealer } from "@/types";

export function DealerSelect({
  value,
  onChange,
  required,
}: {
  value: string;
  onChange: (id: string) => void;
  required?: boolean;
}) {
  const [dealers, setDealers] = useState<Dealer[]>([]);

  useEffect(() => {
    apiFetch<{ dealers: Dealer[] }>("/api/dealers?limit=100&status=ACTIVE")
      .then((data) => setDealers(data.dealers))
      .catch(() => {});
  }, []);

  return (
    <Select required={required} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Select a dealer…</option>
      {dealers.map((d) => (
        <option key={d.id} value={d.id}>
          {d.name}
        </option>
      ))}
    </Select>
  );
}
