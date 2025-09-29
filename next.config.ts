import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    formats: ["image/avif", "image/webp"],
  },

  async rewrites() {
    return [
      {
        source: "/nest-api/:path*",
        destination: "https://dn2h1x2q2afc3.cloudfront.net/:path*",
      },
    ];
  },
};

export default nextConfig;
