"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";
import {
  DATE_RANGE_PRESETS,
  dateRangeForPreset,
  formatDateRangeKey,
  inclusiveDateCount,
  isDateRangeValid,
  shiftDateRange,
  type DateRangePreset,
  type DateRangeSelection,
} from "@/lib/date-range";

export function DateRangeFilter({
  value,
  onChange,
  label,
}: {
  value: DateRangeSelection;
  onChange: (selection: DateRangeSelection) => void;
  label: string;
}) {
  const [customEditing, setCustomEditing] = useState(false);
  const [customDraft, setCustomDraft] = useState<DateRangeSelection>(() => value);
  const customValid = isDateRangeValid(customDraft.from, customDraft.to);
  const visibleRange = customEditing ? customDraft : value;
  const days = inclusiveDateCount(visibleRange.from, visibleRange.to);

  function selectPreset(preset: DateRangePreset) {
    if (preset === "CUSTOM") {
      setCustomDraft({ ...value, preset: "CUSTOM" });
      setCustomEditing(true);
      return;
    }
    setCustomEditing(false);
    onChange({ preset, ...dateRangeForPreset(preset) });
  }

  function changeCustomDate(field: "from" | "to", date: string) {
    setCustomDraft((current) => ({ ...current, preset: "CUSTOM", [field]: date }));
  }

  function moveRange(direction: -1 | 1) {
    const range = customEditing ? customDraft : value;
    const shifted = shiftDateRange(range, direction);
    setCustomEditing(false);
    onChange(shifted);
  }

  function commitCustomRange() {
    if (!customValid) return;
    onChange(customDraft);
    setCustomEditing(false);
  }

  return (
    <section
      className="space-y-3 rounded-2xl border border-border/80 bg-background/35 p-3 sm:p-4"
      aria-label={`${label} date range`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          aria-label="Previous date range"
          onClick={() => moveRange(-1)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <CalendarDays className="h-4 w-4 shrink-0 text-felt" aria-hidden="true" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-foreground">
              {visibleRange.from === visibleRange.to
                ? formatDateRangeKey(visibleRange.from)
                : `${formatDateRangeKey(visibleRange.from)} – ${formatDateRangeKey(visibleRange.to)}`}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {days} {days === 1 ? "day" : "days"} · Academy local time
            </p>
          </div>
        </div>
        <button
          type="button"
          aria-label="Next date range"
          onClick={() => moveRange(1)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label={label}>
        {DATE_RANGE_PRESETS.map((preset) => {
          const selected = customEditing
            ? preset.value === "CUSTOM"
            : value.preset === preset.value;
          return (
            <button
              key={preset.value}
              type="button"
              aria-pressed={selected}
              onClick={() => selectPreset(preset.value)}
              className={cn(
                "min-h-9 shrink-0 rounded-full border px-3.5 text-xs font-semibold transition-colors",
                selected
                  ? "border-felt bg-felt text-primary-foreground"
                  : "border-border bg-surface/70 text-muted-foreground hover:text-foreground",
              )}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {customEditing ? (
        <div className="space-y-2 border-t border-border/70 pt-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="min-w-0 space-y-1 text-xs font-medium text-muted-foreground">
              Start date
              <input
                type="date"
                value={customDraft.from}
                max={customDraft.to || undefined}
                onChange={(event) => changeCustomDate("from", event.target.value)}
                className="min-h-10 w-full min-w-0 rounded-xl border border-border bg-background px-2 text-xs text-foreground [color-scheme:dark]"
              />
            </label>
            <label className="min-w-0 space-y-1 text-xs font-medium text-muted-foreground">
              End date
              <input
                type="date"
                value={customDraft.to}
                min={customDraft.from || undefined}
                onChange={(event) => changeCustomDate("to", event.target.value)}
                className="min-h-10 w-full min-w-0 rounded-xl border border-border bg-background px-2 text-xs text-foreground [color-scheme:dark]"
              />
            </label>
          </div>
          {!customValid ? (
            <p role="alert" className="text-xs text-destructive">
              Choose a valid start and end date.
            </p>
          ) : null}
          <button
            type="button"
            disabled={!customValid}
            onClick={commitCustomRange}
            className="min-h-10 w-full rounded-xl bg-felt px-4 text-sm font-semibold text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          >
            Apply date range
          </button>
        </div>
      ) : null}
    </section>
  );
}
