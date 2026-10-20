"use client";

import { useEffect, useState } from "react";

import { getAdminSettingsAction, updateHourlyRatesAction } from "@/actions/admin-actions";
import { RoleGate } from "@/components/auth/role-gate";
import { SettingsFormSkeleton } from "@/components/admin/settings-skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { fieldA11yProps } from "@/components/ui/field-utils";
import { ratesFormSchema } from "@/lib/form-validation";

export default function RateSettingsPage() {
  const [rates, setRates] = useState({ snooker: "", pool: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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
    const validation = ratesFormSchema.safeParse(rates);
    if (!validation.success) {
      setFieldErrors(
        Object.fromEntries(validation.error.issues.map((issue) => [issue.path[0], issue.message])),
      );
      return;
    }
    setFieldErrors({});
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const updated = await updateHourlyRatesAction({
        ...validation.data,
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
              <Field
                id="snooker-rate"
                label="Snooker per hour (₹)"
                required
                error={fieldErrors.snooker}
              >
                <Input
                  id="snooker-rate"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="999999999"
                  step="1"
                  value={rates.snooker}
                  onChange={(event) => {
                    setRates({ ...rates, snooker: event.target.value });
                    setFieldErrors((current) => ({ ...current, snooker: "" }));
                  }}
                  required
                  {...fieldA11yProps("snooker-rate", fieldErrors.snooker)}
                />
              </Field>
              <Field id="pool-rate" label="Pool per hour (₹)" required error={fieldErrors.pool}>
                <Input
                  id="pool-rate"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="999999999"
                  step="1"
                  value={rates.pool}
                  onChange={(event) => {
                    setRates({ ...rates, pool: event.target.value });
                    setFieldErrors((current) => ({ ...current, pool: "" }));
                  }}
                  required
                  {...fieldA11yProps("pool-rate", fieldErrors.pool)}
                />
              </Field>
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
