import { describe, expect, it } from "vitest";
import { withStrictSsl } from "@/db/client";

describe("withStrictSsl", () => {
  it("pins require → verify-full and keeps other params", () => {
    const out = new URL(withStrictSsl("postgresql://u:p@ep-x-pooler.neon.tech/mytrip?sslmode=require&channel_binding=require"));
    expect(out.searchParams.get("sslmode")).toBe("verify-full");
    expect(out.searchParams.get("channel_binding")).toBe("require");
    expect(out.username).toBe("u");
    expect(out.pathname).toBe("/mytrip");
  });
  it("leaves disable / verify-full / missing sslmode alone", () => {
    expect(withStrictSsl("postgres://u:p@localhost:5432/db?sslmode=disable")).toContain("sslmode=disable");
    expect(withStrictSsl("postgres://u:p@h/db?sslmode=verify-full")).toContain("sslmode=verify-full");
    expect(withStrictSsl("postgres://u:p@h/db")).not.toContain("sslmode");
  });
  it("respects an explicit libpq-compat opt-in", () => {
    expect(withStrictSsl("postgres://u:p@h/db?uselibpqcompat=true&sslmode=require")).toContain("sslmode=require");
  });
});
