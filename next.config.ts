import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Redirect www to non-www (preferred canonical domain)
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.aex.design" }],
        destination: "https://aex.design/:path*",
        permanent: true,
      },
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
      // Notion shell page under Tools/Assets → real app route
      {
        source: "/type-playground",
        destination: "/typeplayground",
        permanent: true,
      },
      // Old Assets slug → Tools/Assets
      {
        source: "/assets",
        destination: "/ta",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
