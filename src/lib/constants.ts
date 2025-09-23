export const SITE_NAME = 'Mavex'
export const SITE_DESCRIPTION = 'أفضل التيشيرتات بأسعار منافسة'
export const SITE_URL = process.env.SITE_URL || 'https://your-domain.vercel.app'

export const CURRENCY = 'EGP'
export const CURRENCY_SYMBOL = 'ج.م'

export const PAYMOB_CONFIG = {
  CURRENCY: 'EGP',
  INTEGRATION_ID: process.env.PAYMOB_INTEGRATION_ID || '',
  IFRAME_ID: process.env.PAYMOB_IFRAME_ID || '',
  API_KEY: process.env.PAYMOB_API_KEY || '',
}

export const ADMIN_CONFIG = {
  PASSWORD: process.env.ADMIN_PASSWORD || 'admin123',
}

export const CART_STORAGE_KEY = 'mavex-cart'
export const FAVORITES_STORAGE_KEY = 'mavex-favorites'
// Remote placeholder image for missing/broken product images
export const FALLBACK_IMAGE_URL =
  'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=60'

// Default sizes to use when a product does not define variants
export const DEFAULT_SIZES = ['S', 'M', 'L', 'XL', 'XXL'] as const

export const NAVIGATION = [
  { name: 'الرئيسية', href: '/' },
  { name: 'التواصل', href: '/contact' },
  { name: 'الإدارة', href: '/admin' },
]

export const CONTACT_INFO = {
  phone: '+20 123 456 7890',
  email: 'info@mavex.com',
  address: 'القاهرة، مصر',
  workingHours: 'الأحد - الخميس: 9:00 ص - 6:00 م',
}

export const SOCIAL_LINKS = {
  facebook: 'https://facebook.com/mavex',
  instagram: 'https://instagram.com/mavex',
  twitter: 'https://twitter.com/mavex',
}

export const META_TAGS = {
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
  keywords: 'تيشيرتات، ملابس، تسوق إلكتروني، مصر',
  author: SITE_NAME,
  ogImage: `${SITE_URL}/opengraph-image`,
  twitterImage: `${SITE_URL}/twitter-image`,
}
