'use client'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  text?: string
  className?: string
}

export default function LoadingSpinner({ 
  size = 'md', 
  text = 'جاري التحميل...',
  className = ''
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-32 h-32'
  }

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className={`${sizeClasses[size]} relative`}>
        {/* Outer ring */}
        <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
        
        {/* Animated ring */}
        <div className="absolute inset-0 border-4 border-yellow-500 rounded-full border-t-transparent animate-spin"></div>
        
        {/* Center dot */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
        </div>
      </div>
      
      {text && (
        <p className="mt-4 text-gray-600 font-medium text-center">{text}</p>
      )}
    </div>
  )
}

// Skeleton loading component
export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden animate-pulse">
      <div className="h-72 bg-gray-200"></div>
      <div className="p-8">
        <div className="h-6 bg-gray-200 rounded mb-4"></div>
        <div className="h-4 bg-gray-200 rounded mb-6 w-3/4"></div>
        <div className="h-8 bg-gray-200 rounded mb-4"></div>
        <div className="h-12 bg-gray-200 rounded"></div>
      </div>
    </div>
  )
}

// Product skeleton
export function ProductSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
      {[...Array(8)].map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  )
}
