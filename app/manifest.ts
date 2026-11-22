import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: `${siteConfig.name}: group trip expenses & UPI`,
    short_name: siteConfig.shortName,
    description: siteConfig.description,
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait",
    theme_color: siteConfig.themeColor,
    background_color: siteConfig.backgroundColor,
    categories: ["finance", "travel", "productivity"],
    lang: "en-IN",
    dir: "ltr",
    prefer_related_applications: false,
    icons: [
      ...ICON_SIZES.map((size) => ({
        src: `/icons/icon-${size}.png`,
        sizes: `${size}x${size}`,
        type: "image/png",
        purpose: "any" as const,
      })),
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    screenshots: [
      { src: "/screenshots/narrow.png", sizes: "1080x1920", type: "image/png", form_factor: "narrow", label: "Trip dashboard" },
      { src: "/screenshots/wide.png", sizes: "1920x1080", type: "image/png", form_factor: "wide", label: "Trip dashboard on desktop" },
    ],
    shortcuts: [
      {
        name: "Add Expense",
        short_name: "Add",
        url: "/trips?action=add-expense&source=shortcut",
        icons: [{ src: "/icons/icon-96.png", sizes: "96x96", type: "image/png" }],
      },
      {
        name: "My Dues",
        short_name: "Dues",
        url: "/trips?action=dues&source=shortcut",
        icons: [{ src: "/icons/icon-96.png", sizes: "96x96", type: "image/png" }],
      },
      {
        name: "New Trip",
        short_name: "New",
        url: "/trips/new?source=shortcut",
        icons: [{ src: "/icons/icon-96.png", sizes: "96x96", type: "image/png" }],
      },
    ],
    share_target: {
      action: "/share-target",
      method: "POST",
      enctype: "multipart/form-data",
      params: {
        title: "title",
        text: "text",
        files: [{ name: "receipt", accept: ["image/*"] }],
      },
    },
  };
}
