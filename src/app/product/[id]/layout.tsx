import type { Metadata } from 'next'
import { SITE_URL } from '@/lib/constants'

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const id = params.id
  return {
    alternates: {
      canonical: `${SITE_URL}/product/${id}`,
    },
  }
}

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return children
}
