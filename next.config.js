/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production'
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.startpage.com',
      },
      {
        protocol: 'https',
        hostname: 'tse2.mm.bing.net',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          { key: 'X-XSS-Protection', value: '0' },
          // HSTS (enable for all; browsers ignore on http)
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          // Content Security Policy (looser in development for HMR)
          (() => {
            const scriptSrc = [
              "'self'",
              "'unsafe-inline'",
              'https://www.googletagmanager.com',
              'https://www.google-analytics.com',
              'https://analytics.umami.is',
            ]
            if (!isProd) scriptSrc.push("'unsafe-eval'")

            const connectSrc = [
              "'self'",
              'https://www.google-analytics.com',
              'https://analytics.umami.is',
            ]
            if (!isProd) connectSrc.push('ws:', 'wss:')

            const csp = [
              "default-src 'self'",
              `script-src ${scriptSrc.join(' ')}`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https: https://images.unsplash.com https://www.startpage.com https://tse2.mm.bing.net",
              `connect-src ${connectSrc.join(' ')}`,
              "font-src 'self' data:",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; ')
            return { key: 'Content-Security-Policy', value: csp }
          })(),
        ],
      },
    ];
  },
};

module.exports = nextConfig;
