import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number): string {
  try {
    const n = Math.max(0, Math.round(Number(price) || 0));
    const formatter = new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 0 });
    return `${formatter.format(n)} جنيه`;
  } catch {
    try {
      // Fallback with default locale
      const n = Math.max(0, Math.round(Number(price) || 0));
      return `${new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 0 }).format(n)} جنيه`;
    } catch {
      return `${String(Math.max(0, Math.round(Number(price) || 0)))} جنيه`;
    }
  }
}

export function generateOrderId(): string {
  return `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}