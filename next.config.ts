import type { NextConfig } from "next";
const config: NextConfig = {
  serverExternalPackages: ["postgres"],
  devIndicators: false,
  poweredByHeader: false,
};
export default config;
