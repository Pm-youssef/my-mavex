/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || 'https://your-domain.vercel.app',
  generateRobotsTxt: true,
  generateIndexSitemap: false,
  exclude: ['/admin', '/api/*'],
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api/'],
      },
    ],
    additionalSitemaps: [
      `${process.env.SITE_URL || 'https://your-domain.vercel.app'}/sitemap.xml`,
    ],
  },
  changefreq: 'daily',
  priority: 0.7,
}
