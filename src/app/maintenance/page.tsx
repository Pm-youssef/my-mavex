'use client';

export default function MaintenancePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6">
      <div className="max-w-2xl w-full text-center bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
        <div className="text-5xl">🛠️</div>
        <h1 className="text-3xl font-black text-[#0c1420] mt-4">نقوم ببعض الصيانة</h1>
        <p className="text-gray-600 mt-3">الموقع قيد الصيانة مؤقتًا. نعود قريبًا بإصدار أفضل.</p>
        <div className="mt-6 text-sm text-gray-500">شكراً لصبرك ❤️</div>
      </div>
    </div>
  );
}
