import { Link } from '@tanstack/react-router'

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-paper transition-colors duration-200">
      {/* Top cream notice ribbon */}
      <div className="w-full bg-cream-notice py-2.5 px-4 text-center border-b border-graphite-hairline">
        <p className="text-xs tracking-wider text-[#171717] font-display">
          STABLESTACK CONTROL PANEL • AUTHORIZED PERSONNEL ONLY
        </p>
      </div>

      {/* Main container */}
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-[400px] text-center space-y-8">
          <div className="flex justify-center">
            <img src="/logo.svg?v=2" alt="StableStack" className="h-12 dark:hidden" />
            <img src="/logo-dark.svg?v=2" alt="StableStack" className="h-12 hidden dark:block" />
          </div>

          <div className="space-y-4">
            <p className="font-display text-[96px] leading-none tracking-tight text-ink">404</p>
            <h1 className="font-display text-[24px] tracking-tight text-ink leading-tight">
              Page not found
            </h1>
            <p className="text-slate text-sm leading-relaxed">
              The page you're looking for doesn't exist or has been moved.
            </p>
          </div>

          <Link
            to="/"
            className="inline-flex h-11 items-center justify-center px-8 bg-transparent text-ink border border-ink rounded-full text-sm font-display hover:bg-ink hover:text-paper active:scale-[0.98] transition-all cursor-pointer"
          >
            Return Home
          </Link>
        </div>
      </div>

      {/* Footer copyright */}
      <div className="py-4 text-center border-t border-graphite-hairline">
        <p className="text-[10px] uppercase tracking-widest text-ash">
          © {new Date().getFullYear()} StableStack Inc. All rights reserved.
        </p>
      </div>
    </div>
  )
}
