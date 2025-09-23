"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Package, Tags, Users, Truck, Settings, MessageSquare, ClipboardList } from "lucide-react";
import { ReactNode } from "react";

const nav = [
  { href: "/admin/analytics", label: "التحليلات", icon: BarChart3 },
  { href: "/admin", label: "المنتجات", icon: Package },
  { href: "/admin/categories", label: "الأقسام", icon: ClipboardList },
  { href: "/admin/reviews", label: "المراجعات", icon: MessageSquare },
  { href: "/admin/orders", label: "الطلبات", icon: ClipboardList },
  { href: "/admin/customers", label: "العملاء", icon: Users },
  { href: "/admin/coupons", label: "الكوبونات", icon: Tags },
  { href: "/admin/shipping", label: "الشحن", icon: Truck },
  { href: "/admin/settings", label: "الإعدادات", icon: Settings },
];

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-gray-200 pt-[env(safe-area-inset-top)]">
        <div className="w-full px-0 md:px-2 lg:px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-500 text-[#0c1420] font-black grid place-items-center">A</div>
            <div className="text-xl font-extrabold text-[#0c1420]">لوحة الإدارة</div>
            <span className="text-xs text-gray-500 border border-gray-200 rounded-lg px-2 py-1">High-End Suite</span>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <input className="rounded-xl border-2 border-gray-200 px-4 py-2 w-72 focus:border-brand-500 focus:ring-2 focus:ring-brand-200" placeholder="بحث سريع..." />
            <Link href="/" className="px-4 py-2 rounded-xl border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50 font-bold text-[#0c1420]">العودة للموقع</Link>
          </div>
        </div>
      </header>
      <div className="w-full px-0 md:px-2 lg:px-4 pt-4 md:pt-6 pb-6 grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-3">
        <aside className="bg-white border border-gray-200 rounded-2xl p-2 md:p-3 h-full">
          <nav className="space-y-1">
            {nav.map(item => {
              const Icon = item.icon;
              const active = pathname?.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-3 py-2 rounded-xl border ${active ? 'bg-brand-50 border-brand-500 text-[#0c1420] font-extrabold' : 'border-transparent text-gray-700 hover:bg-gray-50'}`}>
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </aside>
        <main className="min-h-[70vh]">
          {children}
        </main>
      </div>
    </div>
  )
}
