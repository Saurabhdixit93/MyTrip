/**
 * Demo data: `pnpm db:seed`. Idempotent: recreates the "Goa Getaway" demo trip each run.
 * Sign in locally (AUTH_DEV_LOGIN=true) as coach@mytrip.dev, rahul@mytrip.dev or priya@mytrip.dev.
 */
import "dotenv/config";
import { computeSplit, type SplitInput } from "../lib/domain/split";
import { dnsFallbackFromEnv } from "../server/net/dns-fallback";
import { createPrismaClient } from "./client";

dnsFallbackFromEnv(process.env.DNS_FALLBACK_SERVERS);

const DEMO_CODE = "GOAFUN";
const DEMO_TOKEN = "demo-goa-getaway-invite-token-2026";

const db = createPrismaClient(process.env.DATABASE_URL ?? "");

async function user(email: string, name: string) {
  return db.user.upsert({ where: { email }, update: { name, deletedAt: null }, create: { email, name, emailVerified: new Date() } });
}

async function main() {
  const riya = await user("coach@mytrip.dev", "Riya Sharma");
  const rahul = await user("rahul@mytrip.dev", "Rahul Verma");
  const priya = await user("priya@mytrip.dev", "Priya Nair");

  // Hard-delete the previous demo trip in dependency order (the app itself only soft-deletes).
  const old = await db.trip.findUnique({ where: { inviteCode: DEMO_CODE }, select: { id: true } });
  if (old) {
    await db.$transaction([
      db.payment.deleteMany({ where: { tripId: old.id } }),
      db.expense.deleteMany({ where: { tripId: old.id } }),
      db.auditLog.deleteMany({ where: { tripId: old.id } }),
      db.tripMember.deleteMany({ where: { tripId: old.id } }),
      db.trip.delete({ where: { id: old.id } }),
    ]);
  }

  const trip = await db.trip.create({
    data: {
      name: "Goa Getaway 🌴",
      destination: "North Goa",
      description: "Beaches, seafood and scuba. Demo trip with sample data.",
      startDate: new Date("2026-12-20T00:00:00Z"),
      endDate: new Date("2026-12-24T00:00:00Z"),
      budgetPaise: 60_000_00,
      inviteCode: DEMO_CODE,
      inviteToken: DEMO_TOKEN,
      settlementMode: "PAY_COACH",
      upiVpa: "riya.sharma@okhdfcbank",
      upiPayeeName: "Riya Sharma",
      createdById: riya.id,
    },
  });

  const member = (userId: string | null, displayName: string, role: "COACH" | "MEMBER" = "MEMBER", upiVpa?: string) =>
    db.tripMember.create({ data: { tripId: trip.id, userId, displayName, role, upiVpa: upiVpa ?? null, claimedAt: userId ? new Date() : null } });

  const mRiya = await member(riya.id, "Riya", "COACH", "riya.sharma@okhdfcbank");
  const mRahul = await member(rahul.id, "Rahul", "MEMBER", "rahul.v@ybl");
  const mPriya = await member(priya.id, "Priya");
  const mAman = await member(null, "Aman");
  const mDev = await member(null, "Dev");
  const all = [mRiya, mRahul, mPriya, mAman, mDev].map((m) => m.id);

  const expenses: { title: string; rupees: number; category: "STAY" | "FOOD" | "TRAVEL" | "ACTIVITIES" | "FUEL" | "SHOPPING"; day: number; payer: string; split: SplitInput }[] = [
    { title: "Villa, 4 nights", rupees: 18000, category: "STAY", day: 20, payer: mRiya.id, split: { type: "EQUAL", memberIds: all } },
    { title: "Airport cabs", rupees: 2350, category: "TRAVEL", day: 20, payer: mPriya.id, split: { type: "EQUAL", memberIds: all } },
    { title: "Dinner at Thalassa", rupees: 6240, category: "FOOD", day: 20, payer: mRahul.id, split: { type: "EQUAL", memberIds: all.filter((id) => id !== mAman.id) } },
    { title: "Scuba diving", rupees: 9600, category: "ACTIVITIES", day: 21, payer: mRiya.id, split: { type: "SHARES", entries: [mRiya, mRahul, mPriya, mDev].map((m) => ({ memberId: m.id, value: 1 })) } },
    { title: "Scooter rental + fuel", rupees: 1800, category: "FUEL", day: 21, payer: mDev.id, split: { type: "PERCENTAGE", entries: [{ memberId: mDev.id, value: 5000 }, { memberId: mAman.id, value: 5000 }] } },
    { title: "Breakfast shack", rupees: 1275.5, category: "FOOD", day: 22, payer: mAman.id, split: { type: "EQUAL", memberIds: all } },
    { title: "Souvenirs", rupees: 900, category: "SHOPPING", day: 22, payer: mPriya.id, split: { type: "EXACT", entries: [{ memberId: mPriya.id, value: 500_00 }, { memberId: mRiya.id, value: 400_00 }] } },
  ];

  for (const e of expenses) {
    const amountPaise = Math.round(e.rupees * 100);
    const split = computeSplit(amountPaise, e.split);
    if (!split.ok) throw new Error(`Seed split failed for ${e.title}: ${split.error}`);
    await db.expense.create({
      data: {
        tripId: trip.id,
        title: e.title,
        amountPaise,
        category: e.category,
        spentAt: new Date(`2026-12-${e.day}T00:00:00Z`),
        splitType: e.split.type,
        createdByMemberId: e.payer === mAman.id || e.payer === mDev.id ? mRiya.id : e.payer,
        payers: { create: [{ memberId: e.payer, amountPaise }] },
        splits: { create: split.shares.map((s) => ({ memberId: s.memberId, amountPaise: s.amountPaise, weight: s.weight })) },
      },
    });
  }

  // A verified partial payment and one awaiting the Coach's approval.
  await db.payment.create({
    data: { tripId: trip.id, fromMemberId: mRahul.id, toMemberId: mRiya.id, amountPaise: 1000_00, status: "VERIFIED", utr: "412345678901", idempotencyKey: `seed-${trip.id}-1`, submittedAt: new Date(), reviewedAt: new Date(), reviewedByMemberId: mRiya.id },
  });
  await db.payment.create({
    data: { tripId: trip.id, fromMemberId: mPriya.id, toMemberId: mRiya.id, amountPaise: 500_00, status: "PAID_AWAITING_APPROVAL", utr: "498765432109", idempotencyKey: `seed-${trip.id}-2`, submittedAt: new Date() },
  });

  await db.auditLog.create({ data: { tripId: trip.id, actorUserId: riya.id, actorMemberId: mRiya.id, entityType: "trip", entityId: trip.id, action: "create", after: { seeded: true } } });

  console.log(`✔ Seeded demo trip "${trip.name}" (code ${DEMO_CODE}). Sign in as coach@mytrip.dev`);
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => void db.$disconnect());
