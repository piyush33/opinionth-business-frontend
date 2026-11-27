import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    formats: ["image/avif", "image/webp"],
  },

  // One address for the site: send www.collabrr.io to collabrr.io, keeping
  // the path and query, with a permanent redirect search engines follow.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.collabrr.io" }],
        destination: "https://collabrr.io/:path*",
        permanent: true,
      },
    ];
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
