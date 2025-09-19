// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "d3kv9nj5wp3sq6.cloudfront.net",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      { protocol: "https", hostname: "**.amazonaws.com", pathname: "/**" },
    ],
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
