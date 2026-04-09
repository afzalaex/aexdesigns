import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/collections/pixcapes",
        destination: "/pixcapes",
        permanent: true,
      },
      {
        source: "/designassetpack1",
        destination: "/dsp1",
        permanent: true,
      },
      {
        source: "/designassetpack2",
        destination: "/dsp2",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
