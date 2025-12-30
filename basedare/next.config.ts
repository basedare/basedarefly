import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 1. Allow External Images (Fixes the 404s on optimization)
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com", // For the Holo Card textures
      },
    ],
  },
  // 2. Suppress the COOP/COEP errors by setting permissive headers for Dev
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups", // Softer policy prevents the error
          },
        ],
      },
    ];
  },
};

export default nextConfig;
