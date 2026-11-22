/// <reference lib="webworker" />
import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

export const SHARE_CACHE = "mytrip-share-target";
export const SHARED_RECEIPT_URL = "/__shared-receipt";

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  // Wait for the user to accept the "New version" toast before activating.
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

// Web Share Target: a receipt image shared from the OS share sheet is stashed in the
// cache, then the user is sent to pick a trip and attach it to a new expense.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "POST" || url.pathname !== "/share-target") return;
  event.respondWith(
    (async () => {
      const form = await event.request.formData();
      const file = form.get("receipt");
      if (file instanceof File) {
        const cache = await caches.open(SHARE_CACHE);
        await cache.put(SHARED_RECEIPT_URL, new Response(file, { headers: { "Content-Type": file.type, "X-File-Name": encodeURIComponent(file.name) } }));
      }
      return Response.redirect("/trips?shared=receipt", 303);
    })(),
  );
});

serwist.addEventListeners();
