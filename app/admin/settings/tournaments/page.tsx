"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { RoleGate } from "@/components/auth/role-gate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Tournament = { id: string; title: string; date: string; entryFee: string; prizePool: string };

export default function TournamentSettingsPage() {
  const [items, setItems] = useState<Tournament[]>([]);
  const [form, setForm] = useState({ title: "", date: "", entryFee: "", prizePool: "" });
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim() || !form.date) return;
    if (!window.confirm("Add this tournament?")) return;
    setItems([{ ...form, id: `${Date.now()}` }, ...items]);
    setForm({ title: "", date: "", entryFee: "", prizePool: "" });
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
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Tournament name"
              />
            </Field>
            <Field label="Date">
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </Field>
            <Field label="Entry fee">
              <Input
                type="number"
                min="0"
                value={form.entryFee}
                onChange={(e) => setForm({ ...form, entryFee: e.target.value })}
              />
            </Field>
            <Field label="Prize pool">
              <Input
                type="number"
                min="0"
                value={form.prizePool}
                onChange={(e) => setForm({ ...form, prizePool: e.target.value })}
              />
            </Field>
            <Button type="submit" className="md:col-span-4 w-fit">
              Add tournament
            </Button>
          </form>
          {items.length === 0 ? (
            <Empty text="No tournaments yet. Add one when you are ready." />
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg border border-border p-4"
              >
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.date} · Entry ₹{item.entryFee || 0} · Prize ₹{item.prizePool || 0}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    if (window.confirm("Delete this tournament?")) {
                      setItems(items.filter((current) => current.id !== item.id));
                    }
                  }}
                  aria-label="Delete tournament"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
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
