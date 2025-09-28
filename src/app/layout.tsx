import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { Cairo, Inter } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ScrollToTop from '@/components/ScrollToTop';
import { ScrollProvider } from '@/contexts/ScrollContext';
import { Providers } from './providers';
import { META_TAGS, SITE_NAME, SITE_URL } from '@/lib/constants';
import ToastContainer from '@/components/ui/Toast';
import Script from 'next/script';

const cairo = Cairo({
  subsets: ['arabic'],
  variable: '--font-arabic',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export async function generateMetadata(): Promise<Metadata> {
  try {
    const h = headers();
    const proto = h.get('x-forwarded-proto') || 'http';
    const host = h.get('host') || 'localhost:3000';
    const baseUrl = `${proto}://${host}`;
    const res = await fetch(`${baseUrl}/api/settings`, { cache: 'no-store' });
    const s = await res.json();
    const title = s?.metaTitle || META_TAGS.title;
    const description = s?.metaDescription || META_TAGS.description;
    const image = s?.ogImageUrl || META_TAGS.ogImage;
    return {
      title,
      description,
      metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://your-domain.vercel.app'),
      openGraph: { title, description, images: [image] },
      twitter: { card: 'summary_large_image', title, description, images: [image] },
    };
  } catch {
    return {
      title: META_TAGS.title,
      description: META_TAGS.description,
      metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://your-domain.vercel.app'),
      openGraph: { title: META_TAGS.title, description: META_TAGS.description, images: [META_TAGS.ogImage] },
      twitter: { card: 'summary_large_image', title: META_TAGS.title, description: META_TAGS.description, images: [META_TAGS.twitterImage] },
    };
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Load public settings (SSR) to inject CSS variables and a global settings object
  let settings: any = null;
  try {
    const h = headers();
    const proto = h.get('x-forwarded-proto') || 'http';
    const host = h.get('host') || 'localhost:3000';
    const baseUrl = `${proto}://${host}`;
    const res = await fetch(`${baseUrl}/api/settings`, { cache: 'no-store' });
    settings = await res.json();
  } catch {}
  const theme = (settings?.themePrimary as string) || '#0c1420';
  const styleVars: any = { '--brand-primary': theme };
  const GA_ID = process.env.NEXT_PUBLIC_GA_ID || '';
  const UMAMI_WEBSITE_ID = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID || '';
  const UMAMI_SCRIPT_URL = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL || 'https://analytics.umami.is/script.js';
  return (
    <html lang="ar" dir="rtl">
      <body className={`${cairo.variable} ${inter.variable} font-arabic`} style={styleVars}>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-yellow-500 text-black px-4 py-2 rounded"
          aria-label="تجاوز إلى المحتوى الرئيسي"
        >
          تخطي إلى المحتوى
        </a>
        <Providers>
          <ScrollProvider>
            <Header />
            <main
              id="main"
              className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 pt-4 sm:pt-6"
            >
              {children}
            </main>
            <Footer />
            <ScrollToTop />
            <ToastContainer />
            {/* Public settings injection for client-side utilities */}
            <Script id="public-settings" strategy="beforeInteractive">{`window.__PUBLIC_SETTINGS__ = ${JSON.stringify(settings || {})};`}</Script>
            {/* JSON-LD: Organization */}
            <Script
              id="org-jsonld"
              type="application/ld+json"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  '@context': 'https://schema.org',
                  '@type': 'Organization',
                  name: SITE_NAME,
                  url: SITE_URL,
                  logo: `${SITE_URL}/icon.png`,
                }),
              }}
            />
            {/* JSON-LD: WebSite with SearchAction */}
            <Script
              id="website-jsonld"
              type="application/ld+json"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  '@context': 'https://schema.org',
                  '@type': 'WebSite',
                  name: SITE_NAME,
                  url: SITE_URL,
                  potentialAction: {
                    '@type': 'SearchAction',
                    target: `${SITE_URL}/products?query={search_term_string}`,
                    'query-input': 'required name=search_term_string',
                  },
                }),
              }}
            />
            {/* Analytics: GA4 */}
            {GA_ID && (
              <>
                <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
                <Script id="ga4-init" strategy="afterInteractive">{`
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);} 
                  gtag('js', new Date());
                  gtag('config', '${GA_ID}', { send_page_view: true });
                `}</Script>
              </>
            )}
            {/* Analytics: Umami */}
            {UMAMI_WEBSITE_ID && (
              <Script
                src={UMAMI_SCRIPT_URL}
                data-website-id={UMAMI_WEBSITE_ID as any}
                strategy="afterInteractive"
              />
            )}
          </ScrollProvider>
        </Providers>
      </body>
    </html>
  );
}

