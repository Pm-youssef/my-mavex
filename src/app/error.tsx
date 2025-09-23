'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">حدث خطأ ما</h2>
        <p className="text-gray-600 mb-6">عذراً، حدث خطأ غير متوقع</p>
        <button
          onClick={reset}
          className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors duration-200"
        >
          حاول مرة أخرى
        </button>
      </div>
    </div>
  )
}
