import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, ".."),
  experimental: {
    proxyClientMaxBodySize: 51_000_000, // 50 MB CSV plus multipart metadata.
    proxyTimeout: 600_000, // Large imports validate and commit in one atomic request.
  },
  async rewrites() {
    const backend = process.env.DOCKER_BACKEND_URL;
    return backend ? [{ source: "/api/:path*", destination: `${backend}/:path*` }] : [];
  },
};

export default nextConfig;
