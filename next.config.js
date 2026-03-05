/** @type {import('next').NextConfig} */
const nextConfig = {
  // App directory is enabled by default in Next.js 13+
  reactStrictMode: false, // Disabled to prevent double loading in development
  experimental: {
    // Allow large file uploads (100MB). Default is 10MB - files over that were rejected before reaching the API.
    // Note: If deployed on Vercel, the platform has a hard 4.5MB request body limit that cannot be increased.
    proxyClientMaxBodySize: '100mb',
    middlewareClientMaxBodySize: '100mb',
  },
}

module.exports = nextConfig
