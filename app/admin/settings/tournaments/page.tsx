"use client";

import { useEffect, useState } from "react";
import { PencilLine, Trash2, X } from "lucide-react";

import {
  createTournamentAction,
  deleteTournamentAction,
  getAdminSettingsAction,
  updateTournamentAction,
} from "@/actions/admin-actions";
import { RoleGate } from "@/components/auth/role-gate";
import { SettingsListSkeleton } from "@/components/admin/settings-skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Tournament = {
  id: string;
  title: string;
  date: string;
  entryFee: number;
  prizePool: number;
};

const emptyForm = { title: "", date: "", entryFee: "", prizePool: "" };

export default function TournamentSettingsPage() {
  const [items, setItems] = useState<Tournament[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadItems() {
    try {
      const settings = await getAdminSettingsAction();
      setItems(settings.tournaments);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load tournaments");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadItems();
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim() || !form.date) {
      setError("Tournament name and date are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const input = {
        title: form.title,
        date: form.date,
        entryFee: Number(form.entryFee || 0),
        prizePool: Number(form.prizePool || 0),
      };
      if (editingId) await updateTournamentAction({ ...input, id: editingId });
      else await createTournamentAction(input);
      setForm(emptyForm);
      setEditingId(null);
      await loadItems();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save tournament");
    } finally {
      setSaving(false);
    }
  }

  function edit(item: Tournament) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      date: item.date,
      entryFee: String(item.entryFee),
      prizePool: String(item.prizePool),
    });
  }

  async function remove(item: Tournament) {
    if (!window.confirm(`Delete "${item.title}"?`)) return;
    setError("");
    try {
      await deleteTournamentAction(item.id);
      setItems((current) => current.filter((entry) => entry.id !== item.id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to delete tournament");
    }
  }

  return (
    <RoleGate role="admin">
      <Card className="border-border bg-surface">
        <CardHeader>
          <CardTitle>Tournaments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={submit} className="grid gap-4 md:grid-cols-4">
            <Field label="Name">
              <Input
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                placeholder="Tournament name"
                required
              />
            </Field>
            <Field label="Date">
              <Input
                type="date"
                value={form.date}
                onChange={(event) => setForm({ ...form, date: event.target.value })}
                required
              />
            </Field>
            <Field label="Entry fee (₹)">
              <Input
                type="number"
                min="0"
                step="1"
                value={form.entryFee}
                onChange={(event) => setForm({ ...form, entryFee: event.target.value })}
              />
            </Field>
            <Field label="Prize pool (₹)">
              <Input
                type="number"
                min="0"
                step="1"
                value={form.prizePool}
                onChange={(event) => setForm({ ...form, prizePool: event.target.value })}
              />
            </Field>
            <div className="flex gap-2 md:col-span-4">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : editingId ? "Save tournament" : "Add tournament"}
              </Button>
              {editingId ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingId(null);
                    setForm(emptyForm);
                  }}
                >
                  <X className="mr-1 h-4 w-4" /> Cancel
                </Button>
              ) : null}
            </div>
          </form>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {loading ? (
            <SettingsListSkeleton />
          ) : items.length === 0 ? (
            <Empty text="No tournaments yet. Add one when you are ready." />
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border p-4"
              >
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.date} · Entry ₹{item.entryFee} · Prize ₹{item.prizePool}
                  </p>
                </div>
                <div className="flex">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => edit(item)}
                    aria-label={`Edit ${item.title}`}
                  >
                    <PencilLine className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => void remove(item)}
                    aria-label={`Delete ${item.title}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </RoleGate>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
