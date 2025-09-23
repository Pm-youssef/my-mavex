'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatPrice } from '@/lib/utils';
import { CART_STORAGE_KEY } from '@/lib/constants';
import ImageWithFallback from '@/components/ui/ImageWithFallback';

interface CartItem {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  quantity: number;
  size?: string;
}

interface MiniCartProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MiniCart({ isOpen, onClose }: MiniCartProps) {
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    const savedCart = localStorage.getItem(CART_STORAGE_KEY);
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (error) {
        setCart([]);
      }
    }
  }, []);

  useEffect(() => {
    const handleCartUpdate = () => {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      if (savedCart) {
        try {
          setCart(JSON.parse(savedCart));
        } catch (error) {
          setCart([]);
        }
      } else {
        setCart([]);
      }
    };

    window.addEventListener('cartUpdated', handleCartUpdate);
    return () => window.removeEventListener('cartUpdated', handleCartUpdate);
  }, []);

  const removeItem = (id: string, size?: string) => {
    const keySize = size || '';
    const updatedCart = cart.filter(item => !(item.id === id && (item.size || '') === keySize));
    setCart(updatedCart);
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(updatedCart));
    window.dispatchEvent(new CustomEvent('cartUpdated'));
  };

  const getTotal = () => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* Mini Cart */}
      <div className="fixed top-24 right-4 w-96 bg-white rounded-2xl shadow-2xl border-2 border-yellow-500 z-50 max-h-96 overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-black">سلة التسوق</h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-black transition-colors duration-300"
            >
              ✕
            </button>
          </div>

          {cart.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 text-gray-300">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  />
                </svg>
              </div>
              <p className="text-gray-600">السلة فارغة</p>
            </div>
          ) : (
            <>
              <div className="max-h-64 overflow-y-auto space-y-4 mb-6">
                {cart.map(item => (
                  <div
                    key={`${item.id}:${item.size || ''}`}
                    className="flex items-center space-x-4 space-x-reverse p-3 bg-gray-50 rounded-xl"
                  >
                    <div className="relative w-12 h-12">
                      <ImageWithFallback
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        sizes="48px"
                        className="object-cover rounded-lg"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-black text-sm truncate">
                        {item.name}
                      </h4>
                      <p className="text-yellow-600 text-sm font-bold">
                        {formatPrice(item.price)}
                      </p>
                      {item.size && (
                        <p className="text-gray-500 text-xs">المقاس: {item.size}</p>
                      )}
                      <p className="text-gray-500 text-xs">
                        الكمية: {item.quantity}
                      </p>
                    </div>
                    <button
                      onClick={() => removeItem(item.id, item.size)}
                      className="text-red-500 hover:text-red-700 transition-colors duration-300"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <div className="border-t-2 border-yellow-500 pt-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-bold text-black">المجموع:</span>
                  <span className="font-bold text-yellow-600 text-xl">
                    {formatPrice(getTotal())}
                  </span>
                </div>

                <div className="space-y-3">
                  <Link
                    href="/cart"
                    onClick={onClose}
                    className="block w-full bg-yellow-600 hover:bg-yellow-700 text-black py-3 px-6 rounded-xl font-bold transition-all duration-300 border-2 border-yellow-600 hover:border-yellow-700 transform hover:scale-105 text-center"
                  >
                    عرض السلة
                  </Link>

                  <Link
                    href="/checkout"
                    onClick={onClose}
                    className="block w-full bg-black hover:bg-gray-800 text-white py-3 px-6 rounded-xl font-bold transition-all duration-300 border-2 border-black hover:border-gray-800 transform hover:scale-105 text-center"
                  >
                    إتمام الطلب
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
