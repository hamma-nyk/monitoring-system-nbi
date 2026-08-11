import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.10.25", "192.168.10.16", "192.168.10.8"],
  serverExternalPackages: ["ssh2"],
};

export default nextConfig;
