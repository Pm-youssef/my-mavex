'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // Log in development only to avoid noisy consoles in production
  if (process.env.NODE_ENV !== 'production') {
    if (error?.digest) {
      console.error('[App Error] digest:', error.digest)
    } else {
      console.error('[App Error]:', error)
    }
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center px-6 py-8">
        <h2 className="text-3xl md:text-4xl font-black text-[#0c1420] mb-3">حدث خطأ ما</h2>
        <p className="text-base md:text-lg text-gray-700 mb-6">عذراً، حدث خطأ غير متوقع أثناء تحميل الصفحة.</p>

        {error?.digest && (
          <div className="mb-6 text-xs md:text-sm text-gray-600">
            رقم التتبع: <span className="font-mono">{error.digest}</span>
          </div>
        )}

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-5 py-2.5 rounded-lg font-bold text-white bg-[#0c1420] hover:bg-black transition-colors"
          >
            حاول مرة أخرى
          </button>
          <a href="/" className="px-5 py-2.5 rounded-lg font-bold border-2 border-[#0c1420] text-[#0c1420] hover:bg-[#0c1420] hover:text-white transition-colors">
            الصفحة الرئيسية
          </a>
        </div>
      </div>
    </div>
  )
}
