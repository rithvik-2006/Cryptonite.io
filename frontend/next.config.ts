import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/gateway/:path*',
        destination: 'http://localhost:8081/:path*',
      },
      {
        source: '/api/brain/:path*',
        destination: 'http://localhost:8000/:path*',
      },
    ];
  },
};

export default nextConfig;
