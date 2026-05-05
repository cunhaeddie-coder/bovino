import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "http",  hostname: "localhost" },
      { protocol: "https", hostname: "**.r2.cloudflarestorage.com" },
      { protocol: "https", hostname: "*.ngrok-free.app" },
      { protocol: "https", hostname: "*.ngrok.io" },
    ],
  },
  async rewrites() {
    const apiBase = process.env.INTERNAL_API_URL ?? "http://localhost:8000";
    return [
      {
        source: "/api/:path*",
        destination: `${apiBase}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
