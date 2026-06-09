/** @type {import('next').NextConfig} */
const nextConfig = {
  // App directory is enabled by default in Next.js 13+
  reactStrictMode: false, // Disabled to prevent double loading in development
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    // Allow file uploads up to 10MB. Vercel has a 4.5MB limit; self-hosted can use this.
    proxyClientMaxBodySize: '10mb',
    middlewareClientMaxBodySize: '10mb',
  },
}

module.exports = nextConfig
