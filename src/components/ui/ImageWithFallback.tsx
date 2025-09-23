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

  return (
    <Image
      {...rest}
      alt={alt}
      src={currentSrc}
      onError={(e) => {
        if (currentSrc !== fallback) setCurrentSrc(fallback)
        if (onError) onError(e)
      }}
    />
  )
}
