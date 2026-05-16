import Navbar from '@/components/layout/Navbar'

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="md:pt-14 pb-20 md:pb-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 md:py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
