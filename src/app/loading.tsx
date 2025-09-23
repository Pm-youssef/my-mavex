export default function Loading() {
  const items = Array.from({ length: 8 });
  return (
    <div className="min-h-screen bg-gray-50 pt-32">
      <div className="w-full max-w-[140rem] 2xl:max-w-none mx-auto px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-16">
        {/* Hero skeleton */}
        <div className="text-center mb-16">
          <div className="h-12 w-80 bg-gray-200 rounded-xl mx-auto animate-pulse" />
          <div className="h-5 w-[36rem] max-w-full bg-gray-100 rounded-xl mx-auto mt-4 animate-pulse" />
          <div className="h-10 w-56 bg-gray-200 rounded-xl mx-auto mt-8 animate-pulse" />
        </div>

        {/* Products grid skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((_, i) => (
            <div key={i} className="w-full bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="h-[35.2rem] w-full bg-gray-100 animate-pulse" />
              <div className="p-5">
                <div className="h-4 w-1/2 bg-gray-200 rounded mb-3 animate-pulse" />
                <div className="h-5 w-24 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
