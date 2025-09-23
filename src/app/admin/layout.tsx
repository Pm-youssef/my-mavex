import AdminShell from '@/components/admin/AdminShell'
import type { ReactNode } from 'react'

export const dynamic = 'force-dynamic'

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminShell>
      {children}
    </AdminShell>
  )
}
