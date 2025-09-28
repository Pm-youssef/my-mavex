import { Truck, ShieldCheck, RefreshCcw } from 'lucide-react'

export default function TopTrustBar() {
  return (
    <div className="hidden md:block bg-[#0c1420] text-white/95">
      <div className="mavex-container">
        <div className="py-2 text-xs font-bold tracking-wide flex items-center justify-center gap-6">
          <div className="flex items-center gap-2"><Truck className="w-4 h-4 text-yellow-500" /><span>توصيل سريع</span></div>
          <span className="text-yellow-500/70">•</span>
          <div className="flex items-center gap-2"><RefreshCcw className="w-4 h-4 text-yellow-500" /><span>استبدال 14 يوم</span></div>
          <span className="text-yellow-500/70">•</span>
          <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-yellow-500" /><span>دفع آمن</span></div>
        </div>
      </div>
    </div>
  )
}
