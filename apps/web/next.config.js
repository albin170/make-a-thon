/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
  images: {
    domains: ['localhost'],
  },
  async rewrites() {
    const targetApiUrl = (process.env.NEXT_PUBLIC_API_URL || 'https://brightloop-sms-api.onrender.com/api/v1').replace(/\/+$/, '');
    return [
      {
        source: '/api/v1/:path*',
        destination: `${targetApiUrl}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
