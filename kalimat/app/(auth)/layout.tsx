export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-arabic text-primary mb-1">كلمات</h1>
          <p className="text-sm text-muted">Apprenez l&apos;arabe pas à pas</p>
        </div>
        {children}
      </div>
    </div>
  )
}
