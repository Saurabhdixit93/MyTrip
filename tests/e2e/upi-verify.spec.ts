import { devices, expect, test, type Locator } from "@playwright/test";
import jsQR from "jsqr";
import QRCode from "qrcode";
import sharp from "sharp";
import { addEqualExpense, createTrip, devLogin, inviteLink, joinAsGuest, uniqueEmail } from "./helpers";

async function decodeOnScreen(locator: Locator): Promise<string | undefined> {
  const shot = await locator.screenshot();
  const { data, info } = await sharp(shot).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return jsQR(new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength), info.width, info.height)?.data;
}

test("Coach UPI setup: handle typo hint, QR auto-fill, wrong/foreign QR rejected, name verification; members get one-tap app links + amount QR", async ({ page, browser }, testInfo) => {
  test.setTimeout(240_000);
  const qrFile = async (name: string, text: string) => {
    const file = testInfo.outputPath(`${name}.png`);
    await QRCode.toFile(file, text, { width: 600, margin: 2 });
    return file;
  };
  const coachQr = await qrFile("coach-upi", "upi://pay?pa=meera.coach@okaxis&pn=Meera%20Iyer&mc=0000&mode=02");
  const linkQr = await qrFile("not-upi", "https://example.com/hello");
  const otherQr = await qrFile("other-upi", "upi://pay?pa=someone.else@ybl&pn=Someone");

  await devLogin(page, uniqueEmail("upicheck"), "Meera");
  const { tripPath } = await createTrip(page, "Kerala Backwaters");
  await page.goto(`${tripPath}/settings`);

  // 1. Typo in the handle → suggestion.
  await page.fill("#upiVpa", "meera@okhdfc");
  await expect(page.getByTestId("upi-handle-hint")).toContainText("Did you mean @okhdfcbank?");
  await page.getByRole("button", { name: "Use @okhdfcbank" }).click();
  await expect(page.locator("#upiVpa")).toHaveValue("meera@okhdfcbank");

  // 2. Upload only the QR → UPI ID + name are read from it and saved.
  await page.fill("#upiVpa", "");
  await page.locator('input[type=file][name="upiQr"]').setInputFiles(coachQr);
  await expect(page.getByTestId("upi-qr-status")).toContainText("QR pays meera.coach@okaxis (Meera Iyer)");
  await expect(page.locator("#upiVpa")).toHaveValue("meera.coach@okaxis");
  await expect(page.locator("#upiPayeeName")).toHaveValue("Meera Iyer");
  await page.locator("form:has(#upiVpa)").getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Payout details saved")).toBeVisible();
  await page.reload();
  await expect(page.locator("#upiVpa")).toHaveValue("meera.coach@okaxis");

  // 3. A non-UPI QR is rejected (client hint + server check).
  await page.locator('input[type=file][name="upiQr"]').setInputFiles(linkQr);
  await expect(page.getByTestId("upi-qr-status")).toContainText("doesn't contain a UPI QR");
  await page.locator("form:has(#upiVpa)").getByRole("button", { name: "Save" }).click();
  await expect(page.getByTestId("upi-qr-error")).toContainText("isn't a UPI payment QR");

  // 4. Someone else's UPI QR is rejected.
  await page.reload();
  await page.locator('input[type=file][name="upiQr"]').setInputFiles(otherQr);
  await expect(page.getByTestId("upi-qr-status")).toContainText("This QR pays someone.else@ybl, not meera.coach@okaxis");
  await page.locator("form:has(#upiVpa)").getByRole("button", { name: "Save" }).click();
  await expect(page.getByTestId("upi-qr-error")).toContainText("This QR pays someone.else@ybl");

  // 5. Name check: the ₹1 test QR really encodes the Coach's UPI ID; then confirm.
  await page.reload();
  const verify = page.getByTestId("upi-verify");
  await expect(verify).toBeVisible();
  const testLink = await decodeOnScreen(verify.locator("[data-qr-ready=true]"));
  expect(testLink).toBe("upi://pay?pa=meera.coach%40okaxis&pn=Meera%20Iyer&am=1.00&cu=INR&tn=MyTrip%20UPI%20check");
  await page.getByTestId("confirm-upi-verified").click();
  await expect(page.getByTestId("upi-verified")).toBeVisible();

  // 6. Android member: one-tap app links + scannable QR, all with the exact amount.
  const link = await inviteLink(page, tripPath);
  const android = await joinAsGuest(browser, link, "Arjun");
  await addEqualExpense(page, tripPath, "Houseboat", "3000");
  await android.goto(`${tripPath}/settle`);
  await android.locator("[data-testid^=pay-]").first().click();
  const query = "pa=meera.coach%40okaxis&pn=Meera%20Iyer&am=1500.00&cu=INR&tn=Kerala%20Backwaters%20-%20Arjun";
  await expect(android.getByTestId("payee-verified")).toBeVisible();
  await expect(android.getByTestId("upi-pay-now")).toHaveAttribute("href", `upi://pay?${query}`);
  await expect(android.getByTestId("upi-app-gpay")).toHaveAttribute("href", `intent://pay?${query}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`);
  await expect(android.getByTestId("upi-app-phonepe")).toHaveAttribute("href", /package=com\.phonepe\.app;end$/);
  await expect(android.getByTestId("upi-app-paytm")).toHaveAttribute("href", /package=net\.one97\.paytm;end$/);
  expect(await decodeOnScreen(android.getByTestId("upi-qr").locator("[data-qr-ready=true]"))).toBe(`upi://pay?${query}`);

  // 7. iPhone member: app-specific schemes (iOS has no UPI chooser).
  const iosCtx = await browser.newContext({ ...devices["iPhone 14"] });
  const ios = await iosCtx.newPage();
  await ios.goto(link);
  await ios.fill("#displayName", "Isha");
  await ios.getByRole("button", { name: "Join trip" }).click();
  await ios.waitForURL(/\/trips\/[a-z0-9]+\?joined=1/);
  await addEqualExpense(page, tripPath, "Boat lunch", "900");
  await ios.goto(`${tripPath}/settle`);
  await ios.locator("[data-testid^=pay-]").first().click();
  await expect(ios.getByTestId("upi-app-gpay")).toHaveAttribute("href", /^gpay:\/\/upi\/pay\?pa=meera\.coach%40okaxis&pn=Meera%20Iyer&am=\d+\.\d{2}&cu=INR/);
  await expect(ios.getByTestId("upi-app-phonepe")).toHaveAttribute("href", /^phonepe:\/\/pay\?/);
  await expect(ios.getByTestId("upi-app-paytm")).toHaveAttribute("href", /^paytmmp:\/\/pay\?/);
  await iosCtx.close();
});
