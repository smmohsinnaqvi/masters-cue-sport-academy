"use client";

import { useEffect, useState } from "react";

import { getAdminSettingsAction, updateHourlyRatesAction } from "@/actions/admin-actions";
import { RoleGate } from "@/components/auth/role-gate";
import { SettingsFormSkeleton } from "@/components/admin/settings-skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RateSettingsPage() {
  const [rates, setRates] = useState({ snooker: "", pool: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void getAdminSettingsAction()
      .then(({ rates: current }) => {
        setRates({ snooker: String(current.snooker), pool: String(current.pool) });
        setError("");
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "Unable to load table rates");
      })
      .finally(() => setLoading(false));
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const updated = await updateHourlyRatesAction({
        snooker: Number(rates.snooker),
        pool: Number(rates.pool),
      });
      setRates({ snooker: String(updated.snooker), pool: String(updated.pool) });
      setSaved(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save table rates");
    } finally {
      setSaving(false);
    }
  }

  return (
    <RoleGate role="admin">
      <Card className="border-border bg-surface">
        <CardHeader>
          <CardTitle>Table hourly rates</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <SettingsFormSkeleton />
          ) : (
            <form onSubmit={submit} className="max-w-md space-y-4">
              <div className="space-y-2">
                <Label htmlFor="snooker-rate">Snooker per hour (₹)</Label>
                <Input
                  id="snooker-rate"
                  type="number"
                  min="0"
                  step="1"
                  value={rates.snooker}
                  onChange={(event) => setRates({ ...rates, snooker: event.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pool-rate">Pool per hour (₹)</Label>
                <Input
                  id="pool-rate"
                  type="number"
                  min="0"
                  step="1"
                  value={rates.pool}
                  onChange={(event) => setRates({ ...rates, pool: event.target.value })}
                  required
                />
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save rates"}
              </Button>
              {saved ? <p className="text-sm text-felt">Rates saved.</p> : null}
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </form>
          )}
          {!loading && error && !rates.snooker && !rates.pool ? (
            <p className="mt-4 text-sm text-destructive">{error}</p>
          ) : null}
        </CardContent>
      </Card>
    </RoleGate>
  );
}
