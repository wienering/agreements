/** @type {import('next').NextConfig} */
const nextConfig = {
  // App directory is enabled by default in Next.js 13+
  reactStrictMode: false, // Disabled to prevent double loading in development
  eslint: { ignoreDuringBuilds: true },
}

module.exports = nextConfig
