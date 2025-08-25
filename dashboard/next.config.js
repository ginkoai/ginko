/**
 * @fileType: config
 * @status: current
 * @updated: 2025-08-14
 * @tags: [nextjs, config, build, deployment, vercel]
 * @related: [tailwind.config.js, package.json, middleware.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [next, vercel]
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js 14 App Router is stable, no need for experimental flag
  eslint: {
    // Don't fail build on ESLint errors in production
    ignoreDuringBuilds: process.env.NODE_ENV === 'production',
  },
  typescript: {
    // Don't fail build on TypeScript errors in production (handled by prebuild)
    ignoreBuildErrors: process.env.NODE_ENV === 'production',
  },
  images: {
    domains: [
      'localhost', 
      'supabase.co', 
      '*.supabase.co',
      'ginko.ai',
      'www.ginko.ai'
    ],
    formats: ['image/webp', 'image/avif'],
  },
  // Output standalone for better Vercel performance
  output: 'standalone',
  // Optimize for Vercel deployment
  poweredByHeader: false,
  compress: true,
  // Environment variables
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
          { key: 'Access-Control-Max-Age', value: '86400' },
        ]
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ]
      }
    ]
  },
  async rewrites() {
    // In development, proxy MCP API requests to the real backend server
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/api/mcp/:path*',
          destination: 'http://localhost:3031/api/mcp/:path*',
        },
        {
          source: '/api/:path*',
          destination: '/api/:path*',
        }
      ]
    }
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      }
    ]
  },
  // Optimize bundle size
  experimental: {
    scrollRestoration: true,
  },
}

module.exports = nextConfig