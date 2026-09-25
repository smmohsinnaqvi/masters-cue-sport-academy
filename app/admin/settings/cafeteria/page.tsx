"use client";

import { useState } from "react";
import { PencilLine, Trash2 } from "lucide-react";
import { RoleGate } from "@/components/auth/role-gate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Item = { id: string; name: string; price: string };
export default function CafeteriaSettingsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [form, setForm] = useState({ name: "", price: "" });
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim()) return;
    if (!window.confirm("Add this cafeteria item?")) return;
    setItems([{ ...form, id: `${Date.now()}` }, ...items]);
    setForm({ name: "", price: "" });
  }
  return (
    <RoleGate role="admin">
      <Card className="border-border bg-surface">
        <CardHeader>
          <CardTitle>Cafeteria items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Item name"
            />
            <Input
              className="sm:max-w-40"
              type="number"
              min="0"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              placeholder="Price"
            />
            <Button type="submit">Add item</Button>
          </form>
          {items.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No cafeteria items yet. Add the first item.
            </div>
          ) : (
            items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                onSave={(next) =>
                  setItems(items.map((current) => (current.id === item.id ? next : current)))
                }
                onDelete={() => setItems(items.filter((current) => current.id !== item.id))}
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
  onSave: (item: Item) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item);
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-3">
      {editing ? (
        <>
          <Input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          <Input
            className="max-w-32"
            type="number"
            value={draft.price}
            onChange={(e) => setDraft({ ...draft, price: e.target.value })}
          />
          <Button
            size="sm"
            onClick={() => {
              if (!window.confirm("Save changes to this item?")) return;
              onSave(draft);
              setEditing(false);
            }}
          >
            Save
          </Button>
        </>
      ) : (
        <>
          <div className="flex-1">
            <p className="font-medium">{item.name}</p>
            <p className="text-sm text-muted-foreground">₹{item.price || 0}</p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setEditing(true)}
            aria-label="Edit item"
          >
            <PencilLine className="h-4 w-4" />
          </Button>
        </>
      )}
      <Button
        size="icon"
        variant="ghost"
        onClick={() => {
          if (window.confirm("Delete this cafeteria item?")) onDelete();
        }}
        aria-label="Delete item"
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}
