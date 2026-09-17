import { FLOOR_ZONES, MOCK_TABLES, type Table } from "@/lib/mockData";
import type { TableAvailability } from "@/lib/booking";
import { cn } from "@/lib/utils";

const FILL: Record<TableAvailability, string> = {
  FREE: "fill-felt/25 stroke-felt",
  PARTIAL: "fill-warning/20 stroke-warning",
  FULL: "fill-destructive/20 stroke-destructive",
};

const ZONE_TONE = {
  gold: "fill-gold/10 stroke-gold/50",
  felt: "fill-felt/10 stroke-felt/45",
  muted: "fill-muted/40 stroke-border",
} as const;

export function FloorMap({
  selectedTableId,
  availability,
  onSelect,
}: {
  selectedTableId: string;
  availability: Record<string, TableAvailability>;
  onSelect: (table: Table) => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-subtle p-3">
      <svg viewBox="0 0 100 64" className="h-auto w-full" role="group" aria-label="Academy floor plan">
        <rect
          x="2"
          y="2"
          width="96"
          height="60"
          rx="2"
          className="fill-background/60 stroke-border"
          strokeWidth="0.4"
        />
        <text x="4" y="5.2" className="fill-muted-foreground" style={{ fontSize: "2.2px" }}>
          MAIN ARENA — NO SMOKING
        </text>

        {FLOOR_ZONES.map((zone) => (
          <g key={zone.id}>
            <rect
              x={zone.x}
              y={zone.y}
              width={zone.w}
              height={zone.h}
              rx="1"
              className={ZONE_TONE[zone.tone]}
              strokeWidth="0.35"
            />
            <text
              x={zone.x + zone.w / 2}
              y={zone.y + zone.h / 2 + 0.8}
              textAnchor="middle"
              className="fill-muted-foreground"
              style={{ fontSize: "2.1px" }}
            >
              {zone.label}
            </text>
          </g>
        ))}

        {MOCK_TABLES.map((table) => {
          const status = availability[table.id] ?? "FREE";
          const isSelected = table.id === selectedTableId;
          const { x, y, w, h } = table.position;
          return (
            <g
              key={table.id}
              role="button"
              tabIndex={0}
              aria-label={`${table.name}, ${status.toLowerCase()}`}
              onClick={() => onSelect(table)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(table);
                }
              }}
              className="cursor-pointer outline-none"
            >
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                rx="1.4"
                className={cn(FILL[status], isSelected && "fill-felt/45")}
                strokeWidth={isSelected ? 1 : 0.45}
              />
              <text
                x={x + w / 2}
                y={y + h / 2 - 0.4}
                textAnchor="middle"
                className="fill-foreground font-bold"
                style={{ fontSize: "3px" }}
              >
                {table.shortName}
              </text>
              <text
                x={x + w / 2}
                y={y + h / 2 + 3.4}
                textAnchor="middle"
                className="fill-muted-foreground"
                style={{ fontSize: "2px" }}
              >
                {table.size} · ₹{table.hourlyRate}/hr
              </text>
            </g>
          );
        })}
      </svg>

      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
        <LegendDot className="bg-felt" label="Mostly free" />
        <LegendDot className="bg-warning" label="Filling up" />
        <LegendDot className="bg-destructive" label="Fully booked" />
      </div>
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={cn("h-2.5 w-2.5 rounded-full", className)} />
      {label}
    </span>
  );
}
