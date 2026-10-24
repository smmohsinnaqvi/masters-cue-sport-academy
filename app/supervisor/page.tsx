"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CalendarDays,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  CircleDollarSign,
  CreditCard,
  FileText,
  Download,
  LockKeyhole,
  Phone,
  PencilLine,
  Play,
  Plus,
  ReceiptText,
  Search,
  Smartphone,
  Square,
  Table2,
  Target,
  UserRound,
  UsersRound,
  WalletCards,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";

import { RoleGate } from "@/components/auth/role-gate";
import {
  cancelSessionAction,
  closeSessionAction,
  createWalkInSessionAction,
  extendWalkInSessionAction,
  getHistoryRangeSummaryAction,
  getOperationsSnapshotAction,
  getOperationsSummaryAction,
  settleSessionPaymentAction,
  startOnlineBookingAction,
  updateWalkInSessionAction,
} from "@/actions/operations-actions";
import { updateBookingStatusAction } from "@/actions/booking-actions";
import {
  collectPlayerTabPaymentAction,
  createPlayerProfileAction,
  getPlayerDirectoryAction,
  getPlayerStatementAction,
} from "@/actions/player-actions";
import { SiteHeader } from "@/components/layout/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Table } from "@/types/operations";
import { supabase } from "@/lib/supabase";
import { useSessionPages, type SessionPageRow } from "@/hooks/useSessionPages";
import { cn } from "@/lib/utils";
import { Field } from "@/components/ui/field";
import { fieldA11yProps } from "@/components/ui/field-utils";
import { Checkbox } from "@/components/ui/checkbox";
import { DateRangeFilter } from "@/components/supervisor/date-range-filter";
import {
  discountPercentFromBasisPoints,
  discountPercentToBasisPoints,
  discountedSessionCharge,
  playerNamesForTeam,
  sessionCharge,
  sessionDurationMinutes,
  sessionPlayerNames,
  splitSessionCharge,
  type PayerShare,
  type SessionGameFormat,
  type SessionPlayer,
} from "@/lib/session-pricing";
import { WALKIN_EXTEND_INCREMENT_MINUTES } from "@/lib/operations-constants";
import { initialDateRange, type DateRangeSelection } from "@/lib/date-range";
import {
  WALKIN_CUSTOM_DURATION_MAX_MINUTES,
  WALKIN_CUSTOM_DURATION_MINUTES,
  WALKIN_CUSTOM_DURATION_STEP_MINUTES,
  getWalkInAvailableMinutes,
  getWalkInCutoff,
  getWalkInExtensionEnd,
  getWalkInPlannedEnd,
  OPEN_WALKIN_PLANNED_END,
  validateWalkInHold,
  type WalkInHoldMode,
} from "@/lib/walk-in-blocks";

type EntryStatus = "live" | "booked" | "completed" | "cancelled" | "no-show" | "expired";
type TableFilter = "ALL" | "ACTIVE" | "SNOOKER" | "POOL";
type LedgerPaymentFilter = "ALL" | "PAID" | "UNPAID";
type LedgerTableFilter = "ALL" | "SNOOKER" | "POOL";
type Entry = {
  id: string;
  sessionId?: string;
  tableId: string;
  tableName: string;
  tableType: Table["type"];
  status: EntryStatus;
  statusLabel: string;
  playerOne: string;
  playerTwo: string;
  customerPhone: string;
  startDate: string;
  startTime: string;
  endTime: string;
  payment: string;
  amount: number;
  payerName: string;
  paymentMethod: string;
  durationMinutes: number | null;
  source: "ONLINE" | "WALKIN" | "MAINTENANCE";
  players: SessionPlayer[];
  gameFormat: SessionGameFormat | null;
  gameLabel: string | null;
  grossAmount: number | null;
  discountPercent: number;
  discountAmount: number;
  settlementDiscountPercent: number;
  settlementDiscountAmount: number;
  payerShares: PayerShare[];
};
type Booking = {
  id: string;
  tableId: string;
  customerName: string;
  slotStartDate: string;
  slotStart: string;
  slotEnd: string;
  status: "HELD" | "CONFIRMED" | "ONGOING" | "COMPLETED" | "CANCELLED" | "NO_SHOW" | "EXPIRED";
  amount: number;
  paymentStatus: string;
  verified: boolean;
  table?: { shortName: string; type: Table["type"] };
};
type Snapshot = Awaited<ReturnType<typeof getOperationsSnapshotAction>>;
type OperationsSummary = Awaited<ReturnType<typeof getOperationsSummaryAction>>;
type HistoryRangeSummary = Awaited<ReturnType<typeof getHistoryRangeSummaryAction>>;
type PlayerDirectoryFilter = "ALL" | "HAS_DUES" | "OVER_LIMIT";
type PlayerDirectoryEntry = Awaited<ReturnType<typeof getPlayerDirectoryAction>>["players"][number];
type PlayerStatement = Awaited<ReturnType<typeof getPlayerStatementAction>>;
type PlayerProfileForm = {
  fullName: string;
  nickname: string;
  phone: string;
  primaryDiscipline: "SNOOKER" | "POOL" | "BOTH";
  preferredFormat: SessionGameFormat | "NONE";
  skillTier: "NOVICE" | "CLUB_REGULAR" | "STATE_PRO" | "PROFESSIONAL";
  tabEnabled: boolean;
  creditLimit: string;
};

const EMPTY_PLAYER_PROFILE_FORM: PlayerProfileForm = {
  fullName: "",
  nickname: "",
  phone: "",
  primaryDiscipline: "BOTH",
  preferredFormat: "NONE",
  skillTier: "CLUB_REGULAR",
  tabEnabled: true,
  creditLimit: "5000",
};

type WalkInForm = {
  tableId: string;
  gameFormat: SessionGameFormat;
  gameLabel: string;
  players: SessionPlayer[];
  holdMode: WalkInHoldMode;
  durationMinutes: number;
};

const emptyForm: Omit<WalkInForm, "tableId"> = {
  gameFormat: "SINGLES",
  gameLabel: "",
  players: [{ name: "" }, { name: "" }],
  holdMode: "TIMED",
  durationMinutes: 60,
};

function emptyWalkInForm(tableId = ""): WalkInForm {
  return { ...emptyForm, tableId, players: emptyForm.players.map((player) => ({ ...player })) };
}

function playersForFormat(format: SessionGameFormat, current: SessionPlayer[]) {
  const count =
    format === "SINGLES"
      ? 2
      : format === "DOUBLES"
        ? 4
        : format === "SOLO"
          ? 1
          : Math.max(3, current.length);
  return Array.from({ length: count }, (_, index) => ({
    name: current[index]?.name ?? "",
    ...(current[index]?.profileId ? { profileId: current[index].profileId } : {}),
    ...(format === "DOUBLES" ? { team: index < 2 ? ("A" as const) : ("B" as const) } : {}),
  }));
}

function walkInPresetsForFormat(format: SessionGameFormat) {
  return format === "SOLO" ? [30, 60, 90] : [60, 90, 120];
}

function walkInPlayersValid(form: WalkInForm) {
  const expected =
    form.gameFormat === "SINGLES"
      ? 2
      : form.gameFormat === "DOUBLES"
        ? 4
        : form.gameFormat === "SOLO"
          ? 1
          : null;
  if (expected !== null && form.players.length !== expected) return false;
  if (form.gameFormat === "GROUP" && (form.players.length < 3 || form.players.length > 6)) {
    return false;
  }
  const names = form.players.map((player) => player.name.trim().toLocaleLowerCase());
  if (names.some((name) => !name) || new Set(names).size !== names.length) return false;
  return (
    form.gameFormat !== "DOUBLES" ||
    (form.players.filter((player) => player.team === "A").length === 2 &&
      form.players.filter((player) => player.team === "B").length === 2)
  );
}

function WalkInPlayerField({
  index,
  name,
  error,
  onNameChange,
}: {
  index: number;
  name: string;
  error?: string;
  onNameChange: (value: string) => void;
}) {
  const id = `walkin-player-${index}`;
  return (
    <div className="flex items-start gap-2">
      <span className="mt-1 flex h-10 w-9 shrink-0 items-center justify-center rounded-lg bg-felt/10 text-[11px] font-bold text-felt">
        P{index + 1}
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <Input
          id={id}
          autoComplete="off"
          maxLength={120}
          value={name}
          aria-label={`Player ${index + 1} name`}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          placeholder={`Player ${index + 1} name`}
          onChange={(event) => onNameChange(event.target.value)}
        />
        {error ? (
          <p id={`${id}-error`} role="alert" className="px-1 text-xs font-medium text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function time(value: Date | string | null) {
  if (!value) return "";
  return new Date(value).toLocaleTimeString([], {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function date(value: Date | string | null) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function elapsedClock(start: Date | string | null, now: number) {
  if (!start) return "0:00:00";
  const elapsedSeconds = Math.max(0, Math.floor((now - new Date(start).getTime()) / 1000));
  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function playerName(players: unknown, index: number, fallback: string) {
  if (!Array.isArray(players)) return fallback;
  const player = players[index];
  if (!player || typeof player !== "object" || !("name" in player)) return fallback;
  return String(player.name);
}

function gameFormatDescription(format: SessionGameFormat | null) {
  switch (format) {
    case "SINGLES":
      return "Singles · 1 vs 1";
    case "DOUBLES":
      return "Doubles · 2 vs 2";
    case "GROUP":
      return "Group game";
    case "SOLO":
      return "Solo practice";
    default:
      return "";
  }
}

function DiscountToggle({
  id,
  checked,
  onCheckedChange,
  label,
}: {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <div className="flex min-h-11 items-center gap-3 rounded-xl text-left">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        aria-label={label}
        className="h-5 w-5 rounded-md border-border bg-background text-primary shadow-none focus-visible:ring-2 focus-visible:ring-felt focus-visible:ring-offset-2 data-[state=checked]:border-felt data-[state=checked]:bg-felt data-[state=checked]:text-primary-foreground"
      />
      <span className="min-w-0">
        <span className="block text-sm font-semibold leading-tight">{label}</span>
        <span className="mt-0.5 block text-[11px] text-muted-foreground">Optional</span>
      </span>
    </div>
  );
}

function sessionPlayers(value: unknown, fallbackName?: string | null): SessionPlayer[] {
  if (Array.isArray(value)) {
    return value.flatMap((player) => {
      if (!player || typeof player !== "object" || !("name" in player)) return [];
      const name = player.name;
      if (typeof name !== "string" || !name.trim()) return [];
      const team =
        "team" in player && (player.team === "A" || player.team === "B") ? player.team : undefined;
      return [{ name: name.trim(), ...(team ? { team } : {}) }];
    });
  }
  return fallbackName?.trim() ? [{ name: fallbackName.trim() }] : [];
}

function payerSharesFromUnknown(value: unknown): PayerShare[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((share) => {
    if (!share || typeof share !== "object" || !("name" in share) || !("amount" in share)) {
      return [];
    }
    const { name, amount } = share;
    return typeof name === "string" && Number.isSafeInteger(amount) && amount >= 0
      ? [{ name, amount }]
      : [];
  });
}

function entryFromPage(session: SessionPageRow): Entry {
  const participants = sessionPlayers(session.players, session.customerName);
  return {
    id: session.id,
    sessionId: session.id,
    tableId: session.tableId,
    tableName: session.table.name,
    tableType: session.table.type,
    status:
      session.status === "ONGOING"
        ? "live"
        : session.status === "CONFIRMED" || session.status === "HELD"
          ? "booked"
          : session.status === "NO_SHOW"
            ? "no-show"
            : session.status === "CANCELLED"
              ? "cancelled"
              : session.status === "EXPIRED"
                ? "expired"
                : "completed",
    statusLabel:
      session.source === "MAINTENANCE" && session.status !== "CANCELLED"
        ? "Maintenance"
        : session.status === "HELD"
          ? "Held"
          : session.status === "CONFIRMED"
            ? "Booked"
            : session.status === "ONGOING"
              ? "In use"
              : session.status === "COMPLETED"
                ? "Completed"
                : session.status === "CANCELLED"
                  ? "Cancelled"
                  : session.status === "NO_SHOW"
                    ? "No-show"
                    : "Expired",
    playerOne: participants[0]?.name ?? "Guest",
    playerTwo:
      session.source === "WALKIN" ? (participants[1]?.name ?? "") : (session.customerPhone ?? ""),
    customerPhone: session.customerPhone ?? "",
    startDate: date(session.startTime),
    startTime: time(session.actualStart ?? session.startTime),
    endTime: time(session.actualEnd ?? session.plannedEnd),
    payment: session.paymentStatus,
    paymentMethod: session.paymentMethod ?? "",
    payerName: session.payerName ?? "",
    amount: session.outstandingAmount ?? session.amount ?? 0,
    durationMinutes: session.durationMinutes,
    source: session.source,
    players: participants,
    gameFormat: session.gameFormat,
    gameLabel: session.gameLabel,
    grossAmount: session.grossAmount,
    discountPercent: session.discountPercent,
    discountAmount: session.discountAmount,
    settlementDiscountPercent: session.settlementDiscountPercent,
    settlementDiscountAmount: session.settlementDiscountAmount,
    payerShares: payerSharesFromUnknown(session.payerShares),
  };
}

function bookingFromPage(session: SessionPageRow): Booking {
  return {
    id: session.id,
    tableId: session.tableId,
    customerName: session.customerName ?? "Guest",
    slotStartDate: date(session.startTime),
    slotStart: session.startTime,
    slotEnd: session.plannedEnd,
    status: session.status,
    verified: session.status === "CONFIRMED",
    amount: session.amount ?? 0,
    paymentStatus: session.paymentStatus,
    table: { shortName: session.table.name, type: session.table.type },
  };
}

export default function SupervisorPage() {
  const [snapshot, setSnapshot] = useState<Snapshot>([]);
  const [summary, setSummary] = useState<OperationsSummary>({
    unpaidAmount: 0,
    unpaidCount: 0,
    nextHourBookings: 0,
  });
  const [historySummary, setHistorySummary] = useState<HistoryRangeSummary | null>(null);
  const [historySummaryLoading, setHistorySummaryLoading] = useState(true);
  const [historySummaryError, setHistorySummaryError] = useState<string | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeHistory, setActiveHistory] = useState<
    "tables" | "unpaid" | "ledger" | "bookings" | "players"
  >("tables");
  const [tableFilter, setTableFilter] = useState<TableFilter>("ALL");
  const [expandedBookings, setExpandedBookings] = useState<Record<string, boolean>>({});
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [playerSearch, setPlayerSearch] = useState("");
  const [playerFilter, setPlayerFilter] = useState<PlayerDirectoryFilter>("ALL");
  const [playerDirectory, setPlayerDirectory] = useState<{
    players: PlayerDirectoryEntry[];
    summary: { playerCount: number; playersWithDues: number; totalOutstanding: number };
  }>({
    players: [],
    summary: { playerCount: 0, playersWithDues: 0, totalOutstanding: 0 },
  });
  const [playersLoading, setPlayersLoading] = useState(false);
  const [playersError, setPlayersError] = useState<string | null>(null);
  const [showPlayerForm, setShowPlayerForm] = useState(false);
  const [playerForm, setPlayerForm] = useState<PlayerProfileForm>(EMPTY_PLAYER_PROFILE_FORM);
  const [isCreatingPlayer, setIsCreatingPlayer] = useState(false);
  const [playerFormError, setPlayerFormError] = useState<string | null>(null);
  const [registerForPlayerIndex, setRegisterForPlayerIndex] = useState<number | null>(null);
  const [playerPickerIndex, setPlayerPickerIndex] = useState<number | null>(null);
  const [playerPickerSearch, setPlayerPickerSearch] = useState("");
  const [playerPickerResults, setPlayerPickerResults] = useState<PlayerDirectoryEntry[]>([]);
  const [playerPickerLoading, setPlayerPickerLoading] = useState(false);
  const [playerPickerError, setPlayerPickerError] = useState<string | null>(null);
  const [statement, setStatement] = useState<PlayerStatement | null>(null);
  const [statementOpen, setStatementOpen] = useState(false);
  const [statementLoading, setStatementLoading] = useState(false);
  const [statementError, setStatementError] = useState<string | null>(null);
  const [collectingPlayerId, setCollectingPlayerId] = useState<string | null>(null);
  const [playerPaymentAmount, setPlayerPaymentAmount] = useState("");
  const [playerPaymentMethod, setPlayerPaymentMethod] = useState<"CASH" | "UPI" | "CARD">("CASH");
  const [playerPaymentError, setPlayerPaymentError] = useState<string | null>(null);
  const [unpaidDateRangeEnabled, setUnpaidDateRangeEnabled] = useState(false);
  const [unpaidDateRange, setUnpaidDateRange] = useState<DateRangeSelection>(() =>
    initialDateRange(),
  );
  const [pendingTableId, setPendingTableId] = useState<string | null>(null);
  const [ledgerDateRange, setLedgerDateRange] = useState<DateRangeSelection>(() =>
    initialDateRange(),
  );
  const [bookingsDateRange, setBookingsDateRange] = useState<DateRangeSelection>(() =>
    initialDateRange(),
  );
  const [ledgerPaymentFilter, setLedgerPaymentFilter] = useState<LedgerPaymentFilter>("ALL");
  const [ledgerTableFilter, setLedgerTableFilter] = useState<LedgerTableFilter>("ALL");
  const ledgerPage = useSessionPages("ledger", refreshKey, {
    search: ledgerSearch,
    paymentStatus: ledgerPaymentFilter,
    tableType: ledgerTableFilter,
    dateFrom: ledgerDateRange.from,
    dateTo: ledgerDateRange.to,
  });
  const bookingsPage = useSessionPages("bookings", refreshKey, {
    dateFrom: bookingsDateRange.from,
    dateTo: bookingsDateRange.to,
  });
  const duesPage = useSessionPages("dues", refreshKey, {
    dateFrom: unpaidDateRangeEnabled ? unpaidDateRange.from : "",
    dateTo: unpaidDateRangeEnabled ? unpaidDateRange.to : "",
  });
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [form, setForm] = useState<WalkInForm>(() => emptyWalkInForm());
  const [customDurationText, setCustomDurationText] = useState("60");
  const [walkInValidation, setWalkInValidation] = useState<{
    players: Record<number, string>;
    message: string | null;
  }>({ players: {}, message: null });
  const [endSession, setEndSession] = useState<{
    sessionId: string;
    playerNames: string[];
    players: SessionPlayer[];
    gameFormat: SessionGameFormat | null;
    payerNames: string[];
    payerTeam: "A" | "B" | null;
    applyDiscount: boolean;
    discountPercent: string;
    paymentMethod: "CASH" | "UPI" | "CARD" | null;
  } | null>(null);
  const [paymentEntry, setPaymentEntry] = useState<{
    sessionId: string;
    payerName: string;
    paymentMethod: "CASH" | "UPI" | "CARD";
    applyDiscount: boolean;
    discountPercent: string;
  } | null>(null);
  const [confirm, setConfirm] = useState<{
    title: string;
    description: string;
    action: () => Promise<void>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isEndingSession, setIsEndingSession] = useState(false);
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [isSavingWalkIn, setIsSavingWalkIn] = useState(false);
  const [startingBookingId, setStartingBookingId] = useState<string | null>(null);
  const [extendingSessionId, setExtendingSessionId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [next, nextSummary] = await Promise.all([
      getOperationsSnapshotAction(),
      getOperationsSummaryAction(),
    ]);
    setSnapshot(next);
    setSummary(nextSummary);
    setRefreshKey((value) => value + 1);
  }, []);

  async function refreshAfterMutation() {
    try {
      await refresh();
    } catch (reason) {
      const details = reason instanceof Error ? ` ${reason.message}` : "";
      setError(`The change was saved, but supervisor data could not refresh.${details}`);
    }
  }

  async function savePlayerProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isCreatingPlayer) return;
    const creditLimit = Number(playerForm.creditLimit);
    if (!Number.isSafeInteger(creditLimit) || creditLimit < 0) {
      setPlayerFormError("Enter a valid whole-rupee credit limit.");
      return;
    }

    setIsCreatingPlayer(true);
    setPlayerFormError(null);
    try {
      const created = await createPlayerProfileAction({
        fullName: playerForm.fullName,
        nickname: playerForm.nickname,
        phone: playerForm.phone,
        primaryDiscipline: playerForm.primaryDiscipline,
        preferredFormat: playerForm.preferredFormat === "NONE" ? null : playerForm.preferredFormat,
        skillTier: playerForm.skillTier,
        tabEnabled: playerForm.tabEnabled,
        creditLimit,
      });
      if (registerForPlayerIndex !== null) {
        setForm((current) => ({
          ...current,
          players: current.players.map((player, index) =>
            index === registerForPlayerIndex
              ? { ...player, name: created.fullName, profileId: created.id }
              : player,
          ),
        }));
        setRegisterForPlayerIndex(null);
      }
      setPlayerForm(EMPTY_PLAYER_PROFILE_FORM);
      setShowPlayerForm(false);
      setPlayerSearch("");
      setPlayerFilter("ALL");
      setPlayersError(null);
      setRefreshKey((value) => value + 1);
      if (playerPickerIndex !== null) {
        setPlayerPickerIndex(null);
        setPlayerPickerSearch("");
      }
    } catch (reason) {
      setPlayerFormError(
        reason instanceof Error ? reason.message : "Unable to create player profile.",
      );
    } finally {
      setIsCreatingPlayer(false);
    }
  }

  async function openPlayerPicker(index: number) {
    setPlayerPickerIndex(index);
    setPlayerPickerSearch("");
    setPlayerPickerResults([]);
    setPlayerPickerLoading(true);
    setPlayerPickerError(null);
  }

  async function openPlayerStatement(playerId: string) {
    setStatement(null);
    setStatementOpen(true);
    setStatementError(null);
    setStatementLoading(true);
    try {
      setStatement(await getPlayerStatementAction(playerId));
    } catch (reason) {
      setStatementError(
        reason instanceof Error ? reason.message : "Unable to load player account.",
      );
    } finally {
      setStatementLoading(false);
    }
  }

  async function collectPlayerPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!statement || collectingPlayerId) return;
    const amount = Number(playerPaymentAmount);
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      setPlayerPaymentError("Enter a positive whole-rupee amount.");
      return;
    }
    setCollectingPlayerId(statement.profile.id);
    setPlayerPaymentError(null);
    try {
      await collectPlayerTabPaymentAction({
        playerId: statement.profile.id,
        amount,
        paymentMethod: playerPaymentMethod,
      });
      setPlayerPaymentAmount("");
      setStatement(await getPlayerStatementAction(statement.profile.id));
      setPlayerDirectory((current) => ({
        ...current,
        players: current.players.map((player) =>
          player.id === statement.profile.id
            ? {
                ...player,
                outstandingAmount: Math.max(0, player.outstandingAmount - amount),
              }
            : player,
        ),
      }));
      setRefreshKey((value) => value + 1);
    } catch (reason) {
      setPlayerPaymentError(reason instanceof Error ? reason.message : "Unable to record payment.");
    } finally {
      setCollectingPlayerId(null);
    }
  }

  useEffect(() => {
    void refresh()
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : "Unable to load operations"),
      )
      .finally(() => setSnapshotLoading(false));
    const channel = supabase
      .channel("operations-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sessions" },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tables" },
        () => void refresh(),
      )
      .subscribe();
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 1_000);
    return () => {
      window.clearInterval(timer);
      void channel.unsubscribe();
    };
  }, [refresh]);

  useEffect(() => {
    if (activeHistory !== "ledger" && activeHistory !== "bookings") return;
    let isCurrent = true;
    setHistorySummary(null);
    setHistorySummaryError(null);
    setHistorySummaryLoading(true);
    void getHistoryRangeSummaryAction({
      ledgerFrom: ledgerDateRange.from,
      ledgerTo: ledgerDateRange.to,
      bookingsFrom: bookingsDateRange.from,
      bookingsTo: bookingsDateRange.to,
    })
      .then((nextSummary) => {
        if (isCurrent) setHistorySummary(nextSummary);
      })
      .catch((reason) => {
        if (isCurrent) {
          setHistorySummaryError(
            reason instanceof Error ? reason.message : "Unable to load history summaries",
          );
        }
      })
      .finally(() => {
        if (isCurrent) setHistorySummaryLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, [
    activeHistory,
    bookingsDateRange.from,
    bookingsDateRange.to,
    ledgerDateRange.from,
    ledgerDateRange.to,
    refreshKey,
  ]);

  useEffect(() => {
    if (activeHistory !== "players") return;
    let isCurrent = true;
    setPlayersLoading(true);
    setPlayersError(null);
    void getPlayerDirectoryAction({
      search: playerSearch,
      filter: playerFilter,
    })
      .then((result) => {
        if (!isCurrent) return;
        setPlayerDirectory({
          players: result.players,
          summary: result.summary,
        });
      })
      .catch((reason) => {
        if (!isCurrent) return;
        setPlayersError(
          reason instanceof Error ? reason.message : "Unable to load player directory",
        );
      })
      .finally(() => {
        if (isCurrent) setPlayersLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, [activeHistory, playerFilter, playerSearch, refreshKey]);

  useEffect(() => {
    if (playerPickerIndex === null) return;
    let isCurrent = true;
    const timeout = window.setTimeout(
      () => {
        setPlayerPickerLoading(true);
        setPlayerPickerError(null);
        void getPlayerDirectoryAction({ search: playerPickerSearch, filter: "ALL" })
          .then((result) => {
            if (isCurrent) setPlayerPickerResults(result.players);
          })
          .catch((reason) => {
            if (!isCurrent) return;
            setPlayerPickerResults([]);
            setPlayerPickerError(
              reason instanceof Error ? reason.message : "Unable to load registered players.",
            );
          })
          .finally(() => {
            if (isCurrent) setPlayerPickerLoading(false);
          });
      },
      playerPickerSearch ? 180 : 0,
    );
    return () => {
      isCurrent = false;
      window.clearTimeout(timeout);
    };
  }, [playerPickerIndex, playerPickerSearch]);

  const tables = useMemo(() => snapshot, [snapshot]);
  const activeTableCount = tables.filter((table) =>
    table.sessions.some(
      (session) => session.status === "ONGOING" && session.source !== "MAINTENANCE",
    ),
  ).length;
  const filteredTables = tables.filter((table) => {
    if (tableFilter === "ACTIVE") {
      return table.sessions.some(
        (session) => session.status === "ONGOING" && session.source !== "MAINTENANCE",
      );
    }
    return tableFilter === "ALL" || table.type === tableFilter;
  });
  const entries = ledgerPage.items.map(entryFromPage);
  const bookings = bookingsPage.items.map(bookingFromPage);
  const dues = duesPage.items.map(entryFromPage);
  const activeSessions = tables.flatMap((table) => table.sessions);
  const liveCount = activeSessions.filter(
    (session) => session.status === "ONGOING" && session.source !== "MAINTENANCE",
  ).length;
  const closingSession = endSession
    ? activeSessions.find((session) => session.id === endSession.sessionId)
    : null;
  const closingTable = closingSession
    ? tables.find((table) => table.id === closingSession.tableId)
    : null;
  const closingStartedAt = closingSession?.actualStart ?? closingSession?.startTime;
  const closingMinutes = closingStartedAt
    ? sessionDurationMinutes(closingStartedAt, new Date(currentTime))
    : 0;
  const closingRate = closingSession?.rateSnapshot ?? closingTable?.hourlyRate ?? 0;
  const closingGrossAmount = sessionCharge(closingRate, closingMinutes);
  const closingDiscountBasisPoints = endSession
    ? (() => {
        if (!endSession.applyDiscount) return 0;
        try {
          return discountPercentToBasisPoints(endSession.discountPercent);
        } catch {
          return null;
        }
      })()
    : 0;
  const closingDiscountError =
    endSession && closingDiscountBasisPoints === null
      ? "Enter a discount from 0 to 100 with up to 2 decimal places."
      : undefined;
  const closingAmount =
    closingDiscountBasisPoints === null
      ? closingGrossAmount
      : discountedSessionCharge(
          closingGrossAmount,
          discountPercentFromBasisPoints(closingDiscountBasisPoints),
        );
  const closingDiscountAmount = closingGrossAmount - closingAmount;
  const closingPayerShares = endSession?.payerNames.length
    ? splitSessionCharge(closingAmount, endSession.payerNames)
    : [];
  const walkInTable = tables.find((table) => table.id === form.tableId);
  const walkInNow = new Date(currentTime);
  const walkInNextBooking = walkInTable?.sessions
    .filter(
      (session) =>
        session.source === "ONLINE" &&
        (session.status === "HELD" || session.status === "CONFIRMED") &&
        session.startTime.getTime() > currentTime,
    )
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())[0];
  const walkInCutoff = getWalkInCutoff(walkInNextBooking?.startTime ?? null);
  const walkInPlannedEnd = getWalkInPlannedEnd(
    walkInNow,
    form.durationMinutes,
    walkInCutoff,
    form.holdMode === "OPEN",
  );
  const walkInAvailableMinutes = getWalkInAvailableMinutes(walkInNow, walkInCutoff);
  const walkInEstimateMinutes =
    form.holdMode === "OPEN"
      ? walkInCutoff
        ? walkInAvailableMinutes
        : 0
      : getWalkInAvailableMinutes(walkInNow, walkInPlannedEnd);
  const walkInDurationPresets = walkInPresetsForFormat(form.gameFormat);
  const walkInCanStart =
    form.holdMode === "OPEN"
      ? walkInAvailableMinutes > 0
      : walkInAvailableMinutes >= WALKIN_CUSTOM_DURATION_MINUTES;
  const walkInHoldError =
    form.holdMode === "CUSTOM"
      ? Number.isInteger(form.durationMinutes) &&
        form.durationMinutes >= WALKIN_CUSTOM_DURATION_MINUTES &&
        form.durationMinutes <= WALKIN_CUSTOM_DURATION_MAX_MINUTES &&
        form.durationMinutes % WALKIN_CUSTOM_DURATION_STEP_MINUTES === 0
        ? undefined
        : "Enter a duration from 30 minutes to 24 hours in 30-minute steps."
      : undefined;
  const paymentEntryDetails = paymentEntry
    ? (dues.find((entry) => entry.id === paymentEntry.sessionId) ??
      entries.find((entry) => entry.id === paymentEntry.sessionId) ??
      bookings.find((booking) => booking.id === paymentEntry.sessionId))
    : null;
  const paymentEntryCloseoutDiscount =
    paymentEntryDetails && "discountPercent" in paymentEntryDetails
      ? paymentEntryDetails.discountPercent
      : 0;
  const existingCloseoutDiscount = paymentEntryCloseoutDiscount > 0;
  const settlementDiscountAllowed = !existingCloseoutDiscount;
  const settlementDiscountBasisPoints = paymentEntry
    ? (() => {
        if (!paymentEntry.applyDiscount) return 0;
        try {
          return discountPercentToBasisPoints(paymentEntry.discountPercent);
        } catch {
          return null;
        }
      })()
    : 0;
  const settlementDiscountError =
    paymentEntry && settlementDiscountBasisPoints === null
      ? "Enter a discount from 0 to 100 with up to 2 decimal places."
      : undefined;
  const settlementGrossAmount = paymentEntryDetails?.amount ?? 0;
  const settlementNetAmount =
    settlementDiscountBasisPoints === null
      ? settlementGrossAmount
      : discountedSessionCharge(
          settlementGrossAmount,
          discountPercentFromBasisPoints(settlementDiscountBasisPoints),
        );
  const settlementDiscountAmount = settlementGrossAmount - settlementNetAmount;

  function openCreate(tableId: string) {
    setEditing(null);
    setForm(emptyWalkInForm(tableId));
    setCustomDurationText("60");
    setWalkInValidation({ players: {}, message: null });
    setError(null);
    setShowForm(true);
  }

  function openEdit(entry: Entry) {
    setEditing(entry);
    setForm({
      tableId: entry.tableId,
      gameFormat: entry.gameFormat ?? "SINGLES",
      gameLabel: entry.gameLabel ?? "",
      players: playersForFormat(entry.gameFormat ?? "SINGLES", entry.players),
      holdMode: "TIMED",
      durationMinutes: 60,
    });
    setCustomDurationText("60");
    setWalkInValidation({ players: {}, message: null });
    setError(null);
    setShowForm(true);
  }

  async function saveForm() {
    if (isSavingWalkIn) return;
    if (!editing) {
      try {
        validateWalkInHold(form.holdMode, form.durationMinutes);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Choose a valid hold duration.");
        return;
      }
      if (!walkInCanStart) {
        setError(
          form.holdMode === "OPEN"
            ? "The next booking is starting now; this table cannot be held."
            : "There is not enough time for this hold before the next booking.",
        );
        return;
      }
    }
    if (!editing && !walkInPlayersValid(form)) {
      const names = form.players.map((player) => player.name.trim().toLocaleLowerCase());
      const players: Record<number, string> = {};
      names.forEach((name, index) => {
        if (!name) players[index] = "Enter a player name.";
        else if (names.indexOf(name) !== index) players[index] = "Player names must be different.";
      });
      setWalkInValidation({
        players,
        message:
          Object.keys(players).length > 0
            ? "Check the player names below."
            : form.gameFormat === "DOUBLES"
              ? "Assign exactly two players to each team."
              : form.gameFormat === "GROUP"
                ? "A group game needs 3 to 6 different players."
                : form.gameFormat === "SOLO"
                  ? "Enter the solo practice player's name."
                  : "Enter two different player names.",
      });
      return;
    }
    setWalkInValidation({ players: {}, message: null });
    setIsSavingWalkIn(true);
    if (!editing) setPendingTableId(form.tableId);
    try {
      if (editing?.sessionId) {
        await updateWalkInSessionAction({
          sessionId: editing.sessionId,
          gameFormat: form.gameFormat,
          gameLabel: form.gameLabel,
          players: form.players,
        });
      } else {
        await createWalkInSessionAction({
          tableId: form.tableId,
          gameFormat: form.gameFormat,
          gameLabel: form.gameLabel,
          players: form.players,
          holdMode: form.holdMode,
          durationMinutes: form.durationMinutes,
        });
      }
      setShowForm(false);
      setError(null);
      await refreshAfterMutation();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save session");
    } finally {
      setIsSavingWalkIn(false);
      if (!editing) setPendingTableId(null);
    }
  }

  function ask(title: string, description: string, action: () => Promise<void>) {
    setConfirm({ title, description, action });
  }

  function openCloseout(
    session: Pick<
      Snapshot[number]["sessions"][number],
      "id" | "players" | "customerName" | "gameFormat"
    >,
  ) {
    const playerNames = sessionPlayerNames(session.players, session.customerName ?? "Guest");
    const players = sessionPlayers(session.players, session.customerName);
    const gameFormat = session.gameFormat ?? null;
    setEndSession({
      sessionId: session.id,
      playerNames,
      players,
      gameFormat,
      payerNames: gameFormat === "DOUBLES" ? [] : playerNames.slice(0, 1),
      payerTeam: null,
      applyDiscount: false,
      discountPercent: "0",
      paymentMethod: null,
    });
  }

  function openEntryCloseout(entry: Entry) {
    const playerNames = sessionPlayerNames(entry.players, entry.playerOne);
    setEndSession({
      sessionId: entry.sessionId!,
      playerNames,
      players: entry.players,
      gameFormat: entry.gameFormat,
      payerNames: entry.gameFormat === "DOUBLES" ? [] : playerNames.slice(0, 1),
      payerTeam: null,
      applyDiscount: false,
      discountPercent: "0",
      paymentMethod: null,
    });
  }

  function selectPayerTeam(team: "A" | "B") {
    setEndSession((current) =>
      current
        ? {
            ...current,
            payerTeam: team,
            payerNames: playerNamesForTeam(current.players, team),
          }
        : current,
    );
  }

  async function runConfirmed() {
    if (!confirm || isConfirming) return;
    setIsConfirming(true);
    setError(null);
    try {
      await confirm.action();
      setConfirm(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Operation failed");
      setConfirm(null);
    } finally {
      setIsConfirming(false);
    }
  }

  async function closeCurrentSession() {
    if (!endSession || isEndingSession) return;
    setIsEndingSession(true);
    const closingTableId = snapshot.find((table) =>
      table.sessions.some((session) => session.id === endSession.sessionId),
    )?.id;
    setPendingTableId(closingTableId ?? null);
    try {
      await closeSessionAction({
        sessionId: endSession.sessionId,
        payerNames: endSession.payerNames,
        discountPercent: endSession.applyDiscount ? endSession.discountPercent : "0",
        paymentMethod: endSession.paymentMethod,
      });
      setEndSession(null);
      setError(null);
      await refreshAfterMutation();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to close session");
    } finally {
      setIsEndingSession(false);
      setPendingTableId(null);
    }
  }

  async function extendSession(sessionId: string) {
    if (extendingSessionId) return;
    setExtendingSessionId(sessionId);
    try {
      await extendWalkInSessionAction(sessionId);
      setError(null);
      await refreshAfterMutation();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to extend the table block");
    } finally {
      setExtendingSessionId(null);
    }
  }

  async function startBooking(bookingId: string) {
    if (startingBookingId) return;
    setStartingBookingId(bookingId);
    setPendingTableId(bookings.find((booking) => booking.id === bookingId)?.tableId ?? null);
    try {
      await startOnlineBookingAction(bookingId);
      setError(null);
      await refreshAfterMutation();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to start this booking");
    } finally {
      setStartingBookingId(null);
      setPendingTableId(null);
    }
  }

  async function recordCurrentPayment() {
    if (!paymentEntry || isRecordingPayment) return;
    setIsRecordingPayment(true);
    try {
      await settleSessionPaymentAction({
        ...paymentEntry,
        discountPercent: paymentEntry.applyDiscount ? paymentEntry.discountPercent : "0",
      });
      setPaymentEntry(null);
      setError(null);
      await refreshAfterMutation();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to record payment");
    } finally {
      setIsRecordingPayment(false);
    }
  }

  function changePlayerName(index: number, name: string) {
    setForm((current) => ({
      ...current,
      players: current.players.map((player, playerIndex) =>
        playerIndex === index ? { ...player, name, profileId: undefined } : player,
      ),
    }));
    setWalkInValidation({ players: {}, message: null });
  }

  function selectPlayerProfile(index: number, profile: PlayerDirectoryEntry) {
    setForm((current) => ({
      ...current,
      players: current.players.map((player, playerIndex) =>
        playerIndex === index
          ? { ...player, name: profile.fullName, profileId: profile.id }
          : player,
      ),
    }));
    setWalkInValidation({ players: {}, message: null });
    setPlayerPickerIndex(null);
    setPlayerPickerSearch("");
  }

  function playerField(index: number) {
    const player = form.players[index];
    if (!player) return null;
    return (
      <div key={`walkin-player-${index}`} className="space-y-1">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <WalkInPlayerField
              index={index}
              name={player.name}
              error={walkInValidation.players[index]}
              onNameChange={(name) => changePlayerName(index, name)}
            />
          </div>
          {!editing && player.profileId ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-10 shrink-0 px-2.5 text-xs"
              onClick={() =>
                setForm((current) => ({
                  ...current,
                  players: current.players.map((item, playerIndex) =>
                    playerIndex === index ? { ...item, profileId: undefined } : item,
                  ),
                }))
              }
            >
              Guest
            </Button>
          ) : !editing ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-10 shrink-0 gap-1.5 px-2.5 text-xs"
              onClick={() => void openPlayerPicker(index)}
            >
              <UsersRound className="h-3.5 w-3.5" aria-hidden="true" />
              Regular
            </Button>
          ) : null}
        </div>
        <p
          className={cn(
            "pl-11 text-[11px]",
            player.profileId ? "font-medium text-felt" : "text-muted-foreground",
          )}
        >
          {player.profileId
            ? "Registered account selected"
            : "Guest name · not linked to an account"}
        </p>
      </div>
    );
  }

  return (
    <RoleGate role="supervisor">
      <>
        <SiteHeader />
        <main className="mx-auto max-w-7xl px-3 pt-3 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:px-6 sm:pt-6 lg:px-8 lg:pb-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-felt">
                Supervisor
              </p>
              <h1 className="mt-0.5 text-xl font-bold sm:text-2xl">
                {activeHistory === "tables"
                  ? "Tables"
                  : activeHistory === "unpaid"
                    ? "Unpaid"
                    : activeHistory === "ledger"
                      ? "Ledger"
                      : activeHistory === "bookings"
                        ? "Bookings"
                        : "Players"}
              </h1>
            </div>
          </div>
          {error ? (
            <div
              role="alert"
              className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
            >
              {error}
            </div>
          ) : null}
          {activeHistory === "tables" ? (
            <div className="mt-3 grid grid-cols-3 gap-2" aria-busy={snapshotLoading}>
              {snapshotLoading ? (
                Array.from({ length: 3 }, (_, index) => (
                  <Skeleton key={index} className="h-[4.5rem] rounded-xl" />
                ))
              ) : (
                <>
                  <Metric
                    icon={Table2}
                    label="Tables in play"
                    value={`${liveCount} / ${snapshot.length}`}
                  />
                  <Metric
                    icon={Check}
                    label="Payments due"
                    value={money(summary.unpaidAmount)}
                    detail={`${summary.unpaidCount} sessions`}
                  />
                  <Metric
                    icon={CalendarClock}
                    label="Next hour bookings"
                    value={String(summary.nextHourBookings)}
                  />
                </>
              )}
            </div>
          ) : null}

          <Dialog
            open={showForm}
            onOpenChange={(open) => {
              if (!open && !isSavingWalkIn) setShowForm(false);
            }}
          >
            <DialogContent className="max-h-[92dvh] w-[calc(100%-1rem)] max-w-md overflow-y-auto rounded-3xl border-border/80 bg-background p-4 shadow-2xl sm:p-5">
              <DialogHeader className="space-y-3 pr-7 text-left">
                {!editing && walkInTable ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="gap-1.5 rounded-full border border-felt/30 bg-felt/10 text-felt">
                      <span className="h-1.5 w-1.5 rounded-full bg-felt" />
                      {walkInTable.name}
                    </Badge>
                    <Badge variant="outline" className="rounded-full text-muted-foreground">
                      {walkInTable.type === "SNOOKER" ? "Snooker" : "Pool"}
                    </Badge>
                    <Badge variant="outline" className="rounded-full text-muted-foreground">
                      {money(walkInTable.hourlyRate)}/hr
                    </Badge>
                  </div>
                ) : null}
                <DialogTitle>{editing ? "Update players" : "Start walk-in"}</DialogTitle>
                <DialogDescription>
                  {editing
                    ? "Update the names on this active table."
                    : "Choose a game format and hold duration. Billing is based on actual minutes played."}
                </DialogDescription>
              </DialogHeader>
              <form
                noValidate
                onSubmit={(event) => {
                  event.preventDefault();
                  void saveForm();
                }}
                className="space-y-5 pt-1"
              >
                <div className="space-y-2">
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Game format
                  </Label>
                  <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="Game format">
                    {[
                      {
                        value: "SINGLES" as const,
                        label: "Singles",
                        detail: "1 vs 1",
                        Icon: UserRound,
                      },
                      {
                        value: "DOUBLES" as const,
                        label: "Doubles",
                        detail: "2 vs 2",
                        Icon: UsersRound,
                      },
                      {
                        value: "GROUP" as const,
                        label: "Group",
                        detail: "3–6 players",
                        Icon: UsersRound,
                      },
                      {
                        value: "SOLO" as const,
                        label: "Solo",
                        detail: "Practice",
                        Icon: Target,
                      },
                    ].map(({ value, label, detail, Icon }) => (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={form.gameFormat === value}
                        onClick={() => {
                          setForm({
                            ...form,
                            gameFormat: value,
                            gameLabel: "",
                            players: playersForFormat(value, form.players),
                            durationMinutes:
                              form.holdMode === "TIMED" &&
                              !walkInPresetsForFormat(value).includes(form.durationMinutes)
                                ? 60
                                : form.durationMinutes,
                          });
                          setWalkInValidation({ players: {}, message: null });
                        }}
                        className={cn(
                          "flex min-h-[4.25rem] flex-col items-center justify-center gap-1 rounded-xl border px-1 py-2 text-[11px] transition-colors",
                          form.gameFormat === value
                            ? "border-felt/70 bg-felt/15 text-felt shadow-[inset_0_0_0_1px_var(--color-felt)]"
                            : "border-border bg-surface/70 text-muted-foreground hover:bg-surface-strong",
                        )}
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                        <span className="font-semibold">{label}</span>
                        <span className="text-[10px] opacity-80">{detail}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <section className="space-y-3 rounded-2xl border border-border/80 bg-surface/55 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <Label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        {form.gameFormat === "SOLO" ? "Solo player" : "Players"}
                      </Label>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Enter guest names or select a regular player account.
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {form.gameFormat === "SINGLES"
                          ? "1 vs 1"
                          : form.gameFormat === "DOUBLES"
                            ? "Two players on each team"
                            : form.gameFormat === "GROUP"
                              ? `${form.players.length} of 6 players`
                              : "Practice session"}
                      </p>
                    </div>
                    {form.gameFormat === "GROUP" && form.players.length < 6 ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="min-h-9 gap-1 rounded-xl px-3"
                        onClick={() => {
                          setForm({ ...form, players: [...form.players, { name: "" }] });
                          setWalkInValidation({ players: {}, message: null });
                        }}
                      >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        Add player
                      </Button>
                    ) : null}
                  </div>
                  {form.gameFormat === "SINGLES" ? (
                    <div className="space-y-2">
                      {playerField(0)}
                      <div className="flex items-center justify-center">
                        <span className="rounded-full border border-border bg-background px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          vs
                        </span>
                      </div>
                      {playerField(1)}
                    </div>
                  ) : null}
                  {form.gameFormat === "DOUBLES" ? (
                    <div className="space-y-2.5">
                      <div className="space-y-2 rounded-xl border border-border/70 bg-background/65 p-2.5">
                        <div className="flex items-center justify-between">
                          <Badge className="rounded-full bg-felt/10 text-felt">Team A</Badge>
                          <span className="text-[10px] text-muted-foreground">Opening team</span>
                        </div>
                        {playerField(0)}
                        {playerField(1)}
                      </div>
                      <div className="flex items-center justify-center">
                        <span className="rounded-full border border-border bg-background px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-felt">
                          vs
                        </span>
                      </div>
                      <div className="space-y-2 rounded-xl border border-border/70 bg-background/65 p-2.5">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="rounded-full">
                            Team B
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">Challengers</span>
                        </div>
                        {playerField(2)}
                        {playerField(3)}
                      </div>
                    </div>
                  ) : null}
                  {form.gameFormat === "GROUP" ? (
                    <>
                      <div className="flex flex-wrap gap-1.5">
                        {["Killer", "Century", "Cutthroat", "9-Ball Ring"].map((label) => (
                          <button
                            key={label}
                            type="button"
                            aria-pressed={form.gameLabel === label}
                            onClick={() => setForm({ ...form, gameLabel: label })}
                            className={cn(
                              "min-h-8 rounded-full border px-3 text-xs font-medium",
                              form.gameLabel === label
                                ? "border-felt/50 bg-felt/10 text-felt"
                                : "border-border bg-background/70 text-muted-foreground",
                            )}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      <div className="space-y-2">
                        {form.players.map((player, index) => (
                          <div key={`walkin-player-${index}`} className="flex items-start gap-2">
                            <div className="min-w-0 flex-1">{playerField(index)}</div>
                            {form.players.length > 3 ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="mt-1 h-10 w-10 shrink-0"
                                aria-label={`Remove player ${index + 1}`}
                                onClick={() => {
                                  setForm({
                                    ...form,
                                    players: form.players.filter(
                                      (_, playerIndex) => playerIndex !== index,
                                    ),
                                  });
                                  setWalkInValidation({ players: {}, message: null });
                                }}
                              >
                                <X className="h-4 w-4" aria-hidden="true" />
                              </Button>
                            ) : null}
                          </div>
                        ))}
                      </div>
                      <Field id="game-label" label="Game name (optional)">
                        <Input
                          id="game-label"
                          maxLength={40}
                          placeholder="Choose a game or enter a name"
                          value={form.gameLabel}
                          onChange={(event) => setForm({ ...form, gameLabel: event.target.value })}
                        />
                      </Field>
                    </>
                  ) : null}
                  {form.gameFormat === "SOLO" ? (
                    <>
                      {playerField(0)}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">
                          Focus routine (optional)
                        </Label>
                        <div className="flex flex-wrap gap-1.5">
                          {["Line Drills", "Break & Run", "Century Routine", "Free Practice"].map(
                            (label) => (
                              <button
                                key={label}
                                type="button"
                                aria-pressed={form.gameLabel === label}
                                onClick={() => setForm({ ...form, gameLabel: label })}
                                className={cn(
                                  "min-h-8 rounded-full border px-3 text-xs font-medium",
                                  form.gameLabel === label
                                    ? "border-felt/50 bg-felt/10 text-felt"
                                    : "border-border bg-background/70 text-muted-foreground",
                                )}
                              >
                                {label}
                              </button>
                            ),
                          )}
                        </div>
                        <Input
                          id="solo-practice-routine"
                          maxLength={40}
                          aria-label="Custom practice routine"
                          placeholder="Or enter a routine"
                          value={form.gameLabel}
                          onChange={(event) => setForm({ ...form, gameLabel: event.target.value })}
                        />
                      </div>
                    </>
                  ) : null}
                </section>
                {!editing ? (
                  <section className="space-y-3 rounded-2xl border border-border/80 bg-surface/55 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        Duration hold
                      </p>
                      {walkInNextBooking ? (
                        <p className="text-[10px] font-semibold text-felt">
                          Next booking {time(walkInNextBooking.startTime)}
                        </p>
                      ) : (
                        <p className="text-[10px] font-semibold text-felt">No booking cutoff</p>
                      )}
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      <button
                        type="button"
                        aria-pressed={form.holdMode === "OPEN"}
                        onClick={() => setForm({ ...form, holdMode: "OPEN" })}
                        className={cn(
                          "min-h-10 rounded-xl border px-1 text-[11px] font-semibold transition-colors",
                          form.holdMode === "OPEN"
                            ? "border-felt/70 bg-felt/15 text-felt"
                            : "border-border bg-background/80 text-muted-foreground hover:bg-surface-strong",
                        )}
                      >
                        Open
                      </button>
                      {walkInDurationPresets.map((minutes) => (
                        <button
                          key={minutes}
                          type="button"
                          aria-pressed={
                            form.holdMode === "TIMED" && form.durationMinutes === minutes
                          }
                          onClick={() =>
                            setForm({ ...form, holdMode: "TIMED", durationMinutes: minutes })
                          }
                          className={cn(
                            "min-h-10 rounded-xl border px-1 text-[11px] font-semibold transition-colors",
                            form.holdMode === "TIMED" && form.durationMinutes === minutes
                              ? "border-felt/70 bg-felt/15 text-felt"
                              : "border-border bg-background/80 text-muted-foreground hover:bg-surface-strong",
                          )}
                        >
                          {minutes % 60 === 0
                            ? `${minutes / 60}h`
                            : `${Math.floor(minutes / 60)}h 30m`}
                        </button>
                      ))}
                      <button
                        type="button"
                        aria-pressed={form.holdMode === "CUSTOM"}
                        onClick={() =>
                          setForm({
                            ...form,
                            holdMode: "CUSTOM",
                            durationMinutes: Number(customDurationText) || 60,
                          })
                        }
                        className={cn(
                          "min-h-10 rounded-xl border px-1 text-[11px] font-semibold transition-colors",
                          form.holdMode === "CUSTOM"
                            ? "border-felt/70 bg-felt/15 text-felt"
                            : "border-border bg-background/80 text-muted-foreground hover:bg-surface-strong",
                        )}
                      >
                        Custom
                      </button>
                    </div>
                    {form.holdMode === "CUSTOM" ? (
                      <Field
                        id="custom-walkin-duration"
                        label="Custom duration"
                        description="30-minute steps · 30 minutes to 24 hours"
                        error={walkInHoldError}
                      >
                        <div className="relative">
                          <Input
                            id="custom-walkin-duration"
                            type="number"
                            inputMode="numeric"
                            min={WALKIN_CUSTOM_DURATION_MINUTES}
                            max={WALKIN_CUSTOM_DURATION_MAX_MINUTES}
                            step={WALKIN_CUSTOM_DURATION_STEP_MINUTES}
                            value={customDurationText}
                            aria-invalid={Boolean(walkInHoldError)}
                            onChange={(event) => {
                              const value = event.target.value;
                              setCustomDurationText(value);
                              setForm({
                                ...form,
                                durationMinutes: value === "" ? 0 : Number(value),
                              });
                            }}
                          />
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                            min
                          </span>
                        </div>
                      </Field>
                    ) : null}
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/75 px-3 py-2.5 text-xs">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Clock3 className="h-4 w-4 shrink-0 text-felt" aria-hidden="true" />
                        {!walkInCanStart ? (
                          <span>Not enough time before the next booking.</span>
                        ) : (
                          <span>
                            {form.holdMode === "OPEN"
                              ? walkInCutoff
                                ? `Open until ${time(walkInPlannedEnd)} booking`
                                : "Open · stop manually"
                              : `Held until ${time(walkInPlannedEnd)}${
                                  walkInEstimateMinutes < form.durationMinutes
                                    ? " · shortened for next booking"
                                    : ""
                                }`}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-right text-[10px] text-muted-foreground">
                        {form.holdMode === "OPEN" && !walkInCutoff ? (
                          <>
                            Billing
                            <strong className="block text-sm text-felt">Live meter</strong>
                          </>
                        ) : (
                          <>
                            Estimate
                            <strong className="block text-sm text-felt">
                              {money(
                                sessionCharge(walkInTable?.hourlyRate ?? 0, walkInEstimateMinutes),
                              )}
                            </strong>
                          </>
                        )}
                      </span>
                    </div>
                    {walkInValidation.message ? (
                      <p role="alert" className="text-xs font-medium text-destructive">
                        {walkInValidation.message}
                      </p>
                    ) : null}
                  </section>
                ) : null}
                <DialogFooter className="flex-row gap-2 sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 flex-1 sm:flex-none"
                    disabled={isSavingWalkIn}
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="min-h-11 flex-1 gap-2 sm:flex-none"
                    loading={isSavingWalkIn}
                    loadingText={editing ? "Saving…" : "Starting…"}
                    disabled={
                      !editing &&
                      (!walkInCanStart || Boolean(walkInHoldError) || !walkInPlayersValid(form))
                    }
                  >
                    {!editing ? <Play className="h-4 w-4" aria-hidden="true" /> : null}
                    {editing ? "Save changes" : "Start clock"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog
            open={playerPickerIndex !== null}
            onOpenChange={(open) => {
              if (!open) setPlayerPickerIndex(null);
            }}
          >
            <DialogContent className="max-h-[88dvh] w-[calc(100%-1rem)] max-w-md overflow-y-auto rounded-3xl border-border/80 bg-background p-4 shadow-2xl sm:p-5">
              <DialogHeader className="pr-7 text-left">
                <DialogTitle>Choose a regular player</DialogTitle>
                <DialogDescription>
                  Or keep the name as a guest to avoid linking this session to an account.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    value={playerPickerSearch}
                    onChange={(event) => setPlayerPickerSearch(event.target.value)}
                    placeholder="Search name, nickname, or mobile"
                    aria-label="Search regular players"
                    className="min-h-11 pl-9"
                  />
                </div>
                {playerPickerLoading ? (
                  <div className="space-y-2" role="status" aria-label="Loading regular players">
                    {[0, 1, 2].map((index) => (
                      <Skeleton key={index} className="h-16 rounded-xl" />
                    ))}
                  </div>
                ) : null}
                {playerPickerError ? (
                  <p role="alert" className="rounded-xl bg-warning/10 p-3 text-sm text-warning">
                    {playerPickerError}
                  </p>
                ) : null}
                {!playerPickerLoading && !playerPickerError ? (
                  <div className="max-h-[42dvh] space-y-2 overflow-y-auto">
                    {playerPickerResults.map((player) => (
                      <button
                        key={player.id}
                        type="button"
                        onClick={() => {
                          if (playerPickerIndex !== null) {
                            selectPlayerProfile(playerPickerIndex, player);
                          }
                        }}
                        className="flex min-h-16 w-full items-center justify-between gap-3 rounded-xl bg-surface px-3 py-2.5 text-left transition-colors hover:bg-surface-strong"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">{player.fullName}</span>
                          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                            {player.nickname ? `${player.nickname} · ` : ""}
                            {player.phone}
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block text-sm font-bold text-felt">
                            {money(player.outstandingAmount)}
                          </span>
                          <span className="text-[10px] text-muted-foreground">due</span>
                        </span>
                      </button>
                    ))}
                    {playerPickerResults.length === 0 ? (
                      <p className="rounded-xl bg-surface/60 px-3 py-5 text-center text-sm text-muted-foreground">
                        No registered players match that search.
                      </p>
                    ) : null}
                  </div>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-10 w-full gap-2"
                  onClick={() => setPlayerPickerIndex(null)}
                >
                  <UserRound className="h-4 w-4" aria-hidden="true" />
                  Continue as guest
                </Button>
                <Button
                  type="button"
                  className="min-h-11 w-full gap-2"
                  onClick={() => {
                    setRegisterForPlayerIndex(playerPickerIndex);
                    setPlayerFormError(null);
                    setPlayerPickerIndex(null);
                    setShowPlayerForm(true);
                  }}
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Register and add to this table
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <div className="mt-5 hidden lg:block">
            <div
              className={cn(
                "grid gap-1 rounded-xl border border-border bg-surface p-1",
                "grid-cols-5",
              )}
            >
              {(["tables", "unpaid", "ledger", "bookings", "players"] as const).map((view) => (
                <button
                  key={view}
                  type="button"
                  onClick={() => setActiveHistory(view)}
                  aria-pressed={activeHistory === view}
                  className={cn(
                    "min-h-11 rounded-lg px-1.5 text-xs font-semibold capitalize transition-colors sm:px-3 sm:text-sm",
                    activeHistory === view
                      ? "bg-felt text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span>{view === "bookings" ? "Bookings" : view}</span>
                  {view === "unpaid" && summary.unpaidCount > 0 ? (
                    <span className="relative -top-1 ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold leading-none text-destructive-foreground">
                      {summary.unpaidCount}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
          {activeHistory === "tables" ? (
            <section className="mt-4" aria-labelledby="floor-heading" aria-busy={snapshotLoading}>
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <h2 id="floor-heading" className="text-lg font-semibold sm:text-xl">
                    Live floor
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                    Live sessions and upcoming reservations.
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0">
                  {snapshotLoading
                    ? "Loading"
                    : `${filteredTables.length} of ${snapshot.length} tables`}
                </Badge>
              </div>
              <div
                className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1"
                role="group"
                aria-label="Filter tables"
              >
                {(
                  [
                    ["ALL", "All", tables.length],
                    ["ACTIVE", "Active", activeTableCount],
                    [
                      "SNOOKER",
                      "Snooker",
                      tables.filter((table) => table.type === "SNOOKER").length,
                    ],
                    ["POOL", "Pool", tables.filter((table) => table.type === "POOL").length],
                  ] as const
                ).map(([filter, label, count]) => (
                  <button
                    key={filter}
                    type="button"
                    aria-pressed={tableFilter === filter}
                    onClick={() => setTableFilter(filter)}
                    className={cn(
                      "min-h-10 shrink-0 rounded-full border px-4 text-xs font-semibold transition-colors sm:text-sm",
                      tableFilter === filter
                        ? "border-felt bg-felt text-primary-foreground"
                        : "border-border bg-surface text-muted-foreground hover:bg-surface-strong hover:text-foreground",
                    )}
                  >
                    {label}
                    {!snapshotLoading ? (
                      <span
                        className={cn(
                          "ml-1.5",
                          tableFilter === filter ? "text-primary-foreground/80" : "opacity-70",
                        )}
                      >
                        {count}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
              {snapshotLoading ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 4 }, (_, index) => (
                    <Card key={index} className="border-border bg-surface p-4">
                      <Skeleton className="h-5 w-1/2" />
                      <Skeleton className="mt-4 h-16 w-full" />
                      <Skeleton className="mt-4 h-11 w-full" />
                    </Card>
                  ))}
                </div>
              ) : tables.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  No active tables are configured.
                </div>
              ) : filteredTables.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  No tables match this filter.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredTables.map((table) => {
                    const active = table.sessions.find((session) => session.status === "ONGOING");
                    const nowBooking = table.sessions.find(
                      (session) =>
                        session.source === "ONLINE" &&
                        (session.status === "HELD" || session.status === "CONFIRMED") &&
                        session.startTime.getTime() <= currentTime &&
                        session.plannedEnd.getTime() > currentTime,
                    );
                    const upcoming = table.sessions.filter(
                      (session) =>
                        session.source === "ONLINE" &&
                        (session.status === "HELD" || session.status === "CONFIRMED") &&
                        session.plannedEnd.getTime() > currentTime,
                    );
                    const expanded = Boolean(expandedBookings[table.id]);
                    const visibleBookings = expanded ? upcoming : upcoming.slice(0, 1);
                    const openHoldBooking =
                      active?.source === "WALKIN" && active.walkInOpenEnded
                        ? upcoming.find(
                            (booking) =>
                              booking.startTime.getTime() === active.plannedEnd.getTime(),
                          )
                        : undefined;
                    const isMaintenance = active?.source === "MAINTENANCE";
                    const activePlayers = active
                      ? sessionPlayers(active.players, active.customerName)
                      : [];
                    const playerOne = active
                      ? active.source === "WALKIN"
                        ? (activePlayers[0]?.name ?? "Walk-in")
                        : (active.customerName ?? "Online booking")
                      : "";
                    const playerTwo =
                      active?.source === "WALKIN" ? (activePlayers[1]?.name ?? "") : "";
                    const start = active?.actualStart ?? active?.startTime;
                    const minutes =
                      active && start ? sessionDurationMinutes(start, new Date(currentTime)) : 0;
                    const rate = active?.rateSnapshot ?? table.hourlyRate;
                    const liveAmount = active ? sessionCharge(rate, minutes) : 0;
                    const overtimeMinutes =
                      active && active.source !== "MAINTENANCE" && !active.walkInOpenEnded
                        ? Math.max(
                            0,
                            Math.floor((currentTime - active.plannedEnd.getTime()) / 60_000),
                          )
                        : 0;
                    const extensionBooking = active
                      ? table.sessions
                          .filter(
                            (session) =>
                              session.source === "ONLINE" &&
                              (session.status === "HELD" || session.status === "CONFIRMED") &&
                              session.startTime.getTime() >= active.plannedEnd.getTime() &&
                              session.plannedEnd.getTime() > currentTime,
                          )
                          .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())[0]
                      : null;
                    const extensionCutoff = getWalkInCutoff(extensionBooking?.startTime ?? null);
                    const canExtendWalkIn = Boolean(
                      active?.source === "WALKIN" &&
                      !active.walkInOpenEnded &&
                      getWalkInExtensionEnd(
                        new Date(currentTime),
                        active.plannedEnd,
                        extensionCutoff,
                        WALKIN_EXTEND_INCREMENT_MINUTES,
                      ),
                    );
                    const unavailable = Boolean(active || nowBooking);
                    const activeEntry: Entry | null =
                      active && active.source === "WALKIN"
                        ? {
                            id: active.id,
                            sessionId: active.id,
                            tableId: table.id,
                            tableName: table.name,
                            tableType: table.type,
                            status: "live",
                            statusLabel: "In use",
                            playerOne,
                            playerTwo,
                            startDate: date(active.startTime),
                            startTime: time(start ?? null),
                            endTime: time(active.plannedEnd),
                            payment: active.paymentStatus,
                            paymentMethod: active.paymentMethod ?? "",
                            payerName: active.payerName ?? "",
                            customerPhone: active.customerPhone ?? "",
                            durationMinutes: active.durationMinutes,
                            amount: active.amount ?? 0,
                            source: active.source,
                            players: activePlayers,
                            gameFormat: active.gameFormat,
                            gameLabel: active.gameLabel,
                            grossAmount: active.grossAmount,
                            discountPercent: active.discountPercent,
                            discountAmount: active.discountAmount,
                            settlementDiscountPercent: active.settlementDiscountPercent,
                            settlementDiscountAmount: active.settlementDiscountAmount,
                            payerShares: payerSharesFromUnknown(active.payerShares),
                          }
                        : null;

                    return (
                      <Card
                        key={table.id}
                        className={cn(
                          "relative overflow-hidden border-border bg-surface",
                          active && !isMaintenance && "border-l-4 border-l-felt",
                          overtimeMinutes > 0 && "border-destructive/50",
                          !active && !nowBooking && "border-l-4 border-l-border",
                        )}
                      >
                        <CardContent className="relative p-4">
                          {pendingTableId === table.id ? (
                            <div
                              role="status"
                              aria-label={`Updating ${table.name}`}
                              className="absolute inset-0 z-10 flex flex-col justify-between bg-surface/95 p-4 backdrop-blur-[2px]"
                            >
                              <div className="space-y-3">
                                <Skeleton className="h-6 w-2/3" />
                                <Skeleton className="h-4 w-1/2" />
                              </div>
                              <div className="space-y-3">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-4/5" />
                                <Skeleton className="h-11 w-full rounded-xl" />
                              </div>
                            </div>
                          ) : null}
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                <h3 className="text-lg font-bold">{table.name}</h3>
                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                  {table.type === "SNOOKER" ? "Snooker" : "Pool"}
                                </p>
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {active?.source === "WALKIN"
                                  ? active.gameLabel ||
                                    gameFormatDescription(active.gameFormat) ||
                                    "Walk-in session"
                                  : active
                                    ? playerOne
                                    : nowBooking
                                      ? "Online reservation"
                                      : upcoming.length > 0
                                        ? `Next booking ${time(upcoming[0]?.startTime ?? null)}`
                                        : "Ready for walk-in"}
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className={cn(
                                "shrink-0",
                                active && !isMaintenance && "border-felt/40 text-felt",
                                isMaintenance && "border-warning/40 text-warning",
                                overtimeMinutes > 0 && "border-destructive/50 text-destructive",
                              )}
                            >
                              {isMaintenance
                                ? "Maintenance"
                                : active
                                  ? overtimeMinutes > 0
                                    ? "Time over"
                                    : "In play"
                                  : unavailable
                                    ? nowBooking?.status === "CONFIRMED"
                                      ? "Booked now"
                                      : "Reserved"
                                    : "Available"}
                            </Badge>
                          </div>

                          {active ? (
                            <div
                              className={cn(
                                "mt-3 rounded-xl border p-3",
                                overtimeMinutes > 0
                                  ? "border-destructive/30 bg-destructive/5"
                                  : "border-felt/20 bg-felt/5",
                              )}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  {active.source === "WALKIN" ? (
                                    <>
                                      <p className="truncate font-semibold">
                                        {active.gameLabel ||
                                          (active.gameFormat
                                            ? active.gameFormat === "GROUP"
                                              ? "Group game"
                                              : active.gameFormat === "DOUBLES"
                                                ? "Doubles · 2 vs 2"
                                                : active.gameFormat === "SOLO"
                                                  ? "Solo practice"
                                                  : "Singles · 1 vs 1"
                                            : "Walk-in")}
                                      </p>
                                      <div className="mt-1 flex flex-wrap gap-1">
                                        {activePlayers.map((player, index) => (
                                          <span
                                            key={`${active.id}-player-${index}`}
                                            className="rounded-md bg-background/80 px-1.5 py-0.5 text-xs text-muted-foreground"
                                          >
                                            {player.team ? `Team ${player.team} · ` : ""}
                                            {player.name}
                                          </span>
                                        ))}
                                      </div>
                                    </>
                                  ) : (
                                    <p className="truncate font-semibold">{playerOne}</p>
                                  )}
                                  {active.customerPhone ? (
                                    <p className="truncate text-xs text-muted-foreground">
                                      {active.customerPhone}
                                    </p>
                                  ) : null}
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {active.source === "ONLINE" ? "Online" : "Walk-in"} · Started{" "}
                                    {time(start ?? null)}
                                    {active.source === "WALKIN" && active.walkInOpenEnded
                                      ? active.plannedEnd.getTime() !==
                                        OPEN_WALKIN_PLANNED_END.getTime()
                                        ? ` · Open until ${time(active.plannedEnd)} booking`
                                        : " · Open hold"
                                      : ` · due ${time(active.plannedEnd)}`}
                                  </p>
                                </div>
                                {!isMaintenance ? (
                                  <div className="text-right">
                                    <p className="font-mono text-lg font-bold text-felt">
                                      {elapsedClock(start ?? null, currentTime)}
                                    </p>
                                    <p className="text-sm font-semibold text-warning">
                                      {money(liveAmount)} · bill
                                    </p>
                                  </div>
                                ) : null}
                              </div>
                              {!isMaintenance && overtimeMinutes > 0 ? (
                                <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-destructive">
                                  <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                                  Overtime · {overtimeMinutes}m past the block
                                </p>
                              ) : !isMaintenance &&
                                !(active.source === "WALKIN" && active.walkInOpenEnded) ? (
                                <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                                  {Math.floor(
                                    Math.max(0, active.plannedEnd.getTime() - currentTime) / 60_000,
                                  )}{" "}
                                  min left on the block
                                </p>
                              ) : !isMaintenance ? (
                                <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                                  Billing continues until the session is stopped.
                                </p>
                              ) : null}
                            </div>
                          ) : null}

                          {upcoming.length > 0 ? (
                            <div
                              className={cn(
                                "mt-3",
                                active ? "" : "rounded-xl bg-background/70 p-3",
                              )}
                            >
                              {!active ? (
                                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                  {visibleBookings[0]?.startTime.getTime() <= currentTime
                                    ? "Booking ready"
                                    : "Next booking"}
                                </p>
                              ) : null}
                              <div className="space-y-2">
                                {visibleBookings.map((booking) => (
                                  <div
                                    key={booking.id}
                                    className="rounded-lg border border-border/70 bg-background/50 p-3"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0">
                                        <p className="truncate text-sm font-medium">
                                          {booking.customerName ?? "Online booking"}
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                          {new Intl.DateTimeFormat("en-IN", {
                                            timeZone: "Asia/Kolkata",
                                            weekday: "short",
                                            day: "numeric",
                                            month: "short",
                                          }).format(booking.startTime)}
                                          {" · "}
                                          {time(booking.startTime)}–{time(booking.plannedEnd)}
                                        </p>
                                        {booking.customerPhone ? (
                                          <p className="mt-1 text-xs text-muted-foreground">
                                            {booking.customerPhone}
                                          </p>
                                        ) : null}
                                      </div>
                                      <Badge variant="outline" className="shrink-0 text-[10px]">
                                        {booking.status === "HELD" ? "Awaiting confirm" : "Booked"}
                                      </Badge>
                                    </div>
                                    {booking.status === "HELD" ? (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        className="mt-2 min-h-10 w-full"
                                        onClick={() =>
                                          ask(
                                            "Confirm this booking?",
                                            "The booking will remain reserved for the customer.",
                                            async () => {
                                              await updateBookingStatusAction(
                                                booking.id,
                                                "CONFIRMED",
                                              );
                                              await refreshAfterMutation();
                                            },
                                          )
                                        }
                                      >
                                        Confirm booking
                                      </Button>
                                    ) : booking.status === "CONFIRMED" ? (
                                      <Button
                                        type="button"
                                        variant={
                                          booking.startTime.getTime() <= currentTime
                                            ? "default"
                                            : "outline"
                                        }
                                        className="mt-2 min-h-10 w-full gap-2"
                                        disabled={
                                          booking.startTime.getTime() > currentTime ||
                                          Boolean(active) ||
                                          startingBookingId === booking.id
                                        }
                                        loading={startingBookingId === booking.id}
                                        loadingText="Starting…"
                                        onClick={() => void startBooking(booking.id)}
                                      >
                                        {booking.startTime.getTime() <= currentTime ? (
                                          <Play className="h-4 w-4" aria-hidden="true" />
                                        ) : null}
                                        {booking.startTime.getTime() <= currentTime
                                          ? `Start ${booking.customerName}`
                                          : `Starts at ${time(booking.startTime)}`}
                                      </Button>
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                              {upcoming.length > 1 ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="mt-1 min-h-10 w-full gap-1 text-xs"
                                  onClick={() =>
                                    setExpandedBookings((current) => ({
                                      ...current,
                                      [table.id]: !expanded,
                                    }))
                                  }
                                  aria-expanded={expanded}
                                >
                                  {expanded ? (
                                    <>
                                      <ChevronUp className="h-4 w-4" aria-hidden="true" />
                                      Show fewer bookings
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="h-4 w-4" aria-hidden="true" />
                                      Show {upcoming.length - 1} more
                                    </>
                                  )}
                                </Button>
                              ) : null}
                            </div>
                          ) : !active ? (
                            <p className="mt-3 rounded-xl bg-background/70 p-3 text-xs text-muted-foreground">
                              No upcoming bookings.
                            </p>
                          ) : null}

                          <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                            {active && !isMaintenance ? (
                              <>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  className="min-h-11 w-full gap-2"
                                  onClick={() => openCloseout(active)}
                                >
                                  <Square className="h-4 w-4" aria-hidden="true" />
                                  Stop & close
                                </Button>
                                {active.source === "WALKIN" && !active.walkInOpenEnded ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="min-h-11 min-w-[7.5rem] gap-2 px-3"
                                    disabled={!canExtendWalkIn || extendingSessionId === active.id}
                                    loading={extendingSessionId === active.id}
                                    loadingText="Adding…"
                                    title={
                                      canExtendWalkIn
                                        ? "Add 30 minutes"
                                        : "A full 30-minute extension is not available before the next booking"
                                    }
                                    onClick={() => void extendSession(active.id)}
                                  >
                                    <Plus className="h-4 w-4" aria-hidden="true" />
                                    30 min
                                  </Button>
                                ) : null}
                              </>
                            ) : !unavailable ? (
                              <Button
                                type="button"
                                className="col-span-2 min-h-11 w-full gap-2"
                                onClick={() => openCreate(table.id)}
                              >
                                <Plus className="h-4 w-4" aria-hidden="true" />
                                Start walk-in
                              </Button>
                            ) : null}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>
          ) : null}

          <div className="mt-4 grid gap-6 lg:mt-6">
            {activeHistory === "players" || showPlayerForm ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2" aria-label="Player directory summary">
                  <Metric
                    icon={UserRound}
                    label="Players"
                    value={String(playerDirectory.summary.playerCount)}
                  />
                  <Metric
                    icon={CircleDollarSign}
                    label="Outstanding"
                    value={money(playerDirectory.summary.totalOutstanding)}
                  />
                  <Metric
                    icon={ReceiptText}
                    label="With dues"
                    value={String(playerDirectory.summary.playersWithDues)}
                  />
                </div>

                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <p className="text-sm text-muted-foreground">
                    Registered players and their running account balances.
                  </p>
                  <Button
                    type="button"
                    className="min-h-11 w-full gap-2 sm:w-auto"
                    onClick={() => {
                      setPlayerFormError(null);
                      setShowPlayerForm(true);
                    }}
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Register player
                  </Button>
                </div>

                <Dialog
                  open={showPlayerForm}
                  onOpenChange={(open) => {
                    if (!isCreatingPlayer) {
                      setShowPlayerForm(open);
                      if (!open) setRegisterForPlayerIndex(null);
                    }
                  }}
                >
                  <DialogContent className="max-h-[92dvh] w-[calc(100%-1rem)] max-w-lg overflow-y-auto rounded-3xl border-border/80 bg-background p-4 shadow-2xl sm:p-5">
                    <DialogHeader className="pr-7 text-left">
                      <DialogTitle>
                        {registerForPlayerIndex !== null
                          ? "Register & add player"
                          : "Add regular player"}
                      </DialogTitle>
                      <DialogDescription>
                        {registerForPlayerIndex !== null
                          ? "Save their details once and select them for this table."
                          : "Save their details for faster table setup and dues tracking."}
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={(event) => void savePlayerProfile(event)} className="space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field id="player-full-name" label="Full name" required>
                          <div className="relative">
                            <UserRound
                              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                              aria-hidden="true"
                            />
                            <Input
                              id="player-full-name"
                              required
                              maxLength={120}
                              autoComplete="name"
                              value={playerForm.fullName}
                              onChange={(event) =>
                                setPlayerForm({ ...playerForm, fullName: event.target.value })
                              }
                              placeholder="Player's full name"
                              className="min-h-11 pl-9"
                            />
                          </div>
                        </Field>
                        <Field id="player-phone" label="Mobile number" required>
                          <div className="relative">
                            <Smartphone
                              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                              aria-hidden="true"
                            />
                            <Input
                              id="player-phone"
                              required
                              type="tel"
                              inputMode="tel"
                              autoComplete="tel"
                              value={playerForm.phone}
                              onChange={(event) =>
                                setPlayerForm({ ...playerForm, phone: event.target.value })
                              }
                              placeholder="10-digit mobile number"
                              className="min-h-11 pl-9"
                            />
                          </div>
                        </Field>
                      </div>

                      <Field id="player-nickname" label="Nickname (optional)">
                        <Input
                          id="player-nickname"
                          maxLength={60}
                          value={playerForm.nickname}
                          onChange={(event) =>
                            setPlayerForm({ ...playerForm, nickname: event.target.value })
                          }
                          placeholder="How the team knows them"
                          className="min-h-11"
                        />
                      </Field>

                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Usually plays</p>
                        <div
                          className="grid grid-cols-3 gap-2"
                          role="group"
                          aria-label="Discipline"
                        >
                          {(
                            [
                              ["BOTH", "Both"],
                              ["SNOOKER", "Snooker"],
                              ["POOL", "Pool"],
                            ] as const
                          ).map(([value, label]) => (
                            <button
                              key={value}
                              type="button"
                              aria-pressed={playerForm.primaryDiscipline === value}
                              onClick={() =>
                                setPlayerForm({ ...playerForm, primaryDiscipline: value })
                              }
                              className={cn(
                                "flex min-h-10 items-center justify-center gap-1.5 rounded-full px-2 text-xs font-semibold transition-colors",
                                playerForm.primaryDiscipline === value
                                  ? "bg-felt text-primary-foreground"
                                  : "bg-surface text-muted-foreground hover:text-foreground",
                              )}
                            >
                              <Table2 className="h-3.5 w-3.5" aria-hidden="true" />
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-surface/70 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-felt/10 text-felt">
                              <WalletCards className="h-4 w-4" aria-hidden="true" />
                            </span>
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold">
                                Allow tab / pay later
                              </span>
                              <span className="block text-xs text-muted-foreground">
                                Add table charges to this player’s dues
                              </span>
                            </span>
                          </div>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={playerForm.tabEnabled}
                            aria-label="Allow tab and pay later"
                            onClick={() =>
                              setPlayerForm({ ...playerForm, tabEnabled: !playerForm.tabEnabled })
                            }
                            className={cn(
                              "relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-felt focus-visible:ring-offset-2",
                              playerForm.tabEnabled ? "bg-felt" : "bg-muted",
                            )}
                          >
                            <span
                              className={cn(
                                "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left]",
                                playerForm.tabEnabled ? "left-[22px]" : "left-0.5",
                              )}
                            />
                          </button>
                        </div>
                        {playerForm.tabEnabled ? (
                          <Field
                            id="player-credit-limit"
                            label="Soft credit limit (₹)"
                            className="mt-3"
                          >
                            <Input
                              id="player-credit-limit"
                              type="number"
                              min={0}
                              max={999999999}
                              step={1}
                              inputMode="numeric"
                              value={playerForm.creditLimit}
                              onChange={(event) =>
                                setPlayerForm({ ...playerForm, creditLimit: event.target.value })
                              }
                              className="min-h-10"
                            />
                          </Field>
                        ) : null}
                      </div>

                      <details className="group rounded-xl bg-surface/40 px-3 py-2">
                        <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-2 text-xs font-semibold text-muted-foreground [&::-webkit-details-marker]:hidden">
                          Optional preferences
                          <ChevronDown
                            className="h-4 w-4 transition-transform group-open:rotate-180"
                            aria-hidden="true"
                          />
                        </summary>
                        <div className="mt-2 grid gap-3 sm:grid-cols-2">
                          <Field id="player-format" label="Preferred format">
                            <Select
                              value={playerForm.preferredFormat}
                              onValueChange={(value: PlayerProfileForm["preferredFormat"]) =>
                                setPlayerForm({ ...playerForm, preferredFormat: value })
                              }
                            >
                              <SelectTrigger id="player-format" aria-label="Preferred game format">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="NONE">No preference</SelectItem>
                                <SelectItem value="SINGLES">Singles</SelectItem>
                                <SelectItem value="DOUBLES">Doubles</SelectItem>
                                <SelectItem value="GROUP">Group</SelectItem>
                                <SelectItem value="SOLO">Solo</SelectItem>
                              </SelectContent>
                            </Select>
                          </Field>
                          <Field id="player-skill-tier" label="Player level">
                            <Select
                              value={playerForm.skillTier}
                              onValueChange={(value: PlayerProfileForm["skillTier"]) =>
                                setPlayerForm({ ...playerForm, skillTier: value })
                              }
                            >
                              <SelectTrigger id="player-skill-tier" aria-label="Player level">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="NOVICE">Novice</SelectItem>
                                <SelectItem value="CLUB_REGULAR">Club regular</SelectItem>
                                <SelectItem value="STATE_PRO">State pro</SelectItem>
                                <SelectItem value="PROFESSIONAL">Professional</SelectItem>
                              </SelectContent>
                            </Select>
                          </Field>
                        </div>
                      </details>
                      {playerFormError ? (
                        <p role="alert" className="text-sm text-destructive">
                          {playerFormError}
                        </p>
                      ) : null}
                      <DialogFooter className="flex-row gap-2 sm:justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          className="min-h-11 flex-1 sm:flex-none"
                          disabled={isCreatingPlayer}
                          onClick={() => {
                            setShowPlayerForm(false);
                            setRegisterForPlayerIndex(null);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          className="min-h-11 flex-1 gap-2 sm:flex-none"
                          loading={isCreatingPlayer}
                          loadingText="Registering…"
                        >
                          <UserRound className="h-4 w-4" aria-hidden="true" />
                          {registerForPlayerIndex !== null
                            ? "Register & add to table"
                            : "Create player"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>

                <div className="space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="relative flex-1">
                      <Search
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <Input
                        value={playerSearch}
                        onChange={(event) => setPlayerSearch(event.target.value)}
                        placeholder="Search players by name, nickname, or phone"
                        aria-label="Search players"
                        className="min-h-11 pl-9"
                      />
                    </div>
                    <Select
                      value={playerFilter}
                      onValueChange={(value) => setPlayerFilter(value as PlayerDirectoryFilter)}
                    >
                      <SelectTrigger
                        className="min-h-11 min-w-[12rem] border-border bg-background/70 text-sm shadow-none"
                        aria-label="Filter players"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All players</SelectItem>
                        <SelectItem value="HAS_DUES">Has dues</SelectItem>
                        <SelectItem value="OVER_LIMIT">Over limit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {playersError ? (
                    <p role="alert" className="text-sm text-destructive">
                      {playersError}
                    </p>
                  ) : null}
                </div>

                {playersLoading ? (
                  <div className="grid gap-3 lg:grid-cols-2">
                    {Array.from({ length: 4 }, (_, index) => (
                      <div
                        key={index}
                        className="space-y-3 rounded-2xl border border-border bg-surface/50 p-4"
                      >
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-10 w-full rounded-xl" />
                      </div>
                    ))}
                  </div>
                ) : playerDirectory.players.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-surface/30 px-6 py-10 text-center">
                    <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-felt/10 text-felt">
                      <UserRound className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <p className="mt-3 font-semibold">No players match</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Try a different search or switch the player filter.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-3 lg:grid-cols-2">
                    {playerDirectory.players.map((player) => (
                      <article
                        key={player.id}
                        className="group min-w-0 overflow-hidden rounded-2xl border border-border/80 bg-surface p-4 shadow-[0_4px_18px_rgba(0,0,0,0.2)] transition-colors hover:border-felt/40"
                      >
                        <div className="min-w-0">
                          <p className="break-words text-base font-bold leading-snug [overflow-wrap:anywhere]">
                            {player.fullName}
                          </p>
                          {player.nickname ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              “{player.nickname}”
                            </p>
                          ) : null}
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <a
                            href={`tel:${player.phone.replace(/[^\d+]/g, "")}`}
                            aria-label={`Call ${player.fullName}`}
                            className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-felt/10 px-3 py-1 font-semibold text-felt transition-colors hover:bg-felt/20"
                          >
                            <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                            {player.phone}
                          </a>
                          <span className="rounded-lg bg-background/70 px-2 py-1">
                            {player.skillTier}
                          </span>
                        </div>

                        <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/70 pt-3">
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                              Open sessions
                            </p>
                            <p className="mt-1 text-sm font-semibold">{player.openSessionCount}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                              Outstanding
                            </p>
                            <p
                              className={cn(
                                "mt-1 text-lg font-bold",
                                player.outstandingAmount > 0 ? "text-felt" : "text-emerald-500",
                              )}
                            >
                              {money(player.outstandingAmount)}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <a
                            href={`tel:${player.phone.replace(/[^\d+]/g, "")}`}
                            aria-label={`Call ${player.fullName}`}
                            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-felt px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-felt/90"
                          >
                            <Phone className="h-4 w-4" aria-hidden="true" />
                            Call
                          </a>
                          <Button
                            type="button"
                            variant="outline"
                            className="min-h-10 gap-2"
                            onClick={() => void openPlayerStatement(player.id)}
                          >
                            <FileText className="h-4 w-4" aria-hidden="true" />
                            History
                          </Button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}

                <Dialog
                  open={statementOpen}
                  onOpenChange={(open) => {
                    setStatementOpen(open);
                    if (!open) {
                      setStatement(null);
                      setStatementError(null);
                      setPlayerPaymentError(null);
                    }
                  }}
                >
                  <DialogContent className="max-h-[90dvh] w-[calc(100%-1rem)] max-w-2xl overflow-y-auto rounded-3xl border-border/80 bg-background p-4 shadow-2xl sm:p-6">
                    <DialogHeader className="pr-7 text-left">
                      <DialogTitle>{statement?.profile.fullName ?? "Player account"}</DialogTitle>
                      <DialogDescription>
                        Dues, payments, and completed match history. No match outcomes are inferred.
                      </DialogDescription>
                    </DialogHeader>
                    {statementLoading ? (
                      <div
                        className="space-y-3"
                        role="status"
                        aria-label="Loading account statement"
                      >
                        <Skeleton className="h-20 rounded-2xl" />
                        <Skeleton className="h-28 rounded-2xl" />
                      </div>
                    ) : statementError ? (
                      <p
                        role="alert"
                        className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
                      >
                        {statementError}
                      </p>
                    ) : statement ? (
                      <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-2">
                          <Metric
                            icon={CircleDollarSign}
                            label="Outstanding"
                            value={money(statement.balance)}
                          />
                          <Metric
                            icon={ReceiptText}
                            label="Open sessions"
                            value={String(statement.openSessionCount)}
                          />
                        </div>

                        <section className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold">Running dues</h3>
                            <span className="text-xs text-muted-foreground">
                              Oldest balances settle first
                            </span>
                          </div>
                          {statement.dues.length === 0 ? (
                            <p className="rounded-xl bg-surface/70 px-3 py-4 text-sm text-muted-foreground">
                              No account charges are linked to this player yet.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {statement.dues.map((due) => (
                                <article key={due.id} className="rounded-xl bg-surface/75 p-3">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="font-semibold">
                                        {due.session.table.name} · {date(due.session.startTime)}
                                      </p>
                                      <p className="mt-1 text-xs text-muted-foreground">
                                        {due.opponentNames
                                          .filter(
                                            (name) =>
                                              name.toLocaleLowerCase() !==
                                              statement.profile.fullName.toLocaleLowerCase(),
                                          )
                                          .join(", ") || "Match session"}
                                      </p>
                                    </div>
                                    <div className="shrink-0 text-right">
                                      <p className="font-bold">{money(due.amount)}</p>
                                      <p className="text-xs text-warning">
                                        {money(due.outstandingAmount)} due
                                      </p>
                                    </div>
                                  </div>
                                  {due.payments.length > 0 ? (
                                    <div className="mt-2 space-y-1 border-t border-border/60 pt-2">
                                      {due.payments.map((allocation) => (
                                        <p
                                          key={allocation.id}
                                          className="flex justify-between gap-2 text-xs text-muted-foreground"
                                        >
                                          <span>
                                            Payment · {date(allocation.createdAt)} ·{" "}
                                            {allocation.payment.paymentMethod}
                                          </span>
                                          <span>{money(allocation.amount)}</span>
                                        </p>
                                      ))}
                                    </div>
                                  ) : null}
                                </article>
                              ))}
                            </div>
                          )}
                        </section>

                        <section className="space-y-2">
                          <h3 className="font-semibold">Match history</h3>
                          {statement.matches.length === 0 ? (
                            <p className="rounded-xl bg-surface/70 px-3 py-4 text-sm text-muted-foreground">
                              No completed matches are linked to this player yet.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {statement.matches.map((match) => {
                                const opponents = sessionPlayers(match.players)
                                  .filter((player) => player.profileId !== statement.profile.id)
                                  .map((player) => player.name);
                                return (
                                  <div
                                    key={match.id}
                                    className="flex items-center justify-between gap-3 rounded-xl bg-surface/70 px-3 py-2.5"
                                  >
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-semibold">
                                        {match.tableName} · {date(match.startTime)}
                                      </p>
                                      <p className="truncate text-xs text-muted-foreground">
                                        {match.gameLabel ||
                                          gameFormatDescription(match.gameFormat) ||
                                          "Match"}
                                        {opponents.length > 0
                                          ? ` · vs ${opponents.join(", ")}`
                                          : ""}
                                      </p>
                                    </div>
                                    <Badge variant="outline" className="shrink-0">
                                      {match.paymentStatus === "PAID" ? "Paid" : "Unpaid"}
                                    </Badge>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </section>

                        {statement.balance > 0 ? (
                          <form
                            onSubmit={(event) => void collectPlayerPayment(event)}
                            className="space-y-3 rounded-2xl bg-felt/5 p-3"
                          >
                            <h3 className="font-semibold">Record account payment</h3>
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                type="number"
                                min={1}
                                step={1}
                                inputMode="numeric"
                                value={playerPaymentAmount}
                                onChange={(event) => setPlayerPaymentAmount(event.target.value)}
                                placeholder={`Amount · max ${statement.balance}`}
                                aria-label="Player payment amount"
                              />
                              <Select
                                value={playerPaymentMethod}
                                onValueChange={(value: "CASH" | "UPI" | "CARD") =>
                                  setPlayerPaymentMethod(value)
                                }
                              >
                                <SelectTrigger aria-label="Player payment method">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="CASH">Cash</SelectItem>
                                  <SelectItem value="UPI">UPI</SelectItem>
                                  <SelectItem value="CARD">Card</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            {playerPaymentError ? (
                              <p role="alert" className="text-sm text-destructive">
                                {playerPaymentError}
                              </p>
                            ) : null}
                            <Button
                              type="submit"
                              className="min-h-11 w-full"
                              loading={collectingPlayerId === statement.profile.id}
                              loadingText="Recording payment…"
                            >
                              Record payment
                            </Button>
                          </form>
                        ) : null}
                      </div>
                    ) : null}
                  </DialogContent>
                </Dialog>
              </div>
            ) : null}

            {activeHistory === "unpaid" ? (
              <div className="min-w-0 space-y-4">
                <div>
                  <div className="grid grid-cols-2 gap-2" aria-label="Outstanding payment summary">
                    <Metric
                      icon={CircleDollarSign}
                      label="Total dues"
                      value={money(summary.unpaidAmount)}
                    />
                    <Metric
                      icon={ReceiptText}
                      label="Unpaid sessions"
                      value={String(summary.unpaidCount)}
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Completed walk-ins and bookings with an outstanding balance.
                  </p>
                </div>
                <div className="space-y-3">
                  <div
                    className="flex rounded-full bg-background/70 p-1"
                    role="group"
                    aria-label="Unpaid date filter"
                  >
                    <button
                      type="button"
                      aria-pressed={!unpaidDateRangeEnabled}
                      onClick={() => setUnpaidDateRangeEnabled(false)}
                      className={cn(
                        "min-h-9 flex-1 rounded-full px-3 text-xs font-semibold transition-colors",
                        unpaidDateRangeEnabled
                          ? "text-muted-foreground hover:text-foreground"
                          : "bg-felt text-primary-foreground shadow-sm",
                      )}
                    >
                      All outstanding
                    </button>
                    <button
                      type="button"
                      aria-pressed={unpaidDateRangeEnabled}
                      onClick={() => setUnpaidDateRangeEnabled(true)}
                      className={cn(
                        "min-h-9 flex-1 rounded-full px-3 text-xs font-semibold transition-colors",
                        unpaidDateRangeEnabled
                          ? "bg-felt text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      Filter by date
                    </button>
                  </div>
                  {unpaidDateRangeEnabled ? (
                    <DateRangeFilter
                      value={unpaidDateRange}
                      onChange={setUnpaidDateRange}
                      label="Unpaid date presets"
                    />
                  ) : null}
                </div>
                <section className="grid min-w-0 gap-3 lg:grid-cols-2" aria-label="Unpaid sessions">
                  {dues.length === 0 && duesPage.loading ? (
                    Array.from({ length: 3 }, (_, index) => (
                      <div
                        key={index}
                        className="space-y-3 rounded-2xl border border-border bg-surface/50 p-4"
                      >
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-11 w-full rounded-xl" />
                      </div>
                    ))
                  ) : dues.length === 0 ? (
                    <div className="col-span-full rounded-2xl border border-dashed border-border bg-surface/30 px-6 py-10 text-center">
                      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-felt/10 text-felt">
                        <Check className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <p className="mt-3 font-semibold">All settled</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        There are no completed sessions with an outstanding balance.
                      </p>
                    </div>
                  ) : (
                    dues.map((entry) => (
                      <article
                        key={entry.id}
                        className="group relative min-w-0 overflow-hidden rounded-2xl border border-border/80 bg-surface p-4 shadow-[0_4px_18px_rgba(0,0,0,0.2)] transition-[border-color,box-shadow] hover:border-felt/40 hover:shadow-[0_8px_24px_rgba(0,0,0,0.26)] sm:p-5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning/10 text-warning">
                              <ReceiptText className="h-5 w-5" aria-hidden="true" />
                            </span>
                            <div className="min-w-0">
                              <p className="break-words text-base font-bold leading-snug [overflow-wrap:anywhere]">
                                {entry.payerName || entry.playerOne}
                              </p>
                              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                                <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                {entry.startDate}
                              </p>
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-xl font-bold leading-none text-felt">
                              {money(entry.amount)}
                            </p>
                            <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-1 text-[10px] font-semibold text-warning">
                              <CircleDollarSign className="h-3 w-3" aria-hidden="true" />
                              Unpaid
                            </span>
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/70 pt-3">
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-background/70 px-2.5 py-1.5 text-xs font-semibold">
                            <Table2 className="h-3.5 w-3.5 text-felt" aria-hidden="true" />
                            Table {entry.tableName}
                          </span>
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-background/70 px-2.5 py-1.5 text-xs text-muted-foreground">
                            <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                            {entry.startTime}–{entry.endTime || "—"} · {entry.durationMinutes ?? 0}{" "}
                            min
                          </span>
                          <span className="rounded-lg bg-background/70 px-2.5 py-1.5 text-xs text-muted-foreground">
                            {entry.source === "ONLINE"
                              ? "Online booking"
                              : entry.source === "WALKIN"
                                ? "Walk-in"
                                : "Maintenance"}
                          </span>
                        </div>
                        <div className="mt-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                            {entry.gameLabel ||
                              gameFormatDescription(entry.gameFormat) ||
                              "Players"}
                          </p>
                          {entry.players.length > 0 ? (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {entry.players.map((player, index) => (
                                <span
                                  key={`${entry.id}-dues-player-${index}`}
                                  className="max-w-full break-words rounded-full bg-background/70 px-2.5 py-1 text-xs shadow-sm [overflow-wrap:anywhere]"
                                >
                                  {player.team ? `Team ${player.team} · ` : ""}
                                  {player.name}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                        {entry.discountPercent > 0 || entry.settlementDiscountPercent > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 rounded-xl bg-background/65 px-3 py-2 text-xs text-muted-foreground">
                            {entry.discountPercent > 0 ? (
                              <span>
                                Session discount {entry.discountPercent}% ·{" "}
                                {money(entry.discountAmount)} off
                              </span>
                            ) : null}
                            {entry.settlementDiscountPercent > 0 ? (
                              <span>
                                Settlement {entry.settlementDiscountPercent}% ·{" "}
                                {money(entry.settlementDiscountAmount)} off
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                        {entry.payerShares.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {entry.payerShares.map((share) => (
                              <Badge
                                key={`${entry.id}-${share.name}`}
                                variant="outline"
                                className="rounded-lg"
                              >
                                {share.name}: {money(share.amount)}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                        <Button
                          type="button"
                          className="mt-4 min-h-11 w-full gap-2 rounded-xl"
                          onClick={() =>
                            setPaymentEntry({
                              sessionId: entry.sessionId!,
                              payerName: entry.payerName || entry.playerOne,
                              paymentMethod: "CASH",
                              applyDiscount: false,
                              discountPercent: "0",
                            })
                          }
                        >
                          <ReceiptText className="h-4 w-4" aria-hidden="true" />
                          Record payment
                        </Button>
                      </article>
                    ))
                  )}
                  {duesPage.error ? (
                    <p role="alert" className="text-sm text-destructive">
                      {duesPage.error}
                    </p>
                  ) : null}
                  {duesPage.hasMore ? <div ref={duesPage.sentinelRef} className="h-4" /> : null}
                </section>
              </div>
            ) : null}
            <section className={cn("min-w-0 space-y-4", activeHistory !== "ledger" && "hidden")}>
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="max-w-prose text-sm text-muted-foreground">
                    Audit log of settled sessions, split payments and match receipts.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-10 shrink-0 gap-1.5 rounded-xl border-felt/25 bg-felt/10 font-semibold text-felt shadow-sm hover:border-felt/40 hover:bg-felt/15 hover:text-felt"
                    onClick={() => {
                      const params = new URLSearchParams({
                        dateFrom: ledgerDateRange.from,
                        dateTo: ledgerDateRange.to,
                      });
                      window.location.assign(`/api/ledger/export?${params}`);
                    }}
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    <span className="hidden sm:inline">Export CSV</span>
                    <span className="sm:hidden">CSV</span>
                  </Button>
                </div>
                <DateRangeFilter
                  value={ledgerDateRange}
                  onChange={setLedgerDateRange}
                  label="Ledger date presets"
                />
                <div className="grid grid-cols-3 gap-2" aria-busy={historySummaryLoading}>
                  <Metric
                    icon={Banknote}
                    label="Paid total"
                    value={historySummary ? money(historySummary.ledger.paidAmount) : "—"}
                    detail="Selected range"
                  />
                  <Metric
                    icon={CircleDollarSign}
                    label="Unpaid total"
                    value={historySummary ? money(historySummary.ledger.unpaidAmount) : "—"}
                    detail="Selected range"
                  />
                  <Metric
                    icon={ReceiptText}
                    label="Sessions"
                    value={historySummary ? String(historySummary.ledger.sessionCount) : "—"}
                    detail="Selected range"
                  />
                </div>
                {historySummaryError ? (
                  <p role="alert" className="text-sm text-destructive">
                    {historySummaryError}
                  </p>
                ) : null}
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    value={ledgerSearch}
                    onChange={(event) => setLedgerSearch(event.target.value)}
                    placeholder="Search player, phone, table, or reference"
                    aria-label="Search ledger by player, phone, table, or booking reference"
                    className="min-h-11 pl-10"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2" aria-label="Ledger filters">
                  <label className="min-w-0 space-y-1">
                    <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      <CircleDollarSign className="h-3.5 w-3.5" aria-hidden="true" />
                      Payment
                    </span>
                    <Select
                      value={ledgerPaymentFilter}
                      onValueChange={(value) =>
                        setLedgerPaymentFilter(value as LedgerPaymentFilter)
                      }
                    >
                      <SelectTrigger
                        className="min-h-10 min-w-0 border-border bg-background/70 text-sm shadow-none"
                        aria-label="Filter ledger by payment status"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All statuses</SelectItem>
                        <SelectItem value="PAID">Paid</SelectItem>
                        <SelectItem value="UNPAID">Unpaid</SelectItem>
                      </SelectContent>
                    </Select>
                  </label>
                  <label className="min-w-0 space-y-1">
                    <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      <Table2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Table
                    </span>
                    <Select
                      value={ledgerTableFilter}
                      onValueChange={(value) => setLedgerTableFilter(value as LedgerTableFilter)}
                    >
                      <SelectTrigger
                        className="min-h-10 min-w-0 border-border bg-background/70 text-sm shadow-none"
                        aria-label="Filter ledger by table type"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All tables</SelectItem>
                        <SelectItem value="SNOOKER">Snooker</SelectItem>
                        <SelectItem value="POOL">Pool</SelectItem>
                      </SelectContent>
                    </Select>
                  </label>
                </div>
              </div>
              <div className="min-w-0 overflow-hidden">
                <div
                  ref={ledgerPage.scrollRootRef}
                  className="hidden max-h-[62vh] touch-pan-x touch-pan-y overflow-auto overscroll-contain lg:block"
                  aria-label="Scrollable ledger history"
                  aria-busy={ledgerPage.loading}
                >
                  <table className="min-w-[900px] text-left text-sm">
                    <thead className="sticky top-0 z-10 border-b border-border bg-background text-muted-foreground">
                      <tr>
                        {[
                          "Table",
                          "Players",
                          "Status",
                          "Start",
                          "End",
                          "Type",
                          "Payment",
                          "Amount",
                          "Actions",
                        ].map((heading) => (
                          <th key={heading} className="px-4 py-3 font-medium">
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {entries.length === 0 && ledgerPage.loading ? (
                        Array.from({ length: 4 }, (_, index) => (
                          <tr key={`ledger-skeleton-${index}`}>
                            {Array.from({ length: 9 }, (_, cell) => (
                              <td key={cell} className="px-4 py-3">
                                <Skeleton className="h-4 w-20" />
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : entries.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
                            No sessions match the selected filters or search.
                          </td>
                        </tr>
                      ) : (
                        entries.map((entry) => (
                          <tr key={entry.id} className="border-b border-border/80 last:border-0">
                            <td className="px-4 py-3 font-medium">{entry.tableName}</td>
                            <td className="px-4 py-3">
                              {entry.gameLabel ? (
                                <div className="text-xs font-medium text-felt">
                                  {entry.gameLabel}
                                </div>
                              ) : null}
                              {entry.players.map((player, index) => (
                                <div key={`${entry.id}-ledger-player-${index}`}>
                                  {player.team ? `Team ${player.team} · ` : ""}
                                  {player.name}
                                </div>
                              ))}
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className="border-felt/40 text-felt">
                                {entry.statusLabel}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <div>{entry.startDate}</div>
                              <div className="text-xs text-muted-foreground">{entry.startTime}</div>
                            </td>
                            <td className="px-4 py-3">{entry.endTime || "—"}</td>
                            <td className="px-4 py-3">
                              {entry.source === "ONLINE"
                                ? "Online"
                                : entry.source === "WALKIN"
                                  ? "Walk-in"
                                  : "Maintenance"}
                            </td>
                            <td className="px-4 py-3">
                              {entry.payment === "PAID"
                                ? `Paid · ${entry.paymentMethod}`
                                : "Unpaid"}
                            </td>
                            <td className="px-4 py-3">
                              <div>{money(entry.amount)}</div>
                              {entry.discountPercent > 0 ? (
                                <div className="text-xs text-muted-foreground">
                                  {entry.discountPercent}% off · {money(entry.discountAmount)}
                                </div>
                              ) : null}
                              {entry.settlementDiscountPercent > 0 ? (
                                <div className="text-xs text-muted-foreground">
                                  Settlement {entry.settlementDiscountPercent}% off ·{" "}
                                  {money(entry.settlementDiscountAmount)}
                                </div>
                              ) : null}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex justify-end gap-1">
                                {entry.source === "WALKIN" && entry.status === "live" ? (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => openEdit(entry)}
                                      aria-label="Edit ledger entry"
                                    >
                                      <PencilLine className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => openEntryCloseout(entry)}
                                      aria-label="Finish session"
                                    >
                                      <Square className="h-4 w-4" />
                                    </Button>
                                  </>
                                ) : null}
                                {entry.source === "ONLINE" && entry.status === "live" ? (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => openEntryCloseout(entry)}
                                    aria-label="Stop online booking"
                                  >
                                    <Square className="h-4 w-4" />
                                  </Button>
                                ) : null}
                                {entry.status === "booked" ? (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      ask(
                                        "Cancel this session?",
                                        "The table will be made available again.",
                                        async () => {
                                          await cancelSessionAction(entry.sessionId!);
                                          await refreshAfterMutation();
                                        },
                                      )
                                    }
                                    aria-label="Cancel session"
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                      {entries.length > 0 && ledgerPage.loading
                        ? Array.from({ length: 2 }, (_, index) => (
                            <tr key={`ledger-more-${index}`}>
                              {Array.from({ length: 9 }, (_, cell) => (
                                <td key={cell} className="px-4 py-3">
                                  <Skeleton className="h-4 w-20" />
                                </td>
                              ))}
                            </tr>
                          ))
                        : null}
                    </tbody>
                  </table>
                  {ledgerPage.error ? (
                    <p className="p-4 text-sm text-destructive">{ledgerPage.error}</p>
                  ) : null}
                  {ledgerPage.hasMore ? <div ref={ledgerPage.sentinelRef} className="h-4" /> : null}
                </div>
                <div className="space-y-3 lg:hidden">
                  {entries.length === 0 && ledgerPage.loading ? (
                    Array.from({ length: 3 }, (_, index) => (
                      <div key={index} className="space-y-3 rounded-xl border border-border p-4">
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-3 w-1/2" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ))
                  ) : entries.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                      No sessions match the selected filters or search.
                    </p>
                  ) : (
                    entries.map((entry) => (
                      <article
                        key={entry.id}
                        className="group min-w-0 overflow-hidden rounded-2xl border border-border/80 bg-surface p-4 shadow-[0_4px_18px_rgba(0,0,0,0.2)] transition-[border-color,box-shadow] hover:border-felt/40 hover:shadow-[0_8px_24px_rgba(0,0,0,0.26)] sm:p-5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-felt/10 text-felt">
                              <Table2 className="h-5 w-5" aria-hidden="true" />
                            </span>
                            <div className="min-w-0">
                              <p className="break-words text-base font-bold leading-snug [overflow-wrap:anywhere]">
                                {entry.payerName || entry.playerOne}
                              </p>
                              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                                  Table {entry.tableName}
                                  <span aria-hidden="true">·</span>
                                  {entry.source === "ONLINE"
                                    ? "Online"
                                    : entry.source === "WALKIN"
                                      ? "Walk-in"
                                      : "Maintenance"}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="shrink-0 rounded-xl bg-background/75 px-2.5 py-2 text-right">
                            <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                              Total
                            </p>
                            <p className="text-base font-bold text-felt">{money(entry.amount)}</p>
                            {entry.discountPercent > 0 ? (
                              <p className="text-xs text-muted-foreground">
                                {entry.discountPercent}% off
                              </p>
                            ) : null}
                            {entry.settlementDiscountPercent > 0 ? (
                              <p className="text-xs text-muted-foreground">
                                Settlement {entry.settlementDiscountPercent}% off
                              </p>
                            ) : null}
                          </div>
                        </div>
                        <div className="mt-4 flex items-center gap-2">
                          <UsersRound
                            className="h-4 w-4 shrink-0 text-muted-foreground"
                            aria-hidden="true"
                          />
                          <p className="break-words text-sm font-semibold [overflow-wrap:anywhere]">
                            {entry.gameLabel ||
                              gameFormatDescription(entry.gameFormat) ||
                              "Session players"}
                          </p>
                        </div>
                        {entry.players.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {entry.players.map((player, index) => (
                              <span
                                key={`${entry.id}-mobile-player-${index}`}
                                className="max-w-full break-words rounded-full bg-surface-strong px-2.5 py-1 text-xs text-foreground [overflow-wrap:anywhere]"
                              >
                                {player.team ? `Team ${player.team} · ` : ""}
                                {player.name}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {entry.payerShares.length > 0 ? (
                          <p className="mt-2 break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">
                            Shares:{" "}
                            {entry.payerShares
                              .map((share) => `${share.name} ${money(share.amount)}`)
                              .join(" · ")}
                          </p>
                        ) : null}
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-border bg-background/65 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                            {entry.statusLabel}
                          </span>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                              entry.payment === "PAID"
                                ? "bg-felt/10 text-felt"
                                : "bg-warning/10 text-warning",
                            )}
                          >
                            {entry.payment === "PAID" ? (
                              <Check className="h-3 w-3" aria-hidden="true" />
                            ) : (
                              <CircleDollarSign className="h-3 w-3" aria-hidden="true" />
                            )}
                            {entry.payment === "PAID" ? `Paid · ${entry.paymentMethod}` : "Unpaid"}
                          </span>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-background/65 p-3 text-xs text-muted-foreground">
                          <span className="inline-flex min-w-0 items-center gap-1.5">
                            <CalendarClock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            <span className="break-words">{entry.startDate}</span>
                          </span>
                          <span className="inline-flex items-center justify-end gap-1.5">
                            {entry.durationMinutes
                              ? `${entry.durationMinutes} min`
                              : "Duration pending"}
                          </span>
                          <span className="col-span-2 inline-flex min-w-0 items-center gap-1.5">
                            <Clock3 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            {entry.startTime}
                            {entry.endTime ? ` – ${entry.endTime}` : ""}
                          </span>
                        </div>
                        {entry.payment === "UNPAID" &&
                        entry.status === "completed" &&
                        entry.amount > 0 ? (
                          <Button
                            type="button"
                            className="mt-3 min-h-11 w-full rounded-xl"
                            onClick={() =>
                              setPaymentEntry({
                                sessionId: entry.sessionId!,
                                payerName: entry.payerName || entry.playerOne,
                                paymentMethod: "CASH",
                                applyDiscount: false,
                                discountPercent: "0",
                              })
                            }
                          >
                            <ReceiptText className="mr-1.5 h-4 w-4" aria-hidden="true" />
                            Record payment
                          </Button>
                        ) : null}
                      </article>
                    ))
                  )}
                  {ledgerPage.error ? (
                    <p role="alert" className="text-sm text-destructive">
                      {ledgerPage.error}
                    </p>
                  ) : null}
                  {ledgerPage.hasMore ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11 w-full"
                      loading={ledgerPage.loading}
                      loadingText="Loading…"
                      onClick={() => void ledgerPage.loadMore()}
                    >
                      Load more sessions
                    </Button>
                  ) : null}
                </div>
              </div>
            </section>
            <section className={cn("min-w-0 space-y-4", activeHistory !== "bookings" && "hidden")}>
              <div className="space-y-3">
                <div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Online booking requests and reservations.
                  </p>
                </div>
                <DateRangeFilter
                  value={bookingsDateRange}
                  onChange={setBookingsDateRange}
                  label="Bookings date presets"
                />
                <div className="grid grid-cols-3 gap-2" aria-busy={historySummaryLoading}>
                  <Metric
                    icon={CalendarClock}
                    label="Pending"
                    value={historySummary ? String(historySummary.bookings.pendingCount) : "—"}
                    detail="Selected range"
                  />
                  <Metric
                    icon={Check}
                    label="Confirmed / active"
                    value={historySummary ? String(historySummary.bookings.confirmedCount) : "—"}
                    detail="Selected range"
                  />
                  <Metric
                    icon={CalendarDays}
                    label="Bookings"
                    value={historySummary ? String(historySummary.bookings.totalCount) : "—"}
                    detail="Selected range"
                  />
                </div>
                {historySummaryError ? (
                  <p role="alert" className="text-sm text-destructive">
                    {historySummaryError}
                  </p>
                ) : null}
              </div>
              <div
                ref={bookingsPage.scrollRootRef}
                className="min-w-0 max-h-[70vh] space-y-3 overflow-y-auto overscroll-contain"
              >
                <p className="text-sm text-muted-foreground">
                  Pending, upcoming, in-progress, and past online bookings.
                </p>
                {bookings.length === 0 && bookingsPage.loading ? (
                  <div className="space-y-3" role="status" aria-label="Loading bookings">
                    {Array.from({ length: 3 }, (_, index) => (
                      <div key={index} className="space-y-3 rounded-lg border border-border p-4">
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-3 w-1/2" />
                        <Skeleton className="h-9 w-full rounded-md" />
                      </div>
                    ))}
                  </div>
                ) : bookings.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
                    No online booking requests.
                  </div>
                ) : (
                  bookings.map((booking) => (
                    <article
                      key={booking.id}
                      className="group min-w-0 overflow-hidden rounded-2xl border border-border/80 bg-surface p-4 shadow-[0_4px_18px_rgba(0,0,0,0.2)] transition-[border-color,box-shadow] hover:border-felt/40 hover:shadow-[0_8px_24px_rgba(0,0,0,0.26)] sm:p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-felt/10 text-felt">
                            <CalendarClock className="h-5 w-5" aria-hidden="true" />
                          </span>
                          <div className="min-w-0">
                            <p className="break-words font-bold leading-snug [overflow-wrap:anywhere]">
                              {booking.customerName}
                            </p>
                            <p className="mt-1 flex items-center gap-1.5 break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">
                              <Table2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                              {booking.table?.shortName ?? booking.tableId}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "shrink-0 rounded-full",
                            booking.status === "CONFIRMED" || booking.status === "ONGOING"
                              ? "border-felt/40 bg-felt/10 text-felt"
                              : booking.status === "HELD"
                                ? "border-warning/40 bg-warning/10 text-warning"
                                : "",
                          )}
                        >
                          {booking.status}
                        </Badge>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-background/65 p-3">
                        <div className="col-span-2 flex min-w-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
                          <CalendarDays
                            className="h-3.5 w-3.5 shrink-0 text-felt"
                            aria-hidden="true"
                          />
                          <span className="break-words">{booking.slotStartDate}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock3 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          {time(booking.slotStart)}–{time(booking.slotEnd)}
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          Reserved charge{" "}
                          <span className="font-semibold text-foreground">
                            {money(booking.amount)}
                          </span>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {booking.status === "HELD" ? (
                          <Button
                            size="sm"
                            className="min-h-10 gap-1.5 rounded-xl"
                            onClick={() =>
                              ask(
                                "Confirm this booking?",
                                "The booking will remain reserved for the customer.",
                                async () => {
                                  await updateBookingStatusAction(booking.id, "CONFIRMED");
                                  await refreshAfterMutation();
                                },
                              )
                            }
                          >
                            <Check className="h-4 w-4" aria-hidden="true" />
                            Confirm
                          </Button>
                        ) : null}
                        {booking.status === "CONFIRMED" || booking.status === "ONGOING" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="min-h-10 gap-1.5 rounded-xl"
                            onClick={() =>
                              ask(
                                "Mark this booking as no-show?",
                                "Use this only when the customer did not arrive for the approved booking.",
                                async () => {
                                  await updateBookingStatusAction(booking.id, "NO_SHOW");
                                  await refreshAfterMutation();
                                },
                              )
                            }
                          >
                            <UserRound className="h-4 w-4" aria-hidden="true" />
                            No-show
                          </Button>
                        ) : null}
                        {booking.status === "HELD" || booking.status === "CONFIRMED" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="min-h-10 gap-1.5 rounded-xl"
                            onClick={() =>
                              ask(
                                "Cancel this booking?",
                                "The table will become available for this time range.",
                                async () => {
                                  await updateBookingStatusAction(booking.id, "CANCELLED");
                                  await refreshAfterMutation();
                                },
                              )
                            }
                          >
                            <X className="mr-1 h-4 w-4" /> Cancel
                          </Button>
                        ) : null}
                        {booking.paymentStatus === "UNPAID" &&
                        booking.amount > 0 &&
                        booking.status === "COMPLETED" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="min-h-10 gap-1.5 rounded-xl border-felt/25 bg-felt/10 font-semibold text-felt shadow-sm hover:border-felt/40 hover:bg-felt/15 hover:text-felt"
                            onClick={() =>
                              setPaymentEntry({
                                sessionId: booking.id,
                                payerName: booking.customerName,
                                paymentMethod: "CASH",
                                applyDiscount: false,
                                discountPercent: "0",
                              })
                            }
                          >
                            <ReceiptText className="h-4 w-4" aria-hidden="true" />
                            Record payment
                          </Button>
                        ) : null}
                      </div>
                    </article>
                  ))
                )}
                {bookings.length > 0 && bookingsPage.loading ? (
                  <div className="space-y-3" role="status" aria-label="Loading more bookings">
                    {Array.from({ length: 2 }, (_, index) => (
                      <div key={index} className="space-y-3 rounded-lg border border-border p-4">
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    ))}
                  </div>
                ) : null}
                {bookingsPage.error ? (
                  <p className="text-sm text-destructive">{bookingsPage.error}</p>
                ) : null}
                {bookingsPage.hasMore ? (
                  <div ref={bookingsPage.sentinelRef} className="h-4" />
                ) : null}
              </div>
            </section>
          </div>
        </main>
        <nav
          aria-label="Supervisor navigation"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/95 px-2 pt-1.5 pb-[calc(env(safe-area-inset-bottom)+0.375rem)] shadow-[0_-8px_30px_rgba(0,0,0,0.28)] backdrop-blur-xl lg:hidden"
        >
          <div className={cn("mx-auto grid max-w-md gap-1", "grid-cols-5")}>
            {(
              [
                { view: "tables", label: "Tables", icon: Table2 },
                { view: "unpaid", label: "Unpaid", icon: ReceiptText },
                { view: "ledger", label: "Ledger", icon: FileText },
                { view: "bookings", label: "Bookings", icon: CalendarDays },
                { view: "players", label: "Players", icon: UserRound },
              ] as const
            ).map(({ view, label, icon: Icon }) => {
              const selected = activeHistory === view;
              return (
                <button
                  key={view}
                  type="button"
                  aria-label={label}
                  aria-current={selected ? "page" : undefined}
                  onClick={() => setActiveHistory(view)}
                  className={cn(
                    "relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-semibold transition-colors",
                    selected
                      ? "text-felt"
                      : "text-muted-foreground hover:bg-surface/80 hover:text-foreground",
                  )}
                >
                  <span className="relative">
                    <Icon
                      className={cn("h-5 w-5", selected && "stroke-[2.5]")}
                      aria-hidden="true"
                    />
                    {view === "unpaid" && summary.unpaidCount > 0 ? (
                      <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold leading-none text-destructive-foreground">
                        {summary.unpaidCount}
                      </span>
                    ) : null}
                  </span>
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </nav>
        <AlertDialog
          open={Boolean(confirm)}
          onOpenChange={(open) => {
            if (!open && !isConfirming) setConfirm(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
              <AlertDialogDescription>{confirm?.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isConfirming}>Go back</AlertDialogCancel>
              <AlertDialogAction
                loading={isConfirming}
                loadingText="Working…"
                onClick={(event) => {
                  event.preventDefault();
                  void runConfirmed();
                }}
              >
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <AlertDialog
          open={Boolean(endSession)}
          onOpenChange={(open) => {
            if (!open && !isEndingSession) setEndSession(null);
          }}
        >
          <AlertDialogContent className="flex max-h-[92dvh] w-[calc(100%-1rem)] max-w-lg flex-col gap-0 overflow-hidden rounded-3xl border-border/80 p-0 shadow-2xl">
            <AlertDialogHeader className="shrink-0 border-b border-border/80 p-4 pr-12 text-left sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <AlertDialogTitle className="truncate text-base sm:text-lg">
                    {closingTable?.name ?? "Table"} ·{" "}
                    {closingSession?.source === "WALKIN"
                      ? closingSession.gameLabel ||
                        gameFormatDescription(closingSession.gameFormat) ||
                        "Walk-in"
                      : closingSession?.source === "ONLINE"
                        ? "Online booking"
                        : "Close session"}
                  </AlertDialogTitle>
                  <AlertDialogDescription className="mt-1">
                    {closingMinutes} min · {time(closingStartedAt ?? null)}–
                    {time(new Date(currentTime))}
                    {closingTable
                      ? ` · ${closingTable.type === "SNOOKER" ? "Snooker" : "Pool"}`
                      : ""}
                  </AlertDialogDescription>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Total due
                  </p>
                  <p className="text-2xl font-bold text-felt">{money(closingAmount)}</p>
                </div>
              </div>
            </AlertDialogHeader>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-5">
              <section className="space-y-3 rounded-2xl border border-border/80 bg-surface/70 p-3 sm:p-4">
                <div className="flex items-center justify-between gap-3">
                  <DiscountToggle
                    id="closeout-discount-toggle"
                    checked={Boolean(endSession?.applyDiscount)}
                    onCheckedChange={(checked) =>
                      setEndSession((current) =>
                        current ? { ...current, applyDiscount: checked } : current,
                      )
                    }
                    label="Apply supervisor discount"
                  />
                  <span className="shrink-0 text-right text-sm">
                    {closingDiscountAmount > 0 ? (
                      <>
                        <span className="text-muted-foreground line-through">
                          {money(closingGrossAmount)}
                        </span>
                        <strong className="ml-2 text-felt">{money(closingAmount)}</strong>
                      </>
                    ) : (
                      <strong className="text-felt">{money(closingGrossAmount)}</strong>
                    )}
                  </span>
                </div>
                {endSession?.applyDiscount ? (
                  <>
                    <div
                      className="flex flex-wrap gap-2"
                      role="group"
                      aria-label="Discount presets"
                    >
                      {[
                        { label: "15% off", value: "15" },
                        { label: "25% off", value: "25" },
                        { label: "Waive 100%", value: "100" },
                      ].map((preset) => (
                        <button
                          key={preset.value}
                          type="button"
                          aria-pressed={endSession.discountPercent === preset.value}
                          onClick={() =>
                            setEndSession((current) =>
                              current ? { ...current, discountPercent: preset.value } : current,
                            )
                          }
                          className={cn(
                            "min-h-9 rounded-xl border px-3 text-xs font-semibold transition-colors",
                            endSession.discountPercent === preset.value
                              ? "border-felt/60 bg-felt text-primary-foreground"
                              : "border-border bg-background/70 text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-[minmax(0,8rem)_1fr] items-center gap-3">
                      <Field
                        id="session-discount"
                        label="Discount (%)"
                        error={closingDiscountError}
                      >
                        <Input
                          id="session-discount"
                          type="number"
                          inputMode="decimal"
                          min="0"
                          max="100"
                          step="0.01"
                          className="min-h-10 text-right"
                          value={endSession.discountPercent}
                          onChange={(event) =>
                            setEndSession((current) =>
                              current
                                ? { ...current, discountPercent: event.target.value }
                                : current,
                            )
                          }
                          {...fieldA11yProps("session-discount", closingDiscountError)}
                        />
                      </Field>
                      <p className="min-w-0 rounded-lg bg-background/75 px-3 py-2 text-right text-xs text-muted-foreground">
                        {money(closingGrossAmount)} − {money(closingDiscountAmount)} ={" "}
                        <strong className="text-felt">{money(closingAmount)}</strong>
                      </p>
                    </div>
                  </>
                ) : null}
                <p className="text-[11px] text-muted-foreground">
                  Billed at {money(closingRate)}/hr for completed minutes only.
                </p>
              </section>

              <section className="space-y-2.5">
                <div className="space-y-2.5">
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                      Who is paying?
                    </Label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Select one payer or split the bill across players.
                    </p>
                  </div>
                  {endSession?.gameFormat === "DOUBLES" ? (
                    <div className="space-y-2 rounded-2xl border border-felt/20 bg-felt/5 p-3">
                      <div>
                        <p className="text-xs font-semibold text-foreground">Which team lost?</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          Choose a team to select both players as payers.
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {(["A", "B"] as const).map((team) => {
                          const teamPlayers = endSession.players.filter(
                            (player) => player.team === team,
                          );
                          const selected = endSession.payerTeam === team;
                          return (
                            <button
                              key={team}
                              type="button"
                              aria-pressed={selected}
                              aria-label={`Team ${team} lost; select its players as payers`}
                              disabled={teamPlayers.length !== 2}
                              onClick={() => selectPayerTeam(team)}
                              className={cn(
                                "flex min-h-14 flex-col items-start justify-center rounded-xl border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                                selected
                                  ? "border-felt/60 bg-felt/10 text-felt"
                                  : "border-border bg-background/70 text-foreground hover:border-felt/40",
                              )}
                            >
                              <span className="text-sm font-semibold">Team {team}</span>
                              <span className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground">
                                {teamPlayers.length === 2
                                  ? teamPlayers.map((player) => player.name).join(" · ")
                                  : "Team assignment unavailable"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    <button
                      type="button"
                      aria-pressed={
                        Boolean(endSession?.playerNames.length) &&
                        endSession?.payerNames.length === endSession?.playerNames.length
                      }
                      onClick={() =>
                        setEndSession((current) =>
                          current
                            ? {
                                ...current,
                                payerTeam: null,
                                payerNames: [...current.playerNames],
                              }
                            : current,
                        )
                      }
                      className={cn(
                        "min-h-9 shrink-0 rounded-full border px-3 text-xs font-semibold",
                        endSession?.payerNames.length === endSession?.playerNames.length &&
                          Boolean(endSession?.playerNames.length)
                          ? "border-felt/50 bg-felt/10 text-felt"
                          : "border-border bg-background/60 text-muted-foreground",
                      )}
                    >
                      Split evenly
                    </button>
                    <button
                      type="button"
                      aria-pressed={endSession?.payerNames.length === 1}
                      onClick={() =>
                        setEndSession((current) =>
                          current
                            ? {
                                ...current,
                                payerTeam: null,
                                payerNames: current.playerNames.slice(0, 1),
                              }
                            : current,
                        )
                      }
                      className={cn(
                        "min-h-9 shrink-0 rounded-full border px-3 text-xs font-semibold",
                        endSession?.payerNames.length === 1
                          ? "border-felt/50 bg-felt/10 text-felt"
                          : "border-border bg-background/60 text-muted-foreground",
                      )}
                    >
                      Single payer
                    </button>
                  </div>
                  {endSession?.payerNames.length === 0 && closingAmount > 0 ? (
                    <p className="text-xs text-muted-foreground" role="status">
                      {endSession.gameFormat === "DOUBLES"
                        ? "Select the losing team or choose individual payers below."
                        : "Select at least one payer to close this session."}
                    </p>
                  ) : null}
                </div>
                <div className="overflow-hidden rounded-2xl border border-border/80 bg-background/50">
                  {endSession?.playerNames.map((name, index) => {
                    const selected = endSession.payerNames.includes(name);
                    const share = closingPayerShares.find((item) => item.name === name);
                    const player = endSession.players[index];
                    const teamPosition = player?.team
                      ? endSession.players
                          .slice(0, index + 1)
                          .filter((candidate) => candidate.team === player.team).length
                      : index + 1;
                    return (
                      <div
                        key={name}
                        className={cn(
                          "flex min-h-14 items-center justify-between gap-3 px-3 py-2.5 transition-colors",
                          index > 0 && "border-t border-border/70",
                          selected && "bg-felt/5",
                        )}
                      >
                        <span className="flex min-w-0 items-center gap-2.5">
                          <span
                            className={cn(
                              "flex h-8 min-w-8 items-center justify-center rounded-lg px-1 text-[10px] font-bold",
                              selected
                                ? "bg-felt/15 text-felt"
                                : "bg-surface-strong text-muted-foreground",
                            )}
                          >
                            {player?.team ? `${player.team}${teamPosition}` : `P${index + 1}`}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">{name}</span>
                            {player?.team ? (
                              <span className="block text-[10px] text-muted-foreground">
                                Team {player.team}
                              </span>
                            ) : null}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2.5">
                          <span className={cn("text-sm font-semibold", selected && "text-felt")}>
                            {share ? money(share.amount) : money(0)}
                          </span>
                          <Checkbox
                            id={`payer-${endSession?.sessionId}-${index}`}
                            checked={selected}
                            onCheckedChange={() =>
                              setEndSession((current) => {
                                if (!current) return current;
                                const payerNames = current.payerNames.includes(name)
                                  ? current.payerNames.filter((payer) => payer !== name)
                                  : [...current.payerNames, name];
                                return { ...current, payerNames, payerTeam: null };
                              })
                            }
                            aria-label={`${selected ? "Remove" : "Add"} ${name} as payer`}
                            className="h-5 w-5 rounded-md border-border bg-background shadow-none focus-visible:ring-2 focus-visible:ring-felt focus-visible:ring-offset-2 data-[state=checked]:border-felt data-[state=checked]:bg-felt data-[state=checked]:text-primary-foreground"
                          />
                        </span>
                      </div>
                    );
                  })}
                  {endSession?.playerNames.length === 0 ? (
                    <p className="p-3 text-sm text-destructive">No payer names are available.</p>
                  ) : null}
                </div>
              </section>

              {closingAmount === 0 ? (
                <p className="rounded-xl border border-felt/25 bg-felt/10 p-3 text-sm text-felt">
                  No payment is due. This session will be settled automatically.
                </p>
              ) : (
                <section className="space-y-2.5">
                  <div className="flex items-end justify-between gap-3">
                    <Label className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                      Settlement mode
                    </Label>
                    <span className="text-xs font-medium text-felt">
                      {endSession?.paymentMethod === "CASH"
                        ? "Cash"
                        : endSession?.paymentMethod === "UPI"
                          ? "UPI"
                          : endSession?.paymentMethod === "CARD"
                            ? "Card"
                            : "Add to dues"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: "UNPAID", label: "Add to dues", icon: ReceiptText },
                      { value: "UPI", label: "UPI", icon: Smartphone },
                      { value: "CASH", label: "Cash", icon: Banknote },
                    ].map((method) => {
                      const selected = (endSession?.paymentMethod ?? "UNPAID") === method.value;
                      const MethodIcon = method.icon;
                      return (
                        <button
                          key={method.value}
                          type="button"
                          aria-pressed={selected}
                          onClick={() =>
                            setEndSession((current) =>
                              current
                                ? {
                                    ...current,
                                    paymentMethod:
                                      method.value === "UNPAID"
                                        ? null
                                        : (method.value as "CASH" | "UPI" | "CARD"),
                                  }
                                : current,
                            )
                          }
                          className={cn(
                            "flex min-h-16 flex-col items-center justify-center rounded-xl border px-2 py-2 text-center transition-colors",
                            selected
                              ? "border-felt/50 bg-felt/10 text-felt"
                              : "border-border bg-background/60 text-muted-foreground hover:text-foreground",
                          )}
                        >
                          <MethodIcon className="mb-1.5 h-4 w-4" aria-hidden="true" />
                          <span className="text-xs font-semibold">{method.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>
            <AlertDialogFooter className="shrink-0 flex-col gap-2 border-t border-border/80 bg-background p-3 sm:flex-col sm:space-x-0 sm:p-4">
              <AlertDialogAction
                className="min-h-12 w-full gap-2 rounded-xl text-sm font-bold"
                loading={isEndingSession}
                loadingText="Closing session…"
                disabled={
                  (closingAmount > 0 && !endSession?.payerNames.length) ||
                  closingDiscountBasisPoints === null
                }
                onClick={(event) => {
                  event.preventDefault();
                  if (
                    (closingAmount > 0 && !endSession?.payerNames.length) ||
                    closingDiscountBasisPoints === null
                  )
                    return;
                  void closeCurrentSession();
                }}
              >
                <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                {closingAmount === 0
                  ? "Stop clock & close table"
                  : endSession?.paymentMethod
                    ? `Stop clock & record ${endSession.paymentMethod.toLowerCase()}`
                    : "Stop clock & add to dues"}
                {closingAmount > 0 ? ` · ${money(closingAmount)}` : ""}
              </AlertDialogAction>
              <AlertDialogCancel
                className="min-h-9 w-full border-0 bg-transparent text-muted-foreground shadow-none hover:bg-surface"
                disabled={isEndingSession}
              >
                Keep playing
              </AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <AlertDialog
          open={Boolean(paymentEntry)}
          onOpenChange={(open) => {
            if (!open && !isRecordingPayment) setPaymentEntry(null);
          }}
        >
          <AlertDialogContent className="flex max-h-[92dvh] w-[calc(100%-1rem)] max-w-lg flex-col gap-0 overflow-hidden rounded-3xl border-border/80 p-0 shadow-2xl">
            <AlertDialogHeader className="shrink-0 border-b border-border/80 bg-surface/35 p-4 pr-12 text-left sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-felt/10 text-felt">
                    <ReceiptText className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <AlertDialogTitle className="text-base sm:text-lg">
                      Record payment
                    </AlertDialogTitle>
                    <AlertDialogDescription className="mt-1 break-words">
                      {paymentEntryDetails && "tableName" in paymentEntryDetails
                        ? `Table ${paymentEntryDetails.tableName} · ${paymentEntryDetails.startTime}${paymentEntryDetails.endTime ? `–${paymentEntryDetails.endTime}` : ""}`
                        : paymentEntryDetails && "table" in paymentEntryDetails
                          ? `Table ${paymentEntryDetails.table?.shortName ?? "—"} · ${time(paymentEntryDetails.slotStart)}–${time(paymentEntryDetails.slotEnd)}`
                          : "Settle the outstanding table balance."}
                    </AlertDialogDescription>
                  </div>
                </div>
                <div className="shrink-0 rounded-xl bg-background/80 px-3 py-2 text-right">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    Due
                  </p>
                  <p className="text-xl font-bold leading-tight text-felt">
                    {money(settlementNetAmount)}
                  </p>
                </div>
              </div>
              {paymentEntryDetails && "players" in paymentEntryDetails ? (
                <p className="mt-2 flex items-start gap-2 break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">
                  <UsersRound className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>
                    {paymentEntryDetails.gameLabel ||
                      gameFormatDescription(paymentEntryDetails.gameFormat) ||
                      paymentEntryDetails.source}
                    {" · "}
                    {paymentEntryDetails.players.map((player) => player.name).join(" · ")}
                  </span>
                </p>
              ) : paymentEntryDetails && "customerName" in paymentEntryDetails ? (
                <p className="mt-2 flex items-start gap-2 break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">
                  <UserRound className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{paymentEntryDetails.customerName}</span>
                </p>
              ) : null}
            </AlertDialogHeader>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-5">
              {paymentEntryDetails ? (
                <section className="space-y-3 rounded-2xl border border-border/80 bg-surface/55 p-3 sm:p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    <CircleDollarSign className="h-4 w-4 text-felt" aria-hidden="true" />
                    Balance adjustment
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    {settlementDiscountAllowed ? (
                      <DiscountToggle
                        id="settlement-discount-toggle"
                        checked={Boolean(paymentEntry?.applyDiscount)}
                        onCheckedChange={(checked) =>
                          setPaymentEntry((current) =>
                            current ? { ...current, applyDiscount: checked } : current,
                          )
                        }
                        label="Apply supervisor discount"
                      />
                    ) : (
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">Closeout discount applied</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {paymentEntryCloseoutDiscount}% discount is already included.
                        </p>
                      </div>
                    )}
                    <span className="shrink-0 text-right text-sm">
                      {settlementDiscountAmount > 0 ? (
                        <>
                          <span className="text-muted-foreground line-through">
                            {money(settlementGrossAmount)}
                          </span>
                          <strong className="ml-2 text-felt">{money(settlementNetAmount)}</strong>
                        </>
                      ) : (
                        <strong className="text-felt">{money(settlementGrossAmount)}</strong>
                      )}
                    </span>
                  </div>
                  {paymentEntry?.applyDiscount && settlementDiscountAllowed ? (
                    <>
                      <div
                        className="flex flex-wrap gap-2"
                        role="group"
                        aria-label="Discount presets"
                      >
                        {[
                          { label: "15% off", value: "15" },
                          { label: "25% off", value: "25" },
                          { label: "Waive 100%", value: "100" },
                        ].map((preset) => (
                          <button
                            key={preset.value}
                            type="button"
                            aria-pressed={paymentEntry.discountPercent === preset.value}
                            onClick={() =>
                              setPaymentEntry((current) =>
                                current ? { ...current, discountPercent: preset.value } : current,
                              )
                            }
                            className={cn(
                              "min-h-9 rounded-xl border px-3 text-xs font-semibold transition-colors",
                              paymentEntry.discountPercent === preset.value
                                ? "border-felt/60 bg-felt text-primary-foreground"
                                : "border-border bg-background/70 text-muted-foreground hover:text-foreground",
                            )}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-[minmax(0,8rem)_1fr] items-center gap-3">
                        <Field
                          id="settlement-discount"
                          label="Discount (%)"
                          error={settlementDiscountError}
                        >
                          <Input
                            id="settlement-discount"
                            type="number"
                            inputMode="decimal"
                            min="0"
                            max="100"
                            step="0.01"
                            className="min-h-10 text-right"
                            value={paymentEntry.discountPercent}
                            onChange={(event) =>
                              setPaymentEntry((current) =>
                                current
                                  ? { ...current, discountPercent: event.target.value }
                                  : current,
                              )
                            }
                            {...fieldA11yProps("settlement-discount", settlementDiscountError)}
                          />
                        </Field>
                        <p className="min-w-0 rounded-lg bg-background/75 px-3 py-2 text-right text-xs text-muted-foreground">
                          {money(settlementGrossAmount)} − {money(settlementDiscountAmount)} ={" "}
                          <strong className="text-felt">{money(settlementNetAmount)}</strong>
                        </p>
                      </div>
                    </>
                  ) : null}
                </section>
              ) : null}
              <Field
                id="settlement-payer"
                label={
                  <span className="inline-flex items-center gap-1.5">
                    <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
                    Paid by
                  </span>
                }
                required
              >
                <Input
                  id="settlement-payer"
                  autoComplete="name"
                  maxLength={120}
                  placeholder="Enter payer name"
                  value={paymentEntry?.payerName ?? ""}
                  required
                  onChange={(event) =>
                    setPaymentEntry((current) =>
                      current ? { ...current, payerName: event.target.value } : current,
                    )
                  }
                />
              </Field>
              <section className="space-y-2.5">
                <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  <CreditCard className="h-3.5 w-3.5" aria-hidden="true" />
                  Payment method
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { value: "CASH", label: "Cash", icon: Banknote },
                      { value: "UPI", label: "UPI", icon: Smartphone },
                      { value: "CARD", label: "Card", icon: CreditCard },
                    ] as const
                  ).map((method) => {
                    const MethodIcon = method.icon;
                    const selected = paymentEntry?.paymentMethod === method.value;
                    return (
                      <button
                        key={method.value}
                        type="button"
                        aria-pressed={selected}
                        onClick={() =>
                          setPaymentEntry((current) =>
                            current ? { ...current, paymentMethod: method.value } : current,
                          )
                        }
                        className={cn(
                          "relative flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-xl border text-xs font-semibold transition-colors",
                          selected
                            ? "border-felt/50 bg-felt/10 text-felt"
                            : "border-border bg-background/60 text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <MethodIcon className="h-4 w-4" aria-hidden="true" />
                        <span>{method.label}</span>
                        {selected ? (
                          <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-felt text-primary-foreground">
                            <Check className="h-3 w-3" aria-hidden="true" />
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>
            <AlertDialogFooter className="shrink-0 flex-col gap-2 border-t border-border/80 bg-background p-3 sm:flex-col sm:space-x-0 sm:p-4">
              <AlertDialogAction
                className="min-h-12 w-full gap-2 rounded-xl text-sm font-bold"
                loading={isRecordingPayment}
                loadingText="Recording payment…"
                disabled={
                  !paymentEntry?.paymentMethod ||
                  settlementDiscountBasisPoints === null ||
                  (!settlementDiscountAllowed && settlementDiscountBasisPoints > 0)
                }
                onClick={(event) => {
                  event.preventDefault();
                  if (!paymentEntry?.payerName.trim()) {
                    setError("Enter the name of the person who paid.");
                    return;
                  }
                  if (settlementDiscountBasisPoints === null) return;
                  if (!settlementDiscountAllowed && settlementDiscountBasisPoints > 0) return;
                  void recordCurrentPayment();
                }}
              >
                <ReceiptText className="h-4 w-4" aria-hidden="true" />
                Record {paymentEntry?.paymentMethod?.toLowerCase() ?? "payment"} ·{" "}
                {money(settlementNetAmount)}
              </AlertDialogAction>
              <AlertDialogCancel
                className="min-h-9 w-full border-0 bg-transparent text-muted-foreground shadow-none hover:bg-surface"
                disabled={isRecordingPayment}
              >
                Cancel
              </AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    </RoleGate>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <Card className="border-border/80 bg-surface shadow-[0_4px_18px_rgba(0,0,0,0.18)]">
      <CardContent className="p-2.5 sm:p-4">
        <Icon className="h-3.5 w-3.5 text-felt" aria-hidden="true" />
        <p className="mt-1.5 truncate text-[9px] uppercase tracking-[0.05em] text-muted-foreground sm:mt-2 sm:text-xs sm:tracking-[0.1em]">
          {label}
        </p>
        <p className="mt-0.5 truncate text-base font-bold text-felt sm:text-xl">{value}</p>
        {detail ? (
          <p className="truncate text-[9px] text-muted-foreground sm:text-[10px]">{detail}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
