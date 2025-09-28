'use client'

import Image from 'next/image'
import { useEffect, useState, type ComponentProps } from 'react'
import { FALLBACK_IMAGE_URL } from '@/lib/constants'

type NextImageProps = Omit<ComponentProps<typeof Image>, 'src' | 'alt'>

interface Props extends NextImageProps {
  src?: string | null
  alt: string
  fallback?: string
}

export default function ImageWithFallback({
  src,
  alt,
  fallback = FALLBACK_IMAGE_URL,
  onError,
  ...rest
}: Props) {
  const [currentSrc, setCurrentSrc] = useState<string>(src && src.length > 0 ? src : fallback)

  useEffect(() => {
    setCurrentSrc(src && src.length > 0 ? src : fallback)
  }, [src, fallback])

  // Normalize and detect local asset paths to avoid optimizer 400s for ephemeral files
  const isHttp = /^https?:\/\//i.test(currentSrc)
  const isLocalPath = !isHttp
  const normalizedSrc = isLocalPath
    ? (currentSrc?.startsWith('/') ? currentSrc : `/${currentSrc}`)
    : currentSrc

  return (
    <Image
      {...rest}
      alt={alt}
      src={normalizedSrc}
      // For local assets under public (e.g., /uploads, /img), skip the optimizer to avoid 400
      unoptimized={isLocalPath}
      onError={(e) => {
        if (currentSrc !== fallback) setCurrentSrc(fallback)
        if (onError) onError(e)
      }}
    />
  )
}
