"use client";

import { useEffect, useState } from "react";
import { PencilLine, Trash2, X } from "lucide-react";

import {
  createCafeteriaItemAction,
  deleteCafeteriaItemAction,
  getAdminSettingsAction,
  updateCafeteriaItemAction,
} from "@/actions/admin-actions";
import { RoleGate } from "@/components/auth/role-gate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Item = { id: string; name: string; note: string | null; price: number };
const emptyForm = { name: "", note: "", price: "" };

export default function CafeteriaSettingsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadItems() {
    try {
      const settings = await getAdminSettingsAction();
      setItems(settings.cafeteriaItems);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load cafeteria items");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadItems();
  }, []);

  async function addItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim()) {
      setError("Item name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await createCafeteriaItemAction({
        name: form.name,
        note: form.note,
        price: Number(form.price || 0),
      });
      setForm(emptyForm);
      await loadItems();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to add item");
    } finally {
      setSaving(false);
    }
  }

  async function saveItem(item: Item): Promise<boolean> {
    try {
      await updateCafeteriaItemAction(item);
      setItems((current) => current.map((entry) => (entry.id === item.id ? item : entry)));
      setError("");
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save item");
      return false;
    }
  }

  async function removeItem(item: Item) {
    if (!window.confirm(`Delete "${item.name}"?`)) return;
    setError("");
    try {
      await deleteCafeteriaItemAction(item.id);
      setItems((current) => current.filter((entry) => entry.id !== item.id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to delete item");
    }
  }

  return (
    <RoleGate role="admin">
      <Card className="border-border bg-surface">
        <CardHeader>
          <CardTitle>Cafeteria items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={addItem} className="grid gap-3 sm:grid-cols-[1fr_1fr_10rem_auto]">
            <Input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="Item name"
              aria-label="Item name"
              required
            />
            <Input
              value={form.note}
              onChange={(event) => setForm({ ...form, note: event.target.value })}
              placeholder="Short note (optional)"
              aria-label="Item note"
            />
            <Input
              type="number"
              min="0"
              step="1"
              value={form.price}
              onChange={(event) => setForm({ ...form, price: event.target.value })}
              placeholder="Price (₹)"
              aria-label="Price"
            />
            <Button type="submit" disabled={saving}>
              {saving ? "Adding…" : "Add item"}
            </Button>
          </form>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading cafeteria items…</p>
          ) : items.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No cafeteria items yet. Add the first item.
            </div>
          ) : (
            items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                onSave={saveItem}
                onDelete={() => void removeItem(item)}
              />
            ))
          )}
        </CardContent>
      </Card>
    </RoleGate>
  );
}

function ItemRow({
  item,
  onSave,
  onDelete,
}: {
  item: Item;
  onSave: (item: Item) => Promise<boolean>;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({
    name: item.name,
    note: item.note ?? "",
    price: String(item.price),
  });
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center">
      {editing ? (
        <>
          <Input
            value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            aria-label="Item name"
          />
          <Input
            value={draft.note}
            onChange={(event) => setDraft({ ...draft, note: event.target.value })}
            placeholder="Note"
            aria-label="Item note"
          />
          <Input
            className="sm:max-w-32"
            type="number"
            min="0"
            step="1"
            value={draft.price}
            onChange={(event) => setDraft({ ...draft, price: event.target.value })}
            aria-label="Price"
          />
          <Button
            size="sm"
            disabled={saving}
            onClick={async () => {
              if (!draft.name.trim()) return;
              setSaving(true);
              try {
                const saved = await onSave({ ...item, ...draft, price: Number(draft.price || 0) });
                if (saved) setEditing(false);
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setEditing(false)}
            aria-label="Cancel edit"
          >
            <X className="h-4 w-4" />
          </Button>
        </>
      ) : (
        <>
          <div className="flex-1">
            <p className="font-medium">{item.name}</p>
            {item.note ? <p className="text-xs text-muted-foreground">{item.note}</p> : null}
            <p className="text-sm text-muted-foreground">₹{item.price}</p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setEditing(true)}
            aria-label={`Edit ${item.name}`}
          >
            <PencilLine className="h-4 w-4" />
          </Button>
        </>
      )}
      <Button size="icon" variant="ghost" onClick={onDelete} aria-label={`Delete ${item.name}`}>
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}
