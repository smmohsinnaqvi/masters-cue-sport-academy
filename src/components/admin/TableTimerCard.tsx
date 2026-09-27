"use client";

import { Clock3, DollarSign, Play, Square } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Table } from "@/types/database";

type TableTimerCardProps = {
  table: Table;
  customerName?: string;
  isRunning: boolean;
  startedAt?: string | null;
  hourlyRate?: number;
  onStartSession: (tableId: string) => void;
  onStopSession: (tableId: string) => void;
};

function formatDuration(totalSeconds: number) {
  const safeSeconds = Math.max(0, totalSeconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

export function TableTimerCard({
  table,
  customerName = "Walk-in Customer",
  isRunning,
  startedAt,
  hourlyRate = Number(table.hourly_rate ?? 0),
  onStartSession,
  onStopSession,
}: TableTimerCardProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [isRunning]);

  const elapsedSeconds = useMemo(() => {
    if (!isRunning || !startedAt) {
      return 0;
    }

    return Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  }, [isRunning, now, startedAt]);

  const runningBill = useMemo(() => {
    const rate = Number(hourlyRate ?? 0);
    return (elapsedSeconds / 3600) * rate;
  }, [elapsedSeconds, hourlyRate]);

  return (
    <Card className="border-border bg-surface">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">{table.name}</h3>
              <Badge variant="outline" className="border-felt/40 text-felt">
                {table.type}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              ₹{Number(table.hourly_rate).toFixed(2)}/hr
            </p>
          </div>
          <Badge
            variant="outline"
            className={!isRunning ? "border-felt/40 text-felt" : "border-warning/45 text-warning"}
          >
            {isRunning ? "ONGOING" : "AVAILABLE"}
          </Badge>
        </div>

        <div className="rounded-lg border border-border bg-background/40 p-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock3 className="h-4 w-4 text-felt" aria-hidden="true" />
            <span>Live timer</span>
          </div>
          <p className="mt-2 text-2xl font-semibold tracking-tabular-nums">
            {formatDuration(elapsedSeconds)}
          </p>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border bg-surface/70 p-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Current customer
            </p>
            <p className="text-sm font-medium">{customerName}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Running bill</p>
            <p className="inline-flex items-center gap-1 text-sm font-semibold text-felt">
              <DollarSign className="h-4 w-4" aria-hidden="true" />
              {runningBill.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            className="min-h-12 flex-1"
            onClick={() => onStartSession(table.id)}
            disabled={isRunning}
          >
            <Play className="mr-2 h-4 w-4" aria-hidden="true" />
            Start Session
          </Button>

          <Button
            type="button"
            variant="outline"
            className="min-h-12 flex-1 border-border bg-surface/70"
            onClick={() => onStopSession(table.id)}
            disabled={!isRunning}
          >
            <Square className="mr-2 h-4 w-4" aria-hidden="true" />
            Stop & Bill
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
