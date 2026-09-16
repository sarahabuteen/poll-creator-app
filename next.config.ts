import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite ships a WASM Postgres build that has to be loaded from node_modules, not bundled.
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
