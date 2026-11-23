import { expect, test, type Locator, type Page } from "@playwright/test";
import path from "node:path";
import { addEqualExpense, devLogin, inviteLink, joinAsGuest, uniqueEmail } from "./helpers";

/**
 * Real file uploads through the browser (client compression → server action → storage driver →
 * /api/files). Run it against the S3 driver too (E2E_STORAGE_DRIVER="" or "s3") before shipping
 * any storage change: `pnpm e2e tests/e2e/image-uploads.spec.ts`.
 */
const WIDE = path.join(process.cwd(), "public/screenshots/wide.png");
const NARROW = path.join(process.cwd(), "public/screenshots/narrow.png");

async function expectImageLoads(img: Locator) {
  await expect(img).toHaveAttribute("src", /^\/api\/files\/trips\//);
  await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth), { timeout: 30_000 }).toBeGreaterThan(0);
}

async function expectFileServed(page: Page, href: string | null) {
  expect(href).toMatch(/^\/api\/files\/trips\//);
  const res = await page.request.get(href ?? "");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toMatch(/^image\//);
}

test("cover, receipt, Coach UPI QR and payment proof uploads are stored and served", async ({ page, browser }) => {
  test.setTimeout(180_000);
  await devLogin(page, uniqueEmail("uploads"), "Tara");

  // 1. Cover photo upload (file, not link).
  await page.goto("/trips/new");
  await page.fill("#name", "Upload test trip");
  await page.locator('input[type=file][name="cover"]').setInputFiles(WIDE);
  await expect(page.locator('label:has(input[name="cover"]) img')).toBeVisible();
  await page.getByRole("button", { name: "Create trip" }).click();
  await page.waitForURL(/\/trips\/[a-z0-9]+\/members\?welcome=1/);
  const tripPath = new URL(page.url()).pathname.replace(/\/members$/, "");
  await page.goto(tripPath);
  await expectImageLoads(page.getByTestId("trip-cover-image").first());

  // 2. Coach UPI QR upload in payout settings.
  await page.goto(`${tripPath}/settings`);
  await page.fill("#upiVpa", "tara.coach@okicici");
  await page.locator('input[type=file][name="upiQr"]').setInputFiles(NARROW);
  await expect(page.locator('label:has(input[name="upiQr"]) img')).toBeVisible();
  await page.locator("form:has(#upiVpa)").getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Payout details saved")).toBeVisible();
  await page.reload();
  await expectImageLoads(page.locator('label:has(input[name="upiQr"]) img'));

  // 3. Receipt photo on an expense.
  await page.goto(`${tripPath}/expenses/new`);
  await page.fill("#amount", "1200");
  await page.fill("#title", "Lunch with receipt");
  await page.locator('label:has-text("Add receipt") input[type=file]').setInputFiles(NARROW);
  await expect(page.getByRole("button", { name: "Remove receipt" })).toBeVisible();
  await page.getByRole("button", { name: "Save expense" }).click();
  await page.waitForURL(/\/expenses\?saved=1/);
  await page.getByRole("link", { name: /Lunch with receipt/ }).click();
  await expectImageLoads(page.getByRole("img", { name: "Receipt photos" }).first());

  // 4. Payment proof screenshot from a member.
  const member = await joinAsGuest(browser, await inviteLink(page, tripPath), "Vikram");
  await addEqualExpense(page, tripPath, "Cab", "800");
  await member.goto(`${tripPath}/settle`);
  await member.locator("[data-testid^=pay-]").first().click();
  await member.getByTestId("i-have-paid").click();
  await member.locator('input[type=file][name="proof"]').setInputFiles(NARROW);
  await expect(member.locator('label:has(input[name="proof"]) img')).toBeVisible();
  await member.getByTestId("submit-payment").click();
  await expect(member.getByText(/Sent to .* for approval/)).toBeVisible();

  await page.goto(`${tripPath}/payments`);
  const proofLink = page.getByRole("link", { name: "View screenshot" }).first();
  await expect(proofLink).toBeVisible();
  await expectFileServed(page, await proofLink.getAttribute("href"));
});
