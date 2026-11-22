import { expect, test } from "@playwright/test";
import { addEqualExpense, createTrip, devLogin, uniqueEmail } from "./helpers";

test("create trip → add expense → see balances", async ({ page }) => {
  await devLogin(page, uniqueEmail("coach"), "Asha");
  const { tripPath } = await createTrip(page, "Rishikesh Rafting");

  // Placeholder member who hasn't joined yet.
  await page.fill("#displayName", "Kabir");
  await page.getByRole("button", { name: "Add member" }).click();
  await expect(page.getByText("Kabir added")).toBeVisible();

  await addEqualExpense(page, tripPath, "Rafting tickets", "1001");

  await page.goto(tripPath);
  // ₹1001 split equally: the leftover paisa goes to one person deterministically.
  const dues = page.getByTestId("dues-card");
  await expect(dues).toContainText("Members owe you");
  await expect(page.getByTestId("you-get")).toHaveText(/₹500\.(50|49)/);

  await page.goto(`${tripPath}/settle`);
  await expect(page.getByTestId("settlement-plan")).toContainText("Kabir");
  await expect(page.getByTestId("settlement-plan")).toContainText(/₹500\.(50|49)/);
});
