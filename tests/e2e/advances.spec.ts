import { expect, test } from "@playwright/test";
import { addEqualExpense, createTrip, devLogin, inviteLink, joinAsGuest, uniqueEmail } from "./helpers";

/**
 * Advances flow + statement maths:
 *   Aman gives the Coach ₹5,000 → Coach pays ₹3,000 dinner split 2 ways (₹1,500 each)
 *   ⇒ Coach owes Aman ₹3,500. Cancelling the advance flips it: Aman owes ₹1,500.
 */
test("advances: record, approve, cancel, and the statement stays exact", async ({ page, browser }) => {
  test.setTimeout(180_000);
  await devLogin(page, uniqueEmail("advcoach"), "Kiran");
  const { tripPath } = await createTrip(page, "Ladakh Bikers");
  await page.fill("#displayName", "Aman");
  await page.getByRole("button", { name: "Add member" }).click();
  await expect(page.getByText("Aman added")).toBeVisible();

  // Coach records Aman's ₹5,000 advance (counts immediately: the receiver is recording it).
  await page.goto(`${tripPath}/expenses/advances`);
  await expect(page.getByTestId("advances-total")).toHaveText("₹0.00");
  await page.getByTestId("record-advance").click();
  await page.locator("#adv-from").selectOption({ label: "Aman" });
  await page.fill("#adv-amount", "5000");
  await page.fill("#adv-note", "Advance for bikes");
  await page.getByTestId("save-advance").click();
  await expect(page.getByText("Advance recorded")).toBeVisible();
  await expect(page.getByTestId("advances-total")).toHaveText("₹5,000.00");

  await addEqualExpense(page, tripPath, "Dinner", "3000");

  await page.goto(tripPath);
  await expect(page.getByText("Advances collected")).toBeVisible();
  await page.goto(`${tripPath}/settle`);
  await expect(page.getByTestId("my-transfers")).toContainText("You pay Aman");
  await expect(page.getByTestId("my-transfers")).toContainText("₹3,500.00");

  // Aman's statement: +5,000 advance − 1,500 share = gets back 3,500.
  await page.getByRole("link", { name: "View statement: Aman" }).click();
  await expect(page.getByTestId("hisab-net")).toContainText("Gets back ₹3,500.00");
  await expect(page.getByTestId("hisab-entries")).toContainText("Advance to You");
  await expect(page.getByTestId("hisab-entries")).toContainText("Share of Dinner");
  const amanHisab = page.url();

  // A member reports an advance they gave → waits for the Coach's approval.
  const member = await joinAsGuest(browser, await inviteLink(page, tripPath), "Neha");
  await member.goto(`${tripPath}/expenses/advances`);
  await member.getByTestId("record-advance").click();
  await member.fill("#adv-amount", "1000");
  await member.getByTestId("save-advance").click();
  await expect(member.getByText(/Sent to Kiran for approval/)).toBeVisible();

  await page.goto(`${tripPath}/expenses/advances`);
  await expect(page.getByTestId("advances-summary")).toContainText("₹1,000.00 awaiting approval");
  await page.locator("[data-testid^=approve-]").first().click();
  await expect(page.getByText("Payment verified")).toBeVisible();
  await expect(page.getByTestId("advances-total")).toHaveText("₹6,000.00");

  // Cancel Aman's advance (e.g. entered by mistake) → balances recalculate.
  page.once("dialog", (d) => void d.accept());
  await page.getByTestId("advance-list").locator("li", { hasText: "Aman" }).getByRole("button", { name: "Cancel advance" }).click();
  await expect(page.getByText("Advance cancelled")).toBeVisible();
  await expect(page.getByTestId("advances-total")).toHaveText("₹1,000.00");
  await page.goto(amanHisab);
  await expect(page.getByTestId("hisab-net")).toContainText("Owes ₹1,500.00");
});
