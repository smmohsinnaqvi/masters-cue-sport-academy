export type OpenSessionDue = {
  id: string;
  outstandingAmount: number;
};

export type DuePaymentAllocation = {
  dueId: string;
  amount: number;
};

export function allocatePaymentOldestFirst(
  dues: OpenSessionDue[],
  paymentAmount: number,
): DuePaymentAllocation[] {
  if (!Number.isSafeInteger(paymentAmount) || paymentAmount <= 0) {
    throw new Error("Payment must be a positive whole-rupee amount.");
  }

  const available = dues.reduce((total, due) => {
    if (!Number.isSafeInteger(due.outstandingAmount) || due.outstandingAmount < 0) {
      throw new Error("Outstanding dues must be non-negative whole-rupee amounts.");
    }
    return total + due.outstandingAmount;
  }, 0);
  if (paymentAmount > available) {
    throw new Error("Payment cannot exceed the player's outstanding balance.");
  }

  let remaining = paymentAmount;
  const allocations: DuePaymentAllocation[] = [];
  for (const due of dues) {
    if (remaining === 0) break;
    const amount = Math.min(due.outstandingAmount, remaining);
    if (amount > 0) allocations.push({ dueId: due.id, amount });
    remaining -= amount;
  }
  return allocations;
}

export function outstandingAmount(amount: number, paidAmount: number) {
  if (
    !Number.isSafeInteger(amount) ||
    !Number.isSafeInteger(paidAmount) ||
    amount < 0 ||
    paidAmount < 0 ||
    paidAmount > amount
  ) {
    throw new Error("Charge and payment totals are invalid.");
  }
  return amount - paidAmount;
}
