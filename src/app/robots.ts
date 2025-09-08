import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/admin/',
        '/_next/',
        '/dashboard/',
        '/workflows/*/executions/',
        '/connections/*/secrets/',
        '/secrets/*/',
        '/oauth/',
        '/verify/',
        '/reset-password/',
        '/forgot-password/',
        '/resend-verification/',
      ],
    },
    sitemap: 'https://apiq.co/sitemap.xml',
  }
}
