"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type SlotOption = {
  id: string;
  start: string;
  end: string;
  label: string;
  available: boolean;
};

type SlotPickerProps = {
  tableName: string;
  slots: SlotOption[];
  selectedSlotId?: string;
  onSelectSlot: (slotId: string) => void;
  onConfirm: () => void;
  customerName?: string;
  customerPhone?: string;
};

export function SlotPicker({
  tableName,
  slots,
  selectedSlotId,
  onSelectSlot,
  onConfirm,
  customerName = "",
  customerPhone = "",
}: SlotPickerProps) {
  return (
    <Card className="border-border bg-surface">
      <CardHeader className="p-5 pb-2">
        <CardTitle className="text-lg">Pick a time for {tableName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-5 pt-0">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {slots.map((slot) => {
            const active = selectedSlotId === slot.id;

            return (
              <Button
                key={slot.id}
                type="button"
                variant={active ? "default" : "outline"}
                disabled={!slot.available}
                onClick={() => onSelectSlot(slot.id)}
                className={
                  "min-h-12 justify-center" +
                  (!slot.available ? " cursor-not-allowed opacity-50" : "")
                }
              >
                {slot.label}
              </Button>
            );
          })}
        </div>

        {(customerName || customerPhone) && (
          <div className="rounded-md border border-border bg-background/40 p-3 text-sm text-muted-foreground">
            <p>{customerName}</p>
            <p>{customerPhone}</p>
          </div>
        )}

        <Button type="button" className="min-h-12 w-full" onClick={onConfirm}>
          Confirm reservation
        </Button>
      </CardContent>
    </Card>
  );
}
