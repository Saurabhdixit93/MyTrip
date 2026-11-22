import "server-only";
import { computeSplit, validatePayers, type SplitInput } from "@/lib/domain/split";
import { formatPaise } from "@/lib/format";
import type { Allocation, ExpenseInput } from "@/lib/validation/expense";
import { audit } from "../audit";
import type { CurrentUser } from "../auth/session";
import { db } from "../db";
import { AppError } from "../errors";
import { assertTripWritable, requireTripAccess } from "../rbac";
import { can } from "@/lib/rbac";
import { storeTripImage } from "../storage/uploads";

export const MAX_RECEIPTS = 5;

function toSplitInput(split: Allocation["split"]): SplitInput {
  return split.type === "EQUAL" ? { type: "EQUAL", memberIds: split.memberIds } : { type: split.type, entries: split.entries };
}

/** Runs the pure split/payer engine and turns failures into friendly field errors. */
function resolveAllocation(totalPaise: number, allocation: Allocation, activeMemberIds: Set<string>) {
  const ids = [
    ...allocation.payers.map((p) => p.memberId),
    ...(allocation.split.type === "EQUAL" ? allocation.split.memberIds : allocation.split.entries.map((e) => e.memberId)),
  ];
  if (ids.some((id) => !activeMemberIds.has(id))) throw new AppError("VALIDATION", "Someone in this split is no longer in the trip. Refresh and try again.");

  const payers = allocation.payers.filter((p) => p.amountPaise > 0);
  const payerCheck = validatePayers(totalPaise, payers);
  if (!payerCheck.ok) {
    const diff = payerCheck.difference ?? 0;
    const msg = payerCheck.error === "PAYER_MISMATCH" ? `Payers add up to ${formatPaise(totalPaise + diff)}, but the expense is ${formatPaise(totalPaise)}.` : "Choose who paid.";
    throw new AppError("VALIDATION", msg, { allocation: [msg] });
  }

  const split = computeSplit(totalPaise, toSplitInput(allocation.split));
  if (!split.ok) {
    const diff = split.difference ?? 0;
    const msg =
      split.error === "EXACT_MISMATCH"
        ? `Exact amounts are ${formatPaise(Math.abs(diff))} ${diff > 0 ? "over" : "short of"} the total.`
        : split.error === "PERCENT_MISMATCH"
          ? `Percentages must add up to 100% (they're off by ${Math.abs(diff) / 100}%).`
          : split.error === "NO_PARTICIPANTS"
            ? "Pick at least one person to split with."
            : "Check the split values.";
    throw new AppError("VALIDATION", msg, { allocation: [msg] });
  }
  return { payers, shares: split.shares };
}

async function activeMemberIds(tripId: string) {
  const rows = await db.tripMember.findMany({ where: { tripId, deletedAt: null }, select: { id: true } });
  return new Set(rows.map((r) => r.id));
}

function snapshot(input: ExpenseInput, payers: { memberId: string; amountPaise: number }[], shares: { memberId: string; amountPaise: number }[], splitType: string) {
  return { title: input.title, amountPaise: input.amount, category: input.category, spentAt: input.spentAt, notes: input.notes ?? null, splitType, payers, splits: shares };
}

export async function createExpense(user: CurrentUser, input: ExpenseInput, receipts: File[]) {
  const { trip, member } = await requireTripAccess(user.id, input.tripId, "expense.create");
  assertTripWritable(trip);
  const { payers, shares } = resolveAllocation(input.amount, input.allocation, await activeMemberIds(trip.id));
  if (receipts.length > MAX_RECEIPTS) throw new AppError("VALIDATION", `Up to ${MAX_RECEIPTS} receipt photos.`);
  const stored = await Promise.all(receipts.map((f) => storeTripImage(trip.id, "receipt", f)));

  return db.$transaction(async (tx) => {
    const expense = await tx.expense.create({
      data: {
        tripId: trip.id,
        title: input.title,
        amountPaise: input.amount,
        category: input.category,
        spentAt: input.spentAt,
        notes: input.notes ?? null,
        splitType: input.allocation.split.type,
        createdByMemberId: member.id,
        payers: { create: payers.map((p) => ({ memberId: p.memberId, amountPaise: p.amountPaise })) },
        splits: { create: shares.map((s) => ({ memberId: s.memberId, amountPaise: s.amountPaise, weight: s.weight })) },
        attachments: { create: stored.map((f) => ({ fileKey: f.key, mimeType: f.contentType, sizeBytes: f.size })) },
      },
    });
    await tx.trip.update({ where: { id: trip.id }, data: { updatedAt: new Date() } });
    await audit(tx, { tripId: trip.id, actorUserId: user.id, actorMemberId: member.id, entityType: "expense", entityId: expense.id, action: "create", after: snapshot(input, payers, shares, input.allocation.split.type) });
    return expense;
  });
}

async function loadEditableExpense(user: CurrentUser, tripId: string, expenseId: string) {
  const { trip, member } = await requireTripAccess(user.id, tripId, "expense.update.own");
  assertTripWritable(trip);
  const expense = await db.expense.findFirst({
    where: { id: expenseId, tripId, deletedAt: null },
    include: { payers: true, splits: true, attachments: true },
  });
  if (!expense) throw new AppError("NOT_FOUND", "Expense not found.");
  if (expense.createdByMemberId !== member.id && !can(member.role, "expense.update.any")) {
    throw new AppError("FORBIDDEN", "Only the person who added this expense or the Coach can change it.");
  }
  return { trip, member, expense };
}

export async function updateExpense(user: CurrentUser, input: ExpenseInput & { expenseId: string; version: number }, receipts: File[]) {
  const { trip, member, expense } = await loadEditableExpense(user, input.tripId, input.expenseId);
  if (expense.version !== input.version) throw new AppError("CONFLICT", "Someone else edited this expense. Reload to see the latest version.");
  const { payers, shares } = resolveAllocation(input.amount, input.allocation, await activeMemberIds(trip.id));
  const removeIds = new Set(input.removeAttachmentIds);
  const keptCount = expense.attachments.filter((a) => !removeIds.has(a.id)).length;
  if (keptCount + receipts.length > MAX_RECEIPTS) throw new AppError("VALIDATION", `Up to ${MAX_RECEIPTS} receipt photos.`);
  const stored = await Promise.all(receipts.map((f) => storeTripImage(trip.id, "receipt", f)));

  return db.$transaction(async (tx) => {
    // Optimistic concurrency: only update if nobody bumped the version meanwhile.
    const bumped = await tx.expense.updateMany({
      where: { id: expense.id, version: input.version, deletedAt: null },
      data: {
        title: input.title,
        amountPaise: input.amount,
        category: input.category,
        spentAt: input.spentAt,
        notes: input.notes ?? null,
        splitType: input.allocation.split.type,
        version: { increment: 1 },
      },
    });
    if (bumped.count !== 1) throw new AppError("CONFLICT", "Someone else edited this expense. Reload to see the latest version.");
    await tx.expensePayer.deleteMany({ where: { expenseId: expense.id } });
    await tx.expenseSplit.deleteMany({ where: { expenseId: expense.id } });
    await tx.expensePayer.createMany({ data: payers.map((p) => ({ expenseId: expense.id, memberId: p.memberId, amountPaise: p.amountPaise })) });
    await tx.expenseSplit.createMany({ data: shares.map((s) => ({ expenseId: expense.id, memberId: s.memberId, amountPaise: s.amountPaise, weight: s.weight })) });
    if (removeIds.size) await tx.expenseAttachment.deleteMany({ where: { expenseId: expense.id, id: { in: [...removeIds] } } });
    if (stored.length) await tx.expenseAttachment.createMany({ data: stored.map((f) => ({ expenseId: expense.id, fileKey: f.key, mimeType: f.contentType, sizeBytes: f.size })) });
    await tx.trip.update({ where: { id: trip.id }, data: { updatedAt: new Date() } });
    await audit(tx, {
      tripId: trip.id,
      actorUserId: user.id,
      actorMemberId: member.id,
      entityType: "expense",
      entityId: expense.id,
      action: "update",
      before: {
        title: expense.title,
        amountPaise: expense.amountPaise,
        category: expense.category,
        spentAt: expense.spentAt,
        notes: expense.notes,
        splitType: expense.splitType,
        payers: expense.payers.map((p) => ({ memberId: p.memberId, amountPaise: p.amountPaise })),
        splits: expense.splits.map((s) => ({ memberId: s.memberId, amountPaise: s.amountPaise })),
      },
      after: snapshot(input, payers, shares, input.allocation.split.type),
    });
  });
}

export async function deleteExpense(user: CurrentUser, tripId: string, expenseId: string) {
  const { member, expense } = await loadEditableExpense(user, tripId, expenseId);
  await db.$transaction(async (tx) => {
    await tx.expense.update({ where: { id: expense.id }, data: { deletedAt: new Date(), version: { increment: 1 } } });
    await audit(tx, { tripId, actorUserId: user.id, actorMemberId: member.id, entityType: "expense", entityId: expense.id, action: "delete", before: { title: expense.title, amountPaise: expense.amountPaise } });
  });
}
