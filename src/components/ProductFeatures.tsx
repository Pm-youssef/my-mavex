import { Check } from 'lucide-react';

export default function ProductFeatures({
  features,
  title = 'مميزات المنتج',
}: {
  features?: string[] | null;
  title?: string;
}) {
  const list = Array.isArray(features)
    ? features.map((s) => String(s ?? '').trim()).filter((s) => s.length > 0).slice(0, 12)
    : [];

  if (list.length === 0) return null;

  return (
    <section className="mt-16 md:mt-20">
      <div className="flex items-center justify-between mb-6">
        <h2 className="flex items-center gap-2 text-xl md:text-2xl font-extrabold text-[#0c1420]">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-yellow-100 text-yellow-700">
            <Check className="w-5 h-5" />
          </span>
          <span>{title}</span>
        </h2>
      </div>

      <div className="hidden md:flex items-center gap-6 mb-6">
        <div className="h-px flex-1 bg-gradient-to-l from-transparent via-gray-200 to-gray-300" />
        <div className="text-[#0c1420] font-extrabold tracking-tight">{title}</div>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-gray-300" />
      </div>

      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {list.map((item, idx) => (
          <li key={idx} className="flex items-start gap-3 bg-white border border-gray-200 rounded-xl p-4">
            <span className="inline-flex items-center justify-center w-8 h-8 bg-yellow-100 rounded-full mt-0.5">
              <Check className="w-4 h-4 text-yellow-700" />
            </span>
            <span className="text-[#0c1420] text-sm md:text-base leading-6">{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
