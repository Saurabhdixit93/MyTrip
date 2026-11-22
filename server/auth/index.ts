import NextAuth, { type DefaultSession } from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Nodemailer from "next-auth/providers/nodemailer";
import { z } from "zod";
import { env } from "@/lib/env";
import { db } from "@/server/db";
import { authAdapter } from "./adapter";
import { sendMagicLink, smtpServer } from "./email";
import { mergeUpgradingGuest } from "./guest-merge";
import { verifyGuestToken } from "./guest-token";

declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}

export const authFeatures = {
  google: Boolean(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET),
  email: Boolean(env.SMTP_HOST) || env.NODE_ENV !== "production",
  devLogin: env.AUTH_DEV_LOGIN,
};

const providers: Provider[] = [
  Credentials({
    id: "guest",
    name: "Guest",
    credentials: { token: {} },
    async authorize(raw) {
      const parsed = z.object({ token: z.string().min(10) }).safeParse(raw);
      if (!parsed.success) return null;
      const userId = verifyGuestToken(parsed.data.token);
      if (!userId) return null;
      const user = await db.user.findFirst({ where: { id: userId, isGuest: true, deletedAt: null } });
      return user ? { id: user.id, name: user.name } : null;
    },
  }),
];

if (authFeatures.google) {
  providers.push(
    Google({
      clientId: env.AUTH_GOOGLE_ID,
      clientSecret: env.AUTH_GOOGLE_SECRET,
      // Google verifies email ownership, so linking to an existing magic-link account is safe.
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

if (authFeatures.email) {
  providers.push(
    Nodemailer({
      server: smtpServer,
      from: env.EMAIL_FROM,
      maxAge: 24 * 60 * 60,
      sendVerificationRequest: ({ identifier, url }) => sendMagicLink({ identifier, url }),
    }),
  );
}

if (authFeatures.devLogin) {
  providers.push(
    Credentials({
      id: "dev",
      name: "Demo login",
      credentials: { email: {}, name: {} },
      async authorize(raw) {
        const parsed = z.object({ email: z.email().max(254), name: z.string().trim().max(60).optional() }).safeParse(raw);
        if (!parsed.success) return null;
        const email = parsed.data.email.toLowerCase();
        const name = parsed.data.name || email.split("@")[0] || "Traveller";
        const user = await db.user.upsert({
          where: { email },
          update: {},
          create: { email, name, emailVerified: new Date() },
        });
        return user.deletedAt ? null : { id: user.id, name: user.name, email: user.email };
      },
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: authAdapter,
  providers,
  session: { strategy: "jwt", maxAge: 60 * 24 * 60 * 60 },
  trustHost: true,
  pages: { signIn: "/login", verifyRequest: "/login/verify", error: "/login" },
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
  events: {
    async signIn({ user, account }) {
      if (user.id && account?.provider !== "guest") await mergeUpgradingGuest(user.id);
    },
  },
});
