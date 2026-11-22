import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/client";

export function createPrismaClient(connectionString: string) {
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter, log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"] });
}

export type Db = ReturnType<typeof createPrismaClient>;
/** Interactive-transaction client type. */
export type Tx = Parameters<Parameters<Db["$transaction"]>[0]>[0];
