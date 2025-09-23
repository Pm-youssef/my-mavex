"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toastError, toastSuccess } from "@/components/ui/Toast";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // If already authenticated, go to /admin
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch("/api/admin/session", { cache: "no-store" });
        const j = await res.json();
        if (j?.isAuthenticated) router.replace("/admin");
      } catch {}
    };
    check();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    try {
      setLoading(true);
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        toastSuccess({ title: "تم الدخول", description: "تم التحقق من كلمة المرور" });
        router.replace("/admin");
      } else {
        const err = await res.json().catch(() => ({}));
        toastError({ title: "فشل الدخول", description: err?.error || "كلمة المرور غير صحيحة" });
      }
    } catch {
      toastError({ title: "خطأ", description: "حدث خطأ أثناء محاولة الدخول" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-24">
      <div className="mavex-container">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-xl border-2 p-8" style={{ borderColor: "var(--brand-primary, #0c1420)" }}>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-black text-[#0c1420] mb-2">لوحة الإدارة</h1>
              <p className="text-gray-600">أدخل كلمة المرور للوصول</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-[#0c1420] mb-1">كلمة المرور</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                  placeholder="أدخل كلمة المرور"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full text-white py-3 rounded-xl font-bold transition-all border-2"
                style={{ background: "var(--brand-primary, #0c1420)", borderColor: "var(--brand-primary, #0c1420)" }}
              >
                {loading ? "جاري التحقق…" : "دخول"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
