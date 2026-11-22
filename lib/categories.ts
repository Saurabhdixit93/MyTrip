import type { ExpenseCategory } from "@/db/generated/enums";

export const CATEGORIES = ["FOOD", "TRAVEL", "STAY", "ACTIVITIES", "SHOPPING", "FUEL", "TICKETS", "OTHER"] as const satisfies readonly ExpenseCategory[];

export const CATEGORY_EMOJI: Record<ExpenseCategory, string> = {
  FOOD: "🍽️",
  TRAVEL: "🚕",
  STAY: "🏨",
  ACTIVITIES: "🏄",
  SHOPPING: "🛍️",
  FUEL: "⛽",
  TICKETS: "🎟️",
  OTHER: "🧾",
};
