import { expect, test } from "@playwright/test";
import { addEqualExpense, createTrip, devLogin, inviteLink, joinAsGuest, uniqueEmail } from "./helpers";

test("member pays the Coach via UPI → Coach verifies → all clear", async ({ page, browser }) => {
  await devLogin(page, uniqueEmail("upicoach"), "Meera");
  const { tripPath } = await createTrip(page, "Coorg Weekend");

  await page.goto(`${tripPath}/settings`);
  await page.fill("#upiVpa", "meera.coach@okaxis");
  await page.fill("#upiPayeeName", "Meera Iyer");
  await page.locator("form:has(#upiVpa)").getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Payout details saved")).toBeVisible();

  const member = await joinAsGuest(browser, await inviteLink(page, tripPath), "Arjun");
  await addEqualExpense(page, tripPath, "Homestay", "3000");

  // Member: pay ₹1,500 through the UPI sheet.
  await member.goto(`${tripPath}/settle`);
  await member.locator("[data-testid^=pay-]").first().click();
  const payNow = member.getByTestId("upi-pay-now");
  await expect(payNow).toHaveAttribute("href", "upi://pay?pa=meera.coach%40okaxis&pn=Meera%20Iyer&am=1500.00&cu=INR&tn=Coorg%20Weekend%20-%20Arjun");
  await member.getByTestId("i-have-paid").click();
  await member.fill("#utr", "412345678901");
  await member.getByTestId("submit-payment").click();
  await expect(member.getByText("Sent to Meera for approval")).toBeVisible();

  // Coach: review badge → approve.
  await page.goto(tripPath);
  await expect(page.getByTestId("review-badge")).toContainText("1 to review");
  await page.goto(`${tripPath}/payments`);
  await expect(page.getByTestId("review-list")).toContainText("412345678901");
  await page.locator("[data-testid^=approve-]").first().click();
  await expect(page.getByText("Payment verified")).toBeVisible();

  // Everyone is square now.
  await member.goto(`${tripPath}/settle`);
  await expect(member.getByTestId("all-clear")).toBeVisible();
  await member.goto(tripPath);
  await expect(member.getByTestId("dues-card")).toContainText("You're all settled");
});
