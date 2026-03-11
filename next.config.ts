import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/collections/pixcapes",
        destination: "/pixcapes",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
