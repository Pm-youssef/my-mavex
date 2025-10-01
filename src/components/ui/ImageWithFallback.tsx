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

  // Normalize and detect local/data/blob sources to avoid optimizer issues
  const isHttp = /^https?:\/\//i.test(currentSrc)
  const isDataOrBlob = /^(data:|blob:)/i.test(currentSrc)
  const isLocalPath = !isHttp && !isDataOrBlob
  const normalizedSrc = isDataOrBlob
    ? currentSrc
    : isLocalPath
    ? (currentSrc?.startsWith('/') ? currentSrc : `/${currentSrc}`)
    : currentSrc

  return (
    <Image
      {...rest}
      alt={alt}
      src={normalizedSrc}
      // Skip optimizer for local and data/blob sources
      unoptimized={isLocalPath || isDataOrBlob}
      onError={(e) => {
        if (currentSrc !== fallback) setCurrentSrc(fallback)
        if (onError) onError(e)
      }}
    />
  )
}
