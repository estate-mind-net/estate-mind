interface PageLayoutProps {
  children: React.ReactNode
  fullWidth?: boolean
}

export function PageLayout({ children, fullWidth = false }: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      {fullWidth ? (
        children
      ) : (
        <div className="mx-auto max-w-7xl">
          {children}
        </div>
      )}
    </div>
  )
}
