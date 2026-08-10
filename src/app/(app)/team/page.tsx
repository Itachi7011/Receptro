"use client";

import { useEffect, useState, type FormEvent } from "react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Card, Alert } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, FieldError } from "@/components/ui/Field";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useLocale } from "@/context/LocaleContext";
import { useAuth } from "@/context/AuthContext";

interface Member {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: "OWNER" | "ADMIN" | "STAFF";
  status: "ACTIVE" | "SUSPENDED";
  isVerified: boolean;
  createdAt: string;
}

export default function TeamPage() {
  const { t } = useLocale();
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [tempPasswordNotice, setTempPasswordNotice] = useState<string | null>(null);

  function load() {
    setLoading(true);
    apiFetch<{ members: Member[] }>("/api/team")
      .then((data) => setMembers(data.members))
      .catch((err) => setError(err instanceof ApiError ? err.message : t.common.somethingWentWrong))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onUpdateRole(id: string, role: "ADMIN" | "STAFF") {
    try {
      await apiFetch(`/api/team/${id}`, { method: "PUT", body: JSON.stringify({ role }) });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.common.somethingWentWrong);
    }
  }

  async function onToggleStatus(member: Member) {
    const status = member.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    try {
      await apiFetch(`/api/team/${member.id}`, { method: "PUT", body: JSON.stringify({ status }) });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.common.somethingWentWrong);
    }
  }

  async function onRemove(member: Member) {
    if (!confirm(t.team.removeConfirm)) return;
    try {
      await apiFetch(`/api/team/${member.id}`, { method: "DELETE" });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.common.somethingWentWrong);
    }
  }

  const canManage = user?.role === "OWNER" || user?.role === "ADMIN";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display ledger-heading text-2xl">{t.team.title}</h1>
        {canManage && (
          <Button onClick={() => setShowForm((v) => !v)}>
            {showForm ? t.common.cancel : `+ ${t.team.addMember}`}
          </Button>
        )}
      </div>

      {error && <Alert>{error}</Alert>}
      {tempPasswordNotice && (
        <Alert tone="success">
          {t.team.tempPasswordHint} {tempPasswordNotice}
        </Alert>
      )}

      {showForm && (
        <Card className="max-w-lg">
          <AddMemberForm
            onCreated={(password) => {
              setShowForm(false);
              setTempPasswordNotice(password);
              load();
            }}
          />
        </Card>
      )}

      {loading ? (
        <TableSkeleton cols={5} />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-ink-soft">
                <th scope="col" className="px-5 py-3 font-medium">{t.common.name}</th>
                <th scope="col" className="px-5 py-3 font-medium">{t.common.email}</th>
                <th scope="col" className="px-5 py-3 font-medium">{t.team.role}</th>
                <th scope="col" className="px-5 py-3 font-medium">{t.common.status}</th>
                {canManage && <th scope="col" className="px-5 py-3 font-medium">{t.common.actions}</th>}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-border last:border-0 hover:bg-ink/[0.02]">
                  <td className="px-5 py-3 font-medium text-ink">{m.name}</td>
                  <td className="px-5 py-3 text-ink-soft">{m.email}</td>
                  <td className="px-5 py-3">
                    {m.role === "OWNER" || user?.role !== "OWNER" || m.id === user?.id ? (
                      <span>{t.team[m.role.toLowerCase() as "owner" | "admin" | "staff"]}</span>
                    ) : (
                      <Select
                        value={m.role}
                        onChange={(e) => onUpdateRole(m.id, e.target.value as "ADMIN" | "STAFF")}
                        className="w-auto py-1"
                        aria-label={t.team.role}
                      >
                        <option value="STAFF">{t.team.staff}</option>
                        <option value="ADMIN">{t.team.admin}</option>
                      </Select>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {m.status === "ACTIVE" ? (
                      <span className="text-green">{t.common.active}</span>
                    ) : (
                      <span className="text-red">{t.team.suspended}</span>
                    )}
                  </td>
                  {canManage && (
                    <td className="px-5 py-3">
                      {m.role !== "OWNER" && m.id !== user?.id && (
                        <div className="flex gap-3 text-xs">
                          <button onClick={() => onToggleStatus(m)} className="text-primary hover:underline">
                            {m.status === "ACTIVE" ? t.team.suspend : t.team.reactivate}
                          </button>
                          <button onClick={() => onRemove(m)} className="text-red hover:underline">
                            {t.team.remove}
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function AddMemberForm({ onCreated }: { onCreated: (password: string) => void }) {
  const { t } = useLocale();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "STAFF" as "ADMIN" | "STAFF" });
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setLoading(true);
    try {
      await apiFetch("/api/team", { method: "POST", body: JSON.stringify(form) });
      onCreated(form.password);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.details && typeof err.details === "object") setFieldErrors(err.details as Record<string, string[]>);
      } else {
        setError(t.common.somethingWentWrong);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <Alert>{error}</Alert>}
      <div>
        <Label htmlFor="name">{t.common.name}</Label>
        <Input id="name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        <FieldError>{fieldErrors.name?.[0]}</FieldError>
      </div>
      <div>
        <Label htmlFor="email">{t.common.email}</Label>
        <Input
          id="email"
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        />
        <FieldError>{fieldErrors.email?.[0]}</FieldError>
      </div>
      <div>
        <Label htmlFor="password">{t.team.tempPassword}</Label>
        <Input
          id="password"
          required
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
        />
        <FieldError>{fieldErrors.password?.[0]}</FieldError>
      </div>
      <div>
        <Label htmlFor="role">{t.team.role}</Label>
        <Select
          id="role"
          value={form.role}
          onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as "ADMIN" | "STAFF" }))}
        >
          <option value="STAFF">{t.team.staff}</option>
          <option value="ADMIN">{t.team.admin}</option>
        </Select>
      </div>
      <Button type="submit" loading={loading}>
        {t.team.addMember}
      </Button>
    </form>
  );
}
