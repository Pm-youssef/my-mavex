'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface SizeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SizeGuideModal({ isOpen, onClose }: SizeGuideModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  const content = (
    <>
      <div className="fixed inset-0 bg-black/60 z-[10050]" onClick={onClose} />
      <div
        className="fixed inset-0 z-[10060] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-label="دليل المقاسات"
      >
        <div className="bg-[#0c1420] text-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <h2 className="text-xl font-extrabold">دليل المقاسات</h2>
            <button
              onClick={onClose}
              aria-label="إغلاق"
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-right">
                <thead>
                  <tr className="bg-white/5 text-white">
                    <th className="px-4 py-3 font-bold border-b border-white/10">المقاس</th>
                    <th className="px-4 py-3 font-bold border-b border-white/10">عرض الصدر (سم)</th>
                    <th className="px-4 py-3 font-bold border-b border-white/10">طول التيشيرت (سم)</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { size: 'M', width: 56, length: 73 },
                    { size: 'L', width: 59, length: 75 },
                    { size: 'XL', width: 62, length: 78 },
                    { size: '2XL', width: 65, length: 80 },
                  ].map((r, i) => (
                    <tr key={r.size} className={i % 2 === 0 ? 'bg-white/0' : 'bg-white/5'}>
                      <td className="px-4 py-3 border-b border-white/10 font-extrabold">{r.size}</td>
                      <td className="px-4 py-3 border-b border-white/10">{r.width}</td>
                      <td className="px-4 py-3 border-b border-white/10">{r.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-xs text-white/70">قد تختلف القياسات بمقدار ±2 سم.</p>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(content, document.body);
}
