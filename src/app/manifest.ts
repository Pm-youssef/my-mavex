import { MetadataRoute } from 'next'
import { SITE_NAME, SITE_DESCRIPTION, SITE_URL } from '@/lib/constants'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0c1420',
    // Icons will be provided via /public in production; remove apple-touch-icon to avoid 404 in dev
    // Add /public/icon.png and /public/icon-192.png in your project to enable PWA icons.
  }
}
