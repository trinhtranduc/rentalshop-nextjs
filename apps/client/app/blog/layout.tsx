import PublicSiteFooter from '../components/PublicSiteFooter'
import PublicSiteHeader from '../components/PublicSiteHeader'

export default function BlogLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <PublicSiteHeader />
      <main className="flex-1">{children}</main>
      <PublicSiteFooter />
    </div>
  )
}
