import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",     // matches any hostname
        port: "",
        pathname: "/**",     // matches any path
      },
    ],
  },
};

export default nextConfig;
