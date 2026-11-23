import { expect, type Browser, type Page } from "@playwright/test";

export const uniqueEmail = (prefix: string) => `${prefix}+${Date.now()}${Math.floor(Math.random() * 1000)}@e2e.mytrip.dev`;

/** Demo login (AUTH_DEV_LOGIN=true). Lands on /trips. */
export async function devLogin(page: Page, email: string, name: string) {
  await page.goto("/login");
  await page.fill("#dev-name", name);
  await page.fill("#dev-email", email);
  await page.locator("[data-testid=dev-login] button[type=submit]").click();
  await page.waitForURL("**/trips");
}

export async function createTrip(page: Page, name: string, opts: { coverUrl?: string } = {}) {
  await page.goto("/trips/new");
  await page.fill("#name", name);
  await page.fill("#destination", "Manali");
  if (opts.coverUrl) {
    await page.getByTestId("cover-mode-link").click();
    await page.getByTestId("cover-url").fill(opts.coverUrl);
    await expect(page.getByTestId("cover-url-preview")).toBeVisible({ timeout: 30_000 });
  }
  await page.getByRole("button", { name: "Create trip" }).click();
  await page.waitForURL(/\/trips\/[a-z0-9]+\/members\?welcome=1/);
  const tripUrl = page.url().replace(/\/members.*$/, "");
  return { tripUrl, tripPath: new URL(tripUrl).pathname };
}

export async function inviteLink(page: Page, tripPath: string) {
  await page.goto(`${tripPath}/members`);
  return (await page.getByTestId("invite-link").textContent())?.trim() ?? "";
}

/** Joins as a brand-new guest in a fresh browser context. */
export async function joinAsGuest(browser: Browser, link: string, name: string) {
  const ctx = await browser.newContext({ ...(await import("@playwright/test")).devices["Pixel 7"] });
  const page = await ctx.newPage();
  await page.goto(link);
  await page.fill("#displayName", name);
  await page.getByRole("button", { name: "Join trip" }).click();
  await page.waitForURL(/\/trips\/[a-z0-9]+\?joined=1/);
  return page;
}

export async function addEqualExpense(page: Page, tripPath: string, title: string, rupees: string) {
  await page.goto(`${tripPath}/expenses/new`);
  await page.fill("#amount", rupees);
  await page.fill("#title", title);
  await page.getByRole("button", { name: "Save expense" }).click();
  await page.waitForURL(/\/expenses\?saved=1/);
}
