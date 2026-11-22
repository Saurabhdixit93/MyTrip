import { createSerwistRoute } from "@serwist/turbopack";

const revision = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.BUILD_ID ?? crypto.randomUUID();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute({
  swSrc: "app/sw.ts",
  useNativeEsbuild: true,
  additionalPrecacheEntries: [{ url: "/~offline", revision }],
  // Precache the app shell + small icons only; splash screens and store screenshots are fetched on demand.
  globPatterns: [
    ".next/static/**/*.{js,css,woff2}",
    "public/icons/icon-{96,192,512}.png",
    "public/icons/maskable-192.png",
    "public/favicon.svg",
  ],
});
