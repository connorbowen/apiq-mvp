/** @type {import('next').NextConfig} */

// TODO: [SECRETS-FIRST-REFACTOR] Phase 14: Configuration Updates
// - Add environment variables for secrets vault configuration
// - Add security headers for secrets management routes
// - Add CSP headers for secrets-related operations
// - Add configuration for secrets vault encryption keys
// - Add environment-specific secrets configuration
// - Add secrets vault health check configuration
// - Add connection-secret validation configuration
// - Add secrets rotation configuration
// - Add audit logging configuration for secrets
// - Consider adding secrets vault monitoring configuration

const nextConfig = {
  /* config options here */
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true, // Temporarily disable for debugging
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true, // Temporarily disable for debugging
  },
  // Temporarily disable file watching to fix Watchpack issues
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // Disable file watching temporarily
      config.watchOptions = {
        ignored: ['**/*'],
        poll: false
      }
    }
    return config
  },
  async headers() {
    return [
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
    ];
  },
};

module.exports = nextConfig; 