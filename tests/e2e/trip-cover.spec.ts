import { expect, test } from "@playwright/test";
import { createTrip, devLogin, inviteLink, uniqueEmail } from "./helpers";

test.describe("trip cover image", () => {
  test("cover from a pasted image link is imported, stored and shown", async ({ page, baseURL }) => {
    await devLogin(page, uniqueEmail("cover"), "Cover Coach");
    // The app serves its own icon, which stands in for any public image URL.
    const { tripPath } = await createTrip(page, "Ladakh Ride", { coverUrl: `${baseURL}/icons/icon-512.png` });

    await page.goto(tripPath);
    const cover = page.getByTestId("trip-cover-image").first();
    // Linked images are re-encoded to an optimised WebP before storing.
    await expect(cover).toHaveAttribute("src", /^\/api\/files\/trips\/.+\/cover\/.+\.webp$/);
    await expect.poll(() => cover.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth), { timeout: 30_000 }).toBe(512);

    // Invitees (not members yet, signed out) see the cover on the join screen…
    const privateSrc = await cover.getAttribute("src");
    const link = await inviteLink(page, tripPath);
    const guest = await (await page.context().browser()?.newContext())?.newPage();
    if (!guest) throw new Error("no browser");
    await guest.goto(link);
    const joinCover = guest.getByTestId("trip-cover-image");
    await expect(joinCover).toHaveAttribute("src", /^\/api\/invite-cover\//);
    await expect.poll(() => joinCover.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth), { timeout: 30_000 }).toBe(512);
    // …but the trip's private file URLs stay locked for them.
    expect((await guest.request.get(privateSrc ?? "")).status()).toBe(401);
    await guest.context().close();

    // Change it via settings using a different link.
    await page.goto(`${tripPath}/settings`);
    await page.getByTestId("cover-mode-link").click();
    await page.getByTestId("cover-url").fill(`${baseURL}/icons/icon-192.png`);
    await page.getByRole("button", { name: "Save" }).first().click();
    await expect(page.getByText("Trip saved")).toBeVisible();
    await page.goto(tripPath);
    await expect.poll(() => page.getByTestId("trip-cover-image").first().evaluate((img: HTMLImageElement) => img.naturalWidth), { timeout: 30_000 }).toBe(192);
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
