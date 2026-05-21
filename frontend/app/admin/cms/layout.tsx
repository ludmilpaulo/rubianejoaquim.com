import CmsShell from '@/components/admin/CmsShell'

export default function CmsLayout({ children }: { children: React.ReactNode }) {
  return <CmsShell>{children}</CmsShell>
}
