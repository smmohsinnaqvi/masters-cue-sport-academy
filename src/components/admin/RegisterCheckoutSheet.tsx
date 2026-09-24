"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type RegisterCheckoutSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableName: string;
  tableType: string;
  ratePerHour: number;
  durationMinutes: number;
  playerOne: string;
  playerTwo: string;
  defaultWinner?: "playerOne" | "playerTwo" | "draw";
};

export function RegisterCheckoutSheet({
  open,
  onOpenChange,
  tableName,
  tableType,
  ratePerHour,
  durationMinutes,
  playerOne,
  playerTwo,
  defaultWinner = "playerOne",
}: RegisterCheckoutSheetProps) {
  const totalMinutes = Math.max(1, durationMinutes);
  const finalAmount = ((totalMinutes / 60) * ratePerHour).toFixed(2);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Close session & register bill</SheetTitle>
          <SheetDescription>
            {tableName} · {tableType}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="player-one">Player 1</Label>
              <Input id="player-one" defaultValue={playerOne} className="min-h-12" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="player-two">Player 2</Label>
              <Input id="player-two" defaultValue={playerTwo} className="min-h-12" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Duration</Label>
              <div className="flex min-h-12 items-center rounded-md border border-input bg-background px-3 text-sm">
                {totalMinutes} mins
              </div>
            </div>
            <div className="space-y-2">
              <Label>Rate</Label>
              <div className="flex min-h-12 items-center rounded-md border border-input bg-background px-3 text-sm">
                ₹{ratePerHour.toFixed(2)}/hr
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface/60 p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Final Amount</p>
            <p className="mt-2 text-2xl font-bold text-felt">₹{finalAmount}</p>
          </div>

          <div className="space-y-3">
            <Label>Winner</Label>
            <div className="flex flex-wrap gap-2">
              <label className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm">
                <input type="radio" name="winner" defaultChecked={defaultWinner === "playerOne"} />
                <span>{playerOne}</span>
              </label>
              <label className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm">
                <input type="radio" name="winner" defaultChecked={defaultWinner === "playerTwo"} />
                <span>{playerTwo}</span>
              </label>
              <label className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm">
                <input type="radio" name="winner" defaultChecked={defaultWinner === "draw"} />
                <span>Draw / None</span>
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-method">Payment</Label>
            <select
              id="payment-method"
              defaultValue="UPI"
              className="min-h-12 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
            >
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
            </select>
          </div>
        </div>

        <SheetFooter className="mt-8 gap-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="min-h-12"
          >
            Cancel
          </Button>
          <Button type="button" onClick={() => onOpenChange(false)} className="min-h-12">
            Print / Save register
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
