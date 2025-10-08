/** @type {import('next').NextConfig} */

// Secrets Vault Configuration (see .env.example for details)
// - ENCRYPTION_MASTER_KEY, ENCRYPTION_KEY
// - SECRETS_VAULT_HEALTHCHECK_ENABLED
// - SECRETS_CONNECTION_VALIDATION_ENABLED
// - SECRETS_ROTATION_ENABLED
// - SECRETS_AUDIT_LOGGING_ENABLED
// - SECRETS_VAULT_MONITORING_ENABLED

const nextConfig = {
  /* config options here */
      typescript: {
        // !! WARN !!
        // Dangerously allow production builds to successfully complete even if
        // your project has type errors.
        // !! WARN !!
        ignoreBuildErrors: true, // Keep disabled due to Next.js 15 type generation bug
      },
  // Increase API route timeout for long-running operations
  serverExternalPackages: [],
  // experimental: {
  //   // Enable Next.js 15 features
  //   typedRoutes: false, // Disable typed routes for now to avoid conflicts
  // },
  // API route configuration is handled in individual API routes
  // No global API configuration needed for Next.js 15
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: false, // Re-enabled after successful Next.js 15 upgrade
  },
  // SEO and Performance Optimizations
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  // Ensure proper static asset serving
  trailingSlash: false,
  assetPrefix: '',
  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
      // Webpack configuration for development and production
      webpack: (config, { dev, isServer }) => {
        // Fix for Next.js 15 webpack chunking issues - only apply to client-side
        if (!isServer) {
          config.optimization = {
            ...config.optimization,
            splitChunks: {
              chunks: 'all',
              cacheGroups: {
                default: {
                  minChunks: 1,
                  priority: -20,
                  reuseExistingChunk: true,
                },
                vendor: {
                  test: /[\\/]node_modules[\\/]/,
                  name: 'vendors',
                  priority: -10,
                  chunks: 'all',
                },
              },
            },
          };

          // Fix for app-pages-internals.js serving issue
          config.resolve.fallback = {
            ...config.resolve.fallback,
            fs: false,
            net: false,
            tls: false,
            crypto: false,
            stream: false,
            url: false,
            zlib: false,
            http: false,
            https: false,
            assert: false,
            os: false,
            path: false,
          };

          // Ensure proper asset versioning for all chunks
          config.output = {
            ...config.output,
            filename: dev ? 'static/chunks/[name].js' : 'static/chunks/[name].[contenthash].js',
            chunkFilename: dev ? 'static/chunks/[name].js' : 'static/chunks/[name].[contenthash].js',
          };
        }

        return config
      },
  async headers() {
    return [
      // Global security headers
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'same-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      // Secrets management API: add extra security and CSP headers
      {
        source: '/api/secrets/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: "default-src 'none'; frame-ancestors 'none';" },
          { key: 'Cache-Control', value: 'no-store' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'same-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      // Connection-specific secrets API
      {
        source: '/api/connections/:id/secrets(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: "default-src 'none'; frame-ancestors 'none';" },
          { key: 'Cache-Control', value: 'no-store' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'same-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

module.exports = nextConfig; 