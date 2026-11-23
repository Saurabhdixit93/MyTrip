import "server-only";
import { createPrismaClient, type Db } from "@/db/client";
import { env } from "@/lib/env";

declare global {
  var __mytripPrisma: Db | undefined;
}

/** Singleton Prisma client (survives HMR in dev). */
export const db: Db = globalThis.__mytripPrisma ?? createPrismaClient(env.DATABASE_URL, { poolMax: env.DATABASE_POOL_MAX });
if (env.NODE_ENV !== "production") globalThis.__mytripPrisma = db;

export type { Tx } from "@/db/client";
