import { expect, test } from "@playwright/test";
import { createTrip, devLogin, uniqueEmail } from "./helpers";

test.describe("trip cover image", () => {
  test("cover from a pasted image link is imported, stored and shown", async ({ page, baseURL }) => {
    await devLogin(page, uniqueEmail("cover"), "Cover Coach");
    // The app serves its own icon, which stands in for any public image URL.
    const { tripPath } = await createTrip(page, "Ladakh Ride", { coverUrl: `${baseURL}/icons/icon-512.png` });

    await page.goto(tripPath);
    const cover = page.getByTestId("trip-cover-image").first();
    await expect(cover).toHaveAttribute("src", /^\/api\/files\/trips\/.+\/cover\/.+\.png$/);
    await expect.poll(() => cover.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth)).toBe(512);

    // Change it via settings using a different link.
    await page.goto(`${tripPath}/settings`);
    await page.getByTestId("cover-mode-link").click();
    await page.getByTestId("cover-url").fill(`${baseURL}/icons/icon-192.png`);
    await page.getByRole("button", { name: "Save" }).first().click();
    await expect(page.getByText("Trip saved")).toBeVisible();
    await page.goto(tripPath);
    await expect.poll(() => page.getByTestId("trip-cover-image").first().evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(192);
  });

  test("a link that isn't an image shows a clear error", async ({ page, baseURL }) => {
    await devLogin(page, uniqueEmail("badcover"), "Bad Cover");
    await page.goto("/trips/new");
    await page.fill("#name", "Broken cover trip");
    await page.getByTestId("cover-mode-link").click();
    await page.getByTestId("cover-url").fill(`${baseURL}/robots.txt`);
    await page.getByRole("button", { name: "Create trip" }).click();
    await expect(page.locator("#coverUrl-error")).toContainText(/isn't a JPG, PNG, WebP, GIF or AVIF image/);
    await expect(page).toHaveURL(/\/trips\/new$/);
  });
});
