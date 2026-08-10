"use client";

import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { DealerForm } from "@/components/dealers/DealerForm";

export default function NewDealerPage() {
  const router = useRouter();
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="font-display ledger-heading text-2xl">Add dealer</h1>
      <Card>
        <DealerForm mode="create" onSaved={(dealer) => router.push(`/dealers/${dealer.id}`)} />
      </Card>
    </div>
  );
}
