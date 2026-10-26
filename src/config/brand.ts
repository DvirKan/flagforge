/**
 * Brand configuration. The product name is provisional — change it here (or via env) without touching components.
 */
export const brand = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME ?? "FLAGFORGE",
  /** Shown in the masthead as a cartographic signature (Jerusalem). */
  coordinates: "31°46′N 35°13′E",
} as const;
