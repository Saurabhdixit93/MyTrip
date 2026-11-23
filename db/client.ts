import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/client";

/**
 * pg currently treats sslmode=prefer/require/verify-ca as verify-full, but will switch them to the
 * weaker libpq meaning in pg v9 (and warns about it). Pin verify-full explicitly so TLS stays fully
 * verified (cert + hostname). DATABASE_URL itself is left as-is for the Prisma CLI.
 */
export function withStrictSsl(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    const mode = url.searchParams.get("sslmode");
    if (mode && ["prefer", "require", "verify-ca"].includes(mode) && url.searchParams.get("uselibpqcompat") !== "true") {
      url.searchParams.set("sslmode", "verify-full");
    }
    return url.toString();
  } catch {
    return connectionString;
  }
}

export function createPrismaClient(connectionString: string) {
  const adapter = new PrismaPg({
    connectionString: withStrictSsl(connectionString),
    // Poolers (Neon, Prisma dev) close idle connections server-side; drop ours first so a request
    // never picks up a dead socket ("ConnectionClosed").
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 15_000,
  });
  return new PrismaClient({ adapter, log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"] });
}

export type Db = ReturnType<typeof createPrismaClient>;
/** Interactive-transaction client type. */
export type Tx = Parameters<Parameters<Db["$transaction"]>[0]>[0];
