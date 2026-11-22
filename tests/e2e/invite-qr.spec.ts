import { expect, test } from "@playwright/test";
import jsQR from "jsqr";
import sharp from "sharp";
import { createTrip, devLogin, inviteLink, uniqueEmail } from "./helpers";

test("branded invite QR (logo in centre) scans to the invite link and joins the trip", async ({ page, browser }) => {
  await devLogin(page, uniqueEmail("qr"), "Nisha");
  const { tripPath } = await createTrip(page, "Hampi Heritage Walk");
  const link = await inviteLink(page, tripPath);

  await page.getByRole("button", { name: "Show QR" }).click();
  const qr = page.locator("[data-qr-ready=true]");
  await expect(qr).toBeVisible();

  // Decode exactly what the user sees on screen.
  const shot = await qr.screenshot();
  const { data, info } = await sharp(shot).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const decoded = jsQR(new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength), info.width, info.height)?.data;
  expect(decoded).toBe(link);

  // The scanned link really works: a new guest joins with it.
  const ctx = await browser.newContext();
  const guest = await ctx.newPage();
  await guest.goto(decoded ?? "");
  await guest.fill("#displayName", "Scanner");
  await guest.getByRole("button", { name: "Join trip" }).click();
  await guest.waitForURL(/\/trips\/[a-z0-9]+\?joined=1/);
  await ctx.close();
});
