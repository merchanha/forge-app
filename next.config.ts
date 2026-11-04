import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Playwright and local tooling hit the dev server via 127.0.0.1.
  allowedDevOrigins: ["127.0.0.1"],
  turbopack: {
    // Keep Turbopack rooted in this repo (avoids picking up parent lockfiles).
    root: projectRoot,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
