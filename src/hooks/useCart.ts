'use client';

import { useState, useEffect } from 'react';
import { CartItem } from '@/types';
import { CART_STORAGE_KEY } from '@/lib/constants';
import { trackAddToCart, trackRemoveFromCart } from '@/lib/analytics';

export function useCart() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedCart = localStorage.getItem(CART_STORAGE_KEY);
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (error) {
        console.error('Error parsing cart from localStorage:', error);
        setCart([]);
      }
    }
    setIsLoading(false);
  }, []);

  const saveCart = (newCart: CartItem[]) => {
    setCart(newCart);
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(newCart));
    // Notify listeners (Header, MiniCart, etc.)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cartUpdated'));
    }
  };

  const addToCart = (
    product: {
      id: string;
      name: string;
      originalPrice: number;
      discountedPrice: number;
      imageUrl: string;
    },
    quantity: number = 1,
    size?: string
  ) => {
    // استخدم discountedPrice إذا كان أقل من originalPrice، وإلا استخدم originalPrice
    const price =
      typeof product.discountedPrice === 'number' &&
      product.discountedPrice < product.originalPrice
        ? product.discountedPrice
        : product.originalPrice;
    const image = product.imageUrl;
    const keySize = size || '';
    const existingItem = cart.find(
      item => item.id === product.id && (item.size || '') === keySize
    );

    if (existingItem) {
      const updatedCart = cart.map(item =>
        item.id === product.id && (item.size || '') === keySize
          ? { ...item, quantity: item.quantity + quantity }
          : item
      );
      saveCart(updatedCart);
      // Analytics: track only the delta quantity added
      trackAddToCart({ id: product.id, name: product.name, price, quantity, size });
    } else {
      const newItem: CartItem = {
        id: product.id,
        name: product.name,
        price,
        image,
        imageUrl: image,
        quantity,
        size,
      };
      saveCart([...cart, newItem]);
      trackAddToCart({ id: product.id, name: product.name, price, quantity, size });
    }
  };

  const removeFromCart = (productId: string, size?: string) => {
    const keySize = size || '';
    const existing = cart.find(item => item.id === productId && (item.size || '') === keySize);
    const updatedCart = cart.filter(
      item => !(item.id === productId && (item.size || '') === keySize)
    );
    saveCart(updatedCart);
    // Analytics
    if (existing) {
      trackRemoveFromCart({
        id: existing.id,
        name: existing.name,
        price: existing.price,
        quantity: existing.quantity,
        size: existing.size,
      });
    }
  };

  const updateQuantity = (productId: string, quantity: number, size?: string) => {
    const keySize = size || '';
    if (quantity <= 0) {
      removeFromCart(productId, size);
      return;
    }

    const updatedCart = cart.map(item =>
      item.id === productId && (item.size || '') === keySize
        ? { ...item, quantity }
        : item
    );
    saveCart(updatedCart);
  };

  const clearCart = () => {
    saveCart([]);
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const getCartCount = () => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  };

  return {
    cart,
    isLoading,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal,
    getCartCount,
  };
}
