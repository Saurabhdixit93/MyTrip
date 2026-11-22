import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/privacy", "/terms"],
        disallow: ["/trips", "/join", "/login", "/api/", "/serwist/", "/~offline", "/share-target"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
