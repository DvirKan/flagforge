import type { MetadataRoute } from "next";
import { brand } from "@/config/brand";

/**
 * Web app manifest: lets phones install FLAGFORGE to the home screen and open it full-screen like an app.
 * Served at /manifest.webmanifest. No service worker — the game needs the server for every answer anyway.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: brand.name,
    short_name: brand.name,
    description: "Five flags a day, the same for everyone. · חמישה דגלים ביום, אותם דגלים לכולם.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f1ebdd",
    theme_color: "#f1ebdd",
    categories: ["games", "education"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
