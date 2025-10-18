// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NEXT_PUBLIC_API_PROXY || 'http://localhost:3002/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
