"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR, { mutate } from "swr";
import Link from "next/link";
import { Search, RefreshCw, Archive, MailOpen, Trash2 } from "lucide-react";

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  subject: string;
  message: string;
  status: "new" | "read" | "archived" | string;
  ip?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function AdminMessagesPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch("/api/admin/session", { cache: "no-store" });
        const data = await res.json();
        setIsAuthenticated(Boolean(data?.isAuthenticated));
      } catch {
        setIsAuthenticated(false);
      }
    };
    check();
  }, []);

  const query = useMemo(() => {
    const sp = new URLSearchParams();
    if (status !== "all") sp.set("status", status);
    if (q) sp.set("q", q);
    sp.set("take", "200");
    return `/api/messages?${sp.toString()}`;
  }, [q, status]);

  const { data: messages = [], isLoading, error } = useSWR<ContactMessage[]>(
    isAuthenticated ? query : null,
    fetcher,
    { refreshInterval: 30000 }
  );

  const setMsgStatus = async (id: string, newStatus: "new" | "read" | "archived") => {
    const res = await fetch(`/api/messages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) mutate(query);
  };

  const delMsg = async (id: string) => {
    if (!confirm("هل تريد حذف هذه الرسالة؟")) return;
    const res = await fetch(`/api/messages/${id}`, { method: "DELETE" });
    if (res.ok) mutate(query);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 pt-32">
        <div className="mavex-container text-center">
          <div className="modern-card inline-block">
            <h1 className="text-3xl font-bold text-black mb-6">رسائل التواصل</h1>
            <p className="text-gray-600 mb-8">الرجاء تسجيل الدخول للوحة الإدارة للوصول.</p>
            <Link
              href="/admin"
              className="bg-yellow-600 hover:bg-yellow-700 text-white py-3 px-6 rounded-xl font-bold"
            >
              الذهاب لتسجيل الدخول
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-32">
      <div className="mavex-container">
        {/* Header */}
        <div className="text-center mb-20">
          <div className="royal-divider"></div>
          <h1 className="royal-title text-black mb-8">رسائل التواصل</h1>
          <p className="royal-subtitle text-gray-600">إدارة رسائل نموذج الاتصال</p>

          <div className="flex justify-center space-x-6 space-x-reverse mt-12">
            <Link
              href="/admin"
              className="mavex-button-secondary group relative overflow-hidden interactive-element"
            >
              <span className="relative z-10">العودة للوحة الإدارة</span>
              <div className="absolute inset-0 bg-yellow-500 transform translate-y-full transition-transform duration-500 group-hover:translate-y-0"></div>
            </Link>
            <button
              onClick={() => mutate(query)}
              className="mavex-button group relative overflow-hidden interactive-element"
              title="تحديث"
            >
              <RefreshCw className="w-5 h-5 relative z-10" />
              <div className="absolute inset-0 bg-yellow-500 transform translate-y-full transition-transform duration-500 group-hover:translate-y-0"></div>
            </button>
          </div>
          <div className="royal-divider mt-12"></div>
        </div>

        {/* Search & Filters */}
        <div className="modern-card mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ابحث بالاسم أو البريد أو الموضوع أو نص الرسالة..."
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 transition-all duration-300"
              />
            </div>
            <div>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 transition-all duration-300"
              >
                <option value="all">كل الحالات</option>
                <option value="new">جديدة</option>
                <option value="read">مقروءة</option>
                <option value="archived">مؤرشفة</option>
              </select>
            </div>
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="modern-card text-center py-20">جاري التحميل...</div>
        ) : error ? (
          <div className="modern-card text-center py-20 text-red-600">حدث خطأ في تحميل الرسائل</div>
        ) : messages.length === 0 ? (
          <div className="modern-card text-center py-20 text-gray-600">لا توجد رسائل</div>
        ) : (
          <div className="modern-card overflow-hidden">
            <div className="divide-y divide-gray-100">
              {messages.map((m) => (
                <div key={m.id} className="p-6 hover:bg-yellow-50 transition-colors">
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <span className="text-sm font-bold px-2 py-1 rounded-full border-2 border-yellow-500 text-yellow-700 bg-yellow-50">
                          {new Date(m.createdAt).toLocaleString("ar-EG")}
                        </span>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full border ${m.status === "new" ? "bg-emerald-100 text-emerald-800 border-emerald-500" : m.status === "read" ? "bg-gray-100 text-gray-800 border-gray-400" : "bg-blue-100 text-blue-800 border-blue-500"}`}>
                          {m.status === "new" ? "جديدة" : m.status === "read" ? "مقروءة" : "مؤرشفة"}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-black mb-1">{m.subject}</h3>
                      <div className="text-gray-600 mb-3">
                        من: <strong>{m.name}</strong> — <a href={`mailto:${m.email}`} className="underline">{m.email}</a>
                        {m.phone ? <> — <a href={`tel:${m.phone}`} className="underline">{m.phone}</a></> : null}
                      </div>
                      <p className="whitespace-pre-wrap text-gray-700 leading-relaxed">{m.message}</p>
                      {(m.ip || m.userAgent) && (
                        <div className="mt-3 text-xs text-gray-500">
                          {m.ip && <span className="mr-2">IP: {m.ip}</span>}
                          {m.userAgent && <span>User-Agent: {m.userAgent}</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      {m.status !== "read" && (
                        <button
                          onClick={() => setMsgStatus(m.id, "read")}
                          className="px-3 py-2 rounded-lg border-2 border-gray-200 hover:border-yellow-500 hover:bg-yellow-50 text-gray-700 flex items-center gap-2"
                          title="تعيين كمقروء"
                        >
                          <MailOpen className="w-4 h-4" /> مقروء
                        </button>
                      )}
                      {m.status !== "archived" && (
                        <button
                          onClick={() => setMsgStatus(m.id, "archived")}
                          className="px-3 py-2 rounded-lg border-2 border-gray-200 hover:border-yellow-500 hover:bg-yellow-50 text-gray-700 flex items-center gap-2"
                          title="أرشفة"
                        >
                          <Archive className="w-4 h-4" /> أرشفة
                        </button>
                      )}
                      <button
                        onClick={() => delMsg(m.id)}
                        className="px-3 py-2 rounded-lg border-2 border-red-200 hover:border-red-500 hover:bg-red-50 text-red-700 flex items-center gap-2"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4" /> حذف
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
