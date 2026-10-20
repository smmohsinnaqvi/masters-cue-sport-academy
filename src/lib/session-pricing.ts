export type SessionPlayer = {
  name: string;
  team?: "A" | "B";
};

export type SessionGameFormat = "SINGLES" | "DOUBLES" | "GROUP" | "SOLO";
export type SessionTeam = "A" | "B";

export type PayerShare = {
  name: string;
  amount: number;
};

export function playerNamesForTeam(players: SessionPlayer[], team: SessionTeam) {
  return players.filter((player) => player.team === team).map((player) => player.name);
}

export function discountPercentToBasisPoints(value: unknown) {
  const text =
    typeof value === "number" && Number.isFinite(value)
      ? String(value)
      : typeof value === "string"
        ? value.trim()
        : "";
  if (!/^(?:100(?:\.0{1,2})?|(?:\d{1,2})(?:\.\d{1,2})?)$/.test(text)) {
    throw new Error("Discount must be between 0 and 100 with up to 2 decimal places.");
  }
  const [whole, fractional = ""] = text.split(".");
  return Number(whole) * 100 + Number(fractional.padEnd(2, "0"));
}

export function discountPercentFromBasisPoints(value: number) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 10_000) {
    throw new Error("Discount basis points must be between 0 and 10000.");
  }
  return value / 100;
}

export function sessionDurationMinutes(start: Date, end: Date) {
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 60_000));
}

export function sessionCharge(ratePerHour: number, durationMinutes: number) {
  return Math.round((ratePerHour * durationMinutes) / 60);
}

export function discountedSessionCharge(grossAmount: number, discountPercent: number) {
  if (!Number.isSafeInteger(grossAmount) || grossAmount < 0) {
    throw new Error("Session amount must be a non-negative whole number");
  }
  const basisPoints = discountPercentToBasisPoints(discountPercent);
  const amount = (BigInt(grossAmount) * BigInt(10_000 - basisPoints) + 5_000n) / 10_000n;
  return Number(amount);
}

export function calculateSettlementDiscount(
  outstandingAmount: number,
  settlementDiscountPercent: number,
  closeoutDiscountBasisPoints: number,
) {
  if (
    closeoutDiscountBasisPoints > 0 &&
    discountPercentToBasisPoints(settlementDiscountPercent) > 0
  ) {
    throw new Error(
      "A session discounted at closeout cannot receive another discount at settlement",
    );
  }
  const amount = discountedSessionCharge(outstandingAmount, settlementDiscountPercent);
  return {
    amount,
    discountAmount: outstandingAmount - amount,
    discountBasisPoints: discountPercentToBasisPoints(settlementDiscountPercent),
  };
}

export function splitSessionCharge(totalAmount: number, payerNames: string[]): PayerShare[] {
  if (!Number.isSafeInteger(totalAmount) || totalAmount < 0) {
    throw new Error("Session amount must be a non-negative whole number");
  }
  const names = payerNames.reduce<string[]>((unique, payer) => {
    const name = payer.trim();
    if (
      !name ||
      unique.some((existing) => existing.toLocaleLowerCase() === name.toLocaleLowerCase())
    ) {
      return unique;
    }
    unique.push(name);
    return unique;
  }, []);
  if (names.length === 0) throw new Error("Select at least one payer");
  const share = Math.floor(totalAmount / names.length);
  let remainder = totalAmount % names.length;
  return names.map((name) => {
    const amount = share + (remainder > 0 ? 1 : 0);
    remainder = Math.max(0, remainder - 1);
    return { name, amount };
  });
}

export function closeoutPayerShares(totalAmount: number, payerNames: string[]): PayerShare[] {
  if (totalAmount === 0 && payerNames.length === 0) return [];
  return splitSessionCharge(totalAmount, payerNames);
}

export function validateSessionPlayers(
  format: SessionGameFormat,
  players: SessionPlayer[],
  gameLabel?: string | null,
) {
  if (!Array.isArray(players)) throw new Error("Enter the players for this session");
  if (gameLabel != null && typeof gameLabel !== "string") {
    throw new Error("Game label must be text");
  }
  const minPlayers = format === "GROUP" ? 3 : format === "DOUBLES" ? 4 : format === "SOLO" ? 1 : 2;
  const maxPlayers = format === "GROUP" ? 6 : minPlayers;
  if (players.length < minPlayers || players.length > maxPlayers) {
    throw new Error(`Enter between ${minPlayers} and ${maxPlayers} players`);
  }
  if (format !== "GROUP" && players.length !== minPlayers) {
    throw new Error(`Enter exactly ${minPlayers} players for ${format.toLowerCase()}`);
  }
  const normalized = players.map((player, index) => {
    if (!player || typeof player.name !== "string") {
      throw new Error(`Enter a name for player ${index + 1}`);
    }
    const name = player.name.trim();
    if (!name || name.length > 120) {
      throw new Error(`Player ${index + 1} name is required and must be 120 characters or fewer`);
    }
    if (format === "DOUBLES" && player.team !== "A" && player.team !== "B") {
      throw new Error("Assign every doubles player to Team A or Team B");
    }
    return {
      name,
      ...(format === "DOUBLES" ? { team: player.team } : {}),
    };
  });
  if (
    new Set(normalized.map((player) => player.name.toLocaleLowerCase())).size !== normalized.length
  ) {
    throw new Error("Each player must have a distinct name");
  }
  if (format === "DOUBLES") {
    const teamA = normalized.filter((player) => player.team === "A").length;
    const teamB = normalized.filter((player) => player.team === "B").length;
    if (teamA !== 2 || teamB !== 2) throw new Error("Doubles requires two players on each team");
  }
  const normalizedLabel = gameLabel?.trim() ?? "";
  if (normalizedLabel.length > 40) throw new Error("Game label must be 40 characters or fewer");
  if (format !== "GROUP" && format !== "SOLO" && normalizedLabel) {
    throw new Error("A game label can only be used with group or solo games");
  }
  return { players: normalized, gameLabel: normalizedLabel || null };
}

export function sessionPlayerNames(players: unknown, fallbackName?: string | null) {
  const parsedNames = Array.isArray(players)
    ? players.flatMap((player) => {
        if (!player || typeof player !== "object" || !("name" in player)) return [];
        const name = player.name;
        return typeof name === "string" && name.trim() ? [name.trim()] : [];
      })
    : [];
  const names = parsedNames.filter(
    (name, index) =>
      parsedNames.findIndex(
        (candidate) => candidate.toLocaleLowerCase() === name.toLocaleLowerCase(),
      ) === index,
  );
  return names.length > 0 ? names : fallbackName?.trim() ? [fallbackName.trim()] : [];
}
