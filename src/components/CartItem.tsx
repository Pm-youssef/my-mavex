'use client';

import { formatPrice } from '@/lib/utils';
import ImageWithFallback from '@/components/ui/ImageWithFallback';

interface CartItemProps {
  item: {
    id: string;
    name: string;
    price: number;
    imageUrl: string;
    quantity: number;
  };
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
}

export default function CartItem({
  item,
  onUpdateQuantity,
  onRemove,
}: CartItemProps) {
  

  return (
    <div className="flex items-center space-x-6 space-x-reverse p-6 border-b-2 border-gray-200 hover:border-yellow-500 transition-all duration-300 group">
      {/* Product Image */}
      <div className="relative w-24 h-24 flex-shrink-0 overflow-hidden rounded-xl border-2 border-gray-200 group-hover:border-yellow-500 transition-all duration-300">
        <ImageWithFallback
          src={item.imageUrl}
          alt={item.name}
          fill
          sizes="96px"
          className="object-cover transition-transform duration-500 group-hover:scale-110"
        />
      </div>

      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <h3 className="text-xl font-bold text-black mb-2 group-hover:text-yellow-600 transition-colors duration-300 truncate">
          {item.name}
        </h3>
        <p className="text-2xl font-bold text-yellow-600 mb-2">
          {formatPrice(item.price)}
        </p>
        <p className="text-gray-500 text-sm">السعر للقطعة الواحدة</p>
      </div>

      {/* Quantity Controls */}
      <div className="flex items-center space-x-4 space-x-reverse">
        <button
          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
          disabled={item.quantity <= 1}
          className="w-12 h-12 rounded-xl bg-gray-200 hover:bg-yellow-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-bold text-xl border-2 border-gray-300 hover:border-yellow-500 flex items-center justify-center"
        >
          -
        </button>
        <span className="w-16 text-center text-2xl font-bold text-black bg-gray-100 py-2 rounded-xl border-2 border-gray-200">
          {item.quantity}
        </span>
        <button
          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
          className="w-12 h-12 rounded-xl bg-gray-200 hover:bg-yellow-500 hover:text-white transition-all duration-300 font-bold text-xl border-2 border-gray-300 hover:border-yellow-500 flex items-center justify-center"
        >
          +
        </button>
      </div>

      {/* Total Price and Remove */}
      <div className="text-right min-w-0">
        <p className="text-2xl font-bold text-yellow-600 mb-2">
          {formatPrice(item.price * item.quantity)}
        </p>
        <button
          onClick={() => onRemove(item.id)}
          className="text-red-600 hover:text-red-800 text-sm font-bold transition-colors duration-300 group/remove"
        >
          <span className="relative">
            حذف
            <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-red-600 transition-all duration-300 group-hover/remove:w-full"></div>
          </span>
        </button>
      </div>
    </div>
  );
}
