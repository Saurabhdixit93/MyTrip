export const siteConfig = {
  name: "MyTrip",
  shortName: "MyTrip",
  tagline: "Split trips, not friendships.",
  description:
    "MyTrip is the free group-trip expense splitter for India. Add expenses, see who owes whom, and settle up with the trip Coach over UPI in one tap.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  themeColor: "#0F766E",
  backgroundColor: "#F4FAF9",
  locale: "en_IN",
  keywords: [
    "split trip expenses",
    "group trip expense manager",
    "UPI split bill",
    "trip expense calculator India",
    "splitwise alternative",
    "college trip expenses",
  ],
  twitter: "@mytripapp",
} as const;

export function absoluteUrl(path = "/") {
  return new URL(path, siteConfig.url).toString();
}
