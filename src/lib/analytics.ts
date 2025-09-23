'use client';

// Lightweight analytics wrapper that supports GA4 and Umami.
// Provide env vars:
// - NEXT_PUBLIC_GA_ID (e.g., G-XXXXXXXXXX)
// - NEXT_PUBLIC_UMAMI_WEBSITE_ID
// - NEXT_PUBLIC_UMAMI_SCRIPT_URL (optional; default injected via layout if provided)

const GA_ID = process.env.NEXT_PUBLIC_GA_ID || '';
const UMAMI_WEBSITE_ID = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID || '';

type EventParams = Record<string, any>;

function trackGA4(event: string, params?: EventParams) {
  try {
    if (typeof window === 'undefined') return;
    // @ts-ignore
    const gtag = (window as any).gtag as undefined | ((...args: any[]) => void);
    if (!gtag || !GA_ID) return;
    gtag('event', event, params || {});
  } catch {}
}

function trackUmami(event: string, params?: EventParams) {
  try {
    if (typeof window === 'undefined') return;
    // umami v2 exposes window.umami.track
    const w: any = window as any;
    if (UMAMI_WEBSITE_ID && w.umami && typeof w.umami.track === 'function') {
      w.umami.track(event, params || {});
      return;
    }
    // older versions
    if (UMAMI_WEBSITE_ID && typeof (window as any).umami === 'function') {
      (window as any).umami(event, params || {});
    }
  } catch {}
}

export function track(event: string, params?: EventParams) {
  trackGA4(event, params);
  trackUmami(event, params);
}

// Helpers for common ecommerce events
export function trackAddToCart(item: {
  id: string;
  name: string;
  price: number;
  quantity: number;
  currency?: string;
  size?: string;
}) {
  const { id, name, price, quantity, size } = item;
  const currency = item.currency || 'EGP';
  const value = Number(price) * Number(quantity);
  track('add_to_cart', { item_id: id, item_name: name, price, quantity, value, currency, size });
}

export function trackRemoveFromCart(item: {
  id: string;
  name?: string;
  price?: number;
  quantity?: number;
  currency?: string;
  size?: string;
}) {
  const { id, name, price = 0, quantity = 1, size } = item;
  const currency = item.currency || 'EGP';
  const value = Number(price) * Number(quantity);
  track('remove_from_cart', { item_id: id, item_name: name, price, quantity, value, currency, size });
}

export function trackBeginCheckout(params: { value: number; currency?: string; items?: Array<{ id: string; name?: string; price?: number; quantity?: number; size?: string }> }) {
  const currency = params.currency || 'EGP';
  track('begin_checkout', { value: params.value, currency, items: params.items || [] });
}

export function trackPurchase(params: { transaction_id: string; value: number; currency?: string; items?: Array<{ id: string; name?: string; price?: number; quantity?: number; size?: string }> }) {
  const currency = params.currency || 'EGP';
  track('purchase', { transaction_id: params.transaction_id, value: params.value, currency, items: params.items || [] });
}

export function trackFavoriteAdded(item: { id: string; name?: string }) {
  track('add_to_favorites', { item_id: item.id, item_name: item.name });
}

export function trackFavoriteRemoved(item: { id: string; name?: string }) {
  track('remove_from_favorites', { item_id: item.id, item_name: item.name });
}
