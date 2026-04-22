import { Suspense } from 'react'
import { Header } from '@/components/common/header'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <Suspense>
        <div className="main-container">{children}</div>
      </Suspense>
    </>
  )
}
