"use server";

import {
  PaymentMethod,
  PlayerDiscipline,
  PlayerSkillTier,
  Prisma,
  SessionGameFormat,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeIndianMobile } from "@/lib/form-validation";
import { requireAcademyRole } from "@/lib/supabase-auth-server";
import { allocatePaymentOldestFirst, outstandingAmount } from "@/lib/player-ledger";

const MAX_PLAYER_ACCOUNTS = 150;

type PlayerProfileInput = {
  fullName: string;
  nickname: string;
  phone: string;
  primaryDiscipline: PlayerDiscipline;
  preferredFormat: SessionGameFormat | null;
  skillTier: PlayerSkillTier;
  tabEnabled: boolean;
  creditLimit: number;
  isActive?: boolean;
};

function validateProfileInput(input: PlayerProfileInput) {
  if (!input || typeof input !== "object") throw new Error("Player details are required.");
  const fullName = typeof input.fullName === "string" ? input.fullName.trim() : "";
  const nickname = typeof input.nickname === "string" ? input.nickname.trim() : "";
  if (!fullName || fullName.length > 120) {
    throw new Error("Full name is required and must be 120 characters or fewer.");
  }
  if (nickname.length > 60) throw new Error("Nickname must be 60 characters or fewer.");
  const phone = normalizeIndianMobile(input.phone);
  if (!Object.values(PlayerDiscipline).includes(input.primaryDiscipline)) {
    throw new Error("Choose a valid primary discipline.");
  }
  if (
    input.preferredFormat !== null &&
    !Object.values(SessionGameFormat).includes(input.preferredFormat)
  ) {
    throw new Error("Choose a valid preferred match format.");
  }
  if (!Object.values(PlayerSkillTier).includes(input.skillTier)) {
    throw new Error("Choose a valid skill tier.");
  }
  if (typeof input.tabEnabled !== "boolean") throw new Error("Choose a valid tab policy.");
  if (
    !Number.isSafeInteger(input.creditLimit) ||
    input.creditLimit < 0 ||
    input.creditLimit > 999_999_999
  ) {
    throw new Error("Credit limit must be a whole-rupee amount between ₹0 and ₹999,999,999.");
  }
  if (input.isActive !== undefined && typeof input.isActive !== "boolean") {
    throw new Error("Choose a valid account status.");
  }
  return {
    fullName,
    nickname: nickname || null,
    phone,
    primaryDiscipline: input.primaryDiscipline,
    preferredFormat: input.preferredFormat,
    skillTier: input.skillTier,
    tabEnabled: input.tabEnabled,
    creditLimit: input.creditLimit,
    ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
  };
}

function isUniquePhoneError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function isMissingTableError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && ["P2021", "P2022"].includes(error.code)
  );
}

export async function getPlayerDirectoryAction(
  input: {
    search?: string;
    filter?: "ALL" | "HAS_DUES" | "OVER_LIMIT" | "INACTIVE";
  } = {},
) {
  await requireAcademyRole("supervisor");
  const search = input.search?.trim() ?? "";
  const filter = input.filter ?? "ALL";
  if (search.length > 100) throw new Error("Player search must be 100 characters or fewer.");
  if (!["ALL", "HAS_DUES", "OVER_LIMIT", "INACTIVE"].includes(filter)) {
    throw new Error("Choose a valid player filter.");
  }

  try {
    const where: Prisma.PlayerProfileWhereInput = {
      isActive: filter === "INACTIVE" ? false : true,
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: "insensitive" } },
              { nickname: { contains: search, mode: "insensitive" } },
              ...(search.replace(/\D/g, "")
                ? [{ phone: { contains: search.replace(/\D/g, ""), mode: "insensitive" as const } }]
                : []),
            ],
          }
        : {}),
    };
    const profiles = await prisma.playerProfile.findMany({
      where,
      orderBy: [{ fullName: "asc" }, { id: "asc" }],
      take: MAX_PLAYER_ACCOUNTS,
    });
    const profileIds = profiles.map((profile) => profile.id);
    const balances = profileIds.length
      ? await prisma.$queryRaw<{ playerProfileId: string; balance: number }[]>(Prisma.sql`
          SELECT
            due.player_profile_id AS "playerProfileId",
            COALESCE(SUM(due.amount - COALESCE(paid.total_paid, 0)), 0)::int AS balance
          FROM session_dues AS due
          LEFT JOIN (
            SELECT due_id, SUM(amount) AS total_paid
            FROM session_due_payments
            GROUP BY due_id
          ) AS paid ON paid.due_id = due.id
          WHERE due.player_profile_id IN (${Prisma.join(profileIds)})
          GROUP BY due.player_profile_id
        `)
      : [];
    const totals = new Map(balances.map((balance) => [balance.playerProfileId, balance]));
    const entries = profiles.map((profile) => {
      const balance = totals.get(profile.id);
      return {
        ...profile,
        outstandingAmount: balance?.balance ?? 0,
        availableTabAmount: profile.tabEnabled
          ? Math.max(0, profile.creditLimit - (balance?.balance ?? 0))
          : null,
      };
    });
    const filtered = entries.filter((profile) => {
      if (filter === "HAS_DUES") return profile.outstandingAmount > 0;
      if (filter === "OVER_LIMIT") return profile.outstandingAmount > profile.creditLimit;
      return true;
    });
    return {
      players: filtered,
      summary: {
        playerCount: entries.length,
        playersWithDues: entries.filter((profile) => profile.outstandingAmount > 0).length,
        totalOutstanding: entries.reduce((total, profile) => total + profile.outstandingAmount, 0),
      },
      hasMore: profiles.length === MAX_PLAYER_ACCOUNTS,
    };
  } catch (error) {
    if (isMissingTableError(error)) {
      throw new Error(
        "Player records are unavailable because migration 0010 has not been applied to this database. Back up and validate against staging before applying it to the shared production database.",
      );
    }
    throw error;
  }
}

export async function searchActivePlayersAction(search: string) {
  await requireAcademyRole("supervisor");
  const query = search.trim();
  if (query.length > 100) throw new Error("Player search must be 100 characters or fewer.");
  if (!query) return [];
  return prisma.playerProfile.findMany({
    where: {
      isActive: true,
      OR: [
        { fullName: { contains: query, mode: "insensitive" } },
        { nickname: { contains: query, mode: "insensitive" } },
        ...(query.replace(/\D/g, "")
          ? [{ phone: { contains: query.replace(/\D/g, ""), mode: "insensitive" as const } }]
          : []),
      ],
    },
    orderBy: [{ fullName: "asc" }, { id: "asc" }],
    take: 15,
    select: {
      id: true,
      fullName: true,
      nickname: true,
      phone: true,
      tabEnabled: true,
      creditLimit: true,
    },
  });
}

export async function createPlayerProfileAction(input: PlayerProfileInput) {
  await requireAcademyRole("supervisor");
  const data = validateProfileInput(input);
  try {
    return await prisma.playerProfile.create({ data });
  } catch (error) {
    if (isUniquePhoneError(error)) {
      throw new Error("This mobile number is already registered to a player.");
    }
    if (isMissingTableError(error)) {
      throw new Error(
        "Player registration is unavailable because migration 0010 has not been applied to this database. Back up and validate against staging before applying it to the shared production database.",
      );
    }
    throw error;
  }
}

export async function updatePlayerProfileAction(playerId: string, input: PlayerProfileInput) {
  await requireAcademyRole("supervisor");
  const id = playerId.trim();
  if (!id) throw new Error("Player profile is required.");
  const data = validateProfileInput(input);
  try {
    return await prisma.playerProfile.update({ where: { id }, data });
  } catch (error) {
    if (isUniquePhoneError(error)) {
      throw new Error("This mobile number is already registered to a player.");
    }
    throw error;
  }
}

export async function getPlayerStatementAction(playerId: string) {
  await requireAcademyRole("supervisor");
  const id = playerId.trim();
  if (!id) throw new Error("Player profile is required.");
  const profile = await prisma.playerProfile.findUnique({ where: { id } });
  if (!profile) throw new Error("Player profile was not found.");

  const dues = await prisma.sessionDue.findMany({
    where: { playerProfileId: id },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 150,
    include: {
      payments: {
        orderBy: { createdAt: "desc" },
        include: { payment: true },
      },
      session: {
        select: {
          id: true,
          startTime: true,
          actualEnd: true,
          durationMinutes: true,
          gameFormat: true,
          gameLabel: true,
          players: true,
          table: { select: { name: true, type: true } },
        },
      },
    },
  });
  const matches = await prisma.$queryRaw<
    {
      id: string;
      startTime: Date;
      actualEnd: Date | null;
      durationMinutes: number | null;
      amount: number | null;
      paymentStatus: "PAID" | "UNPAID";
      gameFormat: SessionGameFormat | null;
      gameLabel: string | null;
      players: Prisma.JsonValue | null;
      tableName: string;
      tableType: "SNOOKER" | "POOL";
    }[]
  >(Prisma.sql`
    SELECT
      s.id,
      s.start_time AS "startTime",
      s.actual_end AS "actualEnd",
      s.duration_minutes AS "durationMinutes",
      s.amount,
      s.payment_status AS "paymentStatus",
      s.game_format AS "gameFormat",
      s.game_label AS "gameLabel",
      s.players,
      t.name AS "tableName",
      t.type AS "tableType"
    FROM sessions s
    INNER JOIN tables t ON t.id = s.table_id
    WHERE s.players @> ${JSON.stringify([{ profileId: id }])}::jsonb
      AND s.status = 'COMPLETED'
    ORDER BY s.start_time DESC, s.id DESC
    LIMIT 150
  `);
  const payments = dues.flatMap((due) =>
    due.payments.map((allocation) => ({
      ...allocation,
      sessionId: due.sessionId,
      tableName: due.session.table.name,
      sessionStart: due.session.startTime,
    })),
  );
  const seenPayments = new Set<string>();
  const receipts = payments
    .filter((allocation) => {
      if (seenPayments.has(allocation.paymentId)) return false;
      seenPayments.add(allocation.paymentId);
      return true;
    })
    .map((allocation) => allocation.payment);
  const balance = dues.reduce(
    (total, due) =>
      total +
      outstandingAmount(
        due.amount,
        due.payments.reduce((paid, allocation) => paid + allocation.amount, 0),
      ),
    0,
  );
  return {
    profile,
    balance,
    availableTabAmount: profile.tabEnabled ? Math.max(0, profile.creditLimit - balance) : null,
    dues: dues.map((due) => ({
      ...due,
      outstandingAmount: outstandingAmount(
        due.amount,
        due.payments.reduce((paid, allocation) => paid + allocation.amount, 0),
      ),
      opponentNames: Array.isArray(due.session.players)
        ? due.session.players.flatMap((player) => {
            if (!player || typeof player !== "object" || !("name" in player)) return [];
            if ("profileId" in player && player.profileId === id) return [];
            return typeof player.name === "string" && player.name.trim()
              ? [player.name.trim()]
              : [];
          })
        : [],
    })),
    matches,
    receipts,
    hasMore: dues.length === 150,
  };
}

export async function listUnlinkedLegacyDuesAction(search = "") {
  await requireAcademyRole("supervisor");
  const query = search.trim();
  if (query.length > 100) throw new Error("Search must be 100 characters or fewer.");
  return prisma.session.findMany({
    where: {
      source: { in: ["ONLINE", "WALKIN"] },
      status: "COMPLETED",
      paymentStatus: "UNPAID",
      amount: { gt: 0 },
      dues: { none: {} },
      ...(query
        ? {
            OR: [
              { customerName: { contains: query, mode: "insensitive" } },
              { payerName: { contains: query, mode: "insensitive" } },
              { refCode: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ startTime: "desc" }, { id: "desc" }],
    take: 30,
    select: {
      id: true,
      startTime: true,
      durationMinutes: true,
      amount: true,
      payerName: true,
      players: true,
      table: { select: { name: true, type: true } },
    },
  });
}

export async function linkLegacyDueToPlayerAction(sessionId: string, playerId: string) {
  await requireAcademyRole("supervisor");
  const id = sessionId.trim();
  const profileId = playerId.trim();
  if (!id || !profileId) throw new Error("Choose both a session and a player.");

  return prisma.$transaction(
    async (tx) => {
      const [session, profile] = await Promise.all([
        tx.session.findFirst({
          where: {
            id,
            source: { in: ["ONLINE", "WALKIN"] },
            status: "COMPLETED",
            paymentStatus: "UNPAID",
            amount: { gt: 0 },
            dues: { none: {} },
          },
          select: { id: true, amount: true },
        }),
        tx.playerProfile.findUnique({
          where: { id: profileId },
          select: { id: true, fullName: true },
        }),
      ]);
      if (!session || session.amount === null) {
        throw new Error("This unpaid session was already linked or settled.");
      }
      if (!profile) throw new Error("Player profile was not found.");
      return tx.sessionDue.create({
        data: {
          sessionId: session.id,
          playerProfileId: profile.id,
          payerName: profile.fullName,
          amount: session.amount,
        },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function collectPlayerTabPaymentAction(input: {
  playerId: string;
  amount: number;
  paymentMethod: PaymentMethod;
}) {
  await requireAcademyRole("supervisor");
  if (!input || typeof input !== "object") throw new Error("Payment details are required.");
  const playerId = input.playerId.trim();
  if (!playerId) throw new Error("Player profile is required.");
  if (!Object.values(PaymentMethod).includes(input.paymentMethod)) {
    throw new Error("Choose a valid payment method.");
  }
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0) {
    throw new Error("Enter a positive whole-rupee payment amount.");
  }

  return prisma.$transaction(
    async (tx) => {
      const profile = await tx.playerProfile.findUnique({
        where: { id: playerId },
        select: { id: true, fullName: true },
      });
      if (!profile) throw new Error("Player profile was not found.");
      const dues = await tx.sessionDue.findMany({
        where: { playerProfileId: profile.id },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        include: { payments: { select: { amount: true } } },
      });
      const openDues = dues
        .map((due) => ({
          id: due.id,
          sessionId: due.sessionId,
          outstandingAmount: outstandingAmount(
            due.amount,
            due.payments.reduce((total, payment) => total + payment.amount, 0),
          ),
        }))
        .filter((due) => due.outstandingAmount > 0);
      const allocations = allocatePaymentOldestFirst(openDues, input.amount);
      const payment = await tx.playerTabPayment.create({
        data: {
          playerProfileId: profile.id,
          payerName: profile.fullName,
          amount: input.amount,
          paymentMethod: input.paymentMethod,
        },
      });
      const sessionIds = new Set<string>();
      for (const allocation of allocations) {
        const due = openDues.find((entry) => entry.id === allocation.dueId);
        if (!due) throw new Error("A due changed before payment could be allocated.");
        sessionIds.add(due.sessionId);
        await tx.sessionDuePayment.create({
          data: {
            dueId: due.id,
            paymentId: payment.id,
            playerProfileId: profile.id,
            amount: allocation.amount,
          },
        });
      }

      for (const sessionId of sessionIds) {
        const sessionDues = await tx.sessionDue.findMany({
          where: { sessionId },
          include: { payments: { select: { amount: true } } },
        });
        const isSettled = sessionDues.every(
          (due) => due.amount === due.payments.reduce((total, item) => total + item.amount, 0),
        );
        if (isSettled) {
          await tx.session.update({
            where: { id: sessionId },
            data: {
              paymentStatus: "PAID",
              paymentMethod: input.paymentMethod,
              payerName: profile.fullName,
              paidAt: payment.createdAt,
            },
          });
        }
      }
      return {
        id: payment.id,
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        createdAt: payment.createdAt,
        allocations,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
