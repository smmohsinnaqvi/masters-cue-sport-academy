"use client";

import { useState } from "react";
import { RoleGate } from "@/components/auth/role-gate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RateSettingsPage() {
  const [rates, setRates] = useState({ snooker: "", pool: "" });
  const [saved, setSaved] = useState(false);
  return (
    <RoleGate role="admin">
      <Card className="border-border bg-surface">
        <CardHeader>
          <CardTitle>Table hourly rates</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!window.confirm("Save these hourly rates?")) return;
              setSaved(true);
            }}
            className="max-w-md space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="snooker-rate">Snooker per hour</Label>
              <Input
                id="snooker-rate"
                type="number"
                min="0"
                value={rates.snooker}
                onChange={(e) => setRates({ ...rates, snooker: e.target.value })}
                placeholder="Enter rate"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pool-rate">Pool per hour</Label>
              <Input
                id="pool-rate"
                type="number"
                min="0"
                value={rates.pool}
                onChange={(e) => setRates({ ...rates, pool: e.target.value })}
                placeholder="Enter rate"
              />
            </div>
            <Button type="submit">Save rates</Button>
            {saved ? <p className="text-sm text-felt">Rates saved for this session.</p> : null}
          </form>
        </CardContent>
      </Card>
    </RoleGate>
  );
}
