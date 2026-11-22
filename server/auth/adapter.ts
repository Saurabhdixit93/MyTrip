import "server-only";
import type { Adapter, AdapterAccount, AdapterUser } from "next-auth/adapters";
import type { User } from "@/db/generated/client";
import { db } from "@/server/db";

function toAdapterUser(u: User): AdapterUser {
  return { id: u.id, email: u.email ?? "", emailVerified: u.emailVerified, name: u.name, image: u.image };
}

/**
 * Minimal, fully-typed Auth.js adapter on top of our Prisma 7 client.
 * Sessions are JWT-based, so only user / account / verification-token methods are needed.
 * Soft-deleted users are invisible to auth.
 */
export const authAdapter: Adapter = {
  async createUser(user) {
    const created = await db.user.create({
      data: { name: user.name ?? null, email: user.email.toLowerCase(), emailVerified: user.emailVerified, image: user.image ?? null },
    });
    return toAdapterUser(created);
  },
  async getUser(id) {
    const u = await db.user.findFirst({ where: { id, deletedAt: null } });
    return u ? toAdapterUser(u) : null;
  },
  async getUserByEmail(email) {
    const u = await db.user.findFirst({ where: { email: email.toLowerCase(), deletedAt: null } });
    return u ? toAdapterUser(u) : null;
  },
  async getUserByAccount({ provider, providerAccountId }) {
    const account = await db.account.findUnique({
      where: { provider_providerAccountId: { provider, providerAccountId } },
      include: { user: true },
    });
    return account && !account.user.deletedAt ? toAdapterUser(account.user) : null;
  },
  async updateUser({ id, ...data }) {
    const u = await db.user.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.email !== undefined && { email: data.email.toLowerCase() }),
        ...(data.emailVerified !== undefined && { emailVerified: data.emailVerified }),
        ...(data.image !== undefined && { image: data.image }),
      },
    });
    return toAdapterUser(u);
  },
  async linkAccount(account: AdapterAccount) {
    await db.account.create({
      data: {
        userId: account.userId,
        type: account.type,
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        refresh_token: account.refresh_token ?? null,
        access_token: account.access_token ?? null,
        expires_at: account.expires_at ?? null,
        token_type: account.token_type ?? null,
        scope: account.scope ?? null,
        id_token: account.id_token ?? null,
        session_state: typeof account.session_state === "string" ? account.session_state : null,
      },
    });
  },
  async createVerificationToken(token) {
    return db.verificationToken.create({ data: token });
  },
  async useVerificationToken({ identifier, token }) {
    try {
      return await db.verificationToken.delete({ where: { identifier_token: { identifier, token } } });
    } catch {
      return null; // already used or never existed
    }
  },
};
