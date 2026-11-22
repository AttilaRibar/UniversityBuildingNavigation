import type { NextConfig } from "next";

/**
 * The app is a fully static export: there is no backend, no login and nothing
 * to store server-side. The `out/` folder can be hosted on any static host.
 */
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  // Inlined at build time: "production" or "preview" on Vercel, empty elsewhere (local, CI).
  // Vercel Web Analytics only exists on Vercel; PostHog events are tagged with it.
  env: { MERRE_DEPLOY_ENV: process.env.VERCEL_ENV ?? "" },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
