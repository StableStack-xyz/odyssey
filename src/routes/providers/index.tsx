import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import type { ComponentType } from 'react'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { APP_NAME } from '../../lib/constants'
import { MansaProvider } from './-mansa'

export const Route = createFileRoute('/providers/')({
  beforeLoad: () => {
    if (typeof window !== 'undefined') {
      const token = sessionStorage.getItem('admin_token')
      if (!token) {
        throw redirect({ to: '/login' })
      }
    }
  },
  head: () => ({
    meta: [
      { title: `Providers - ${APP_NAME}` },
      { name: 'description', content: 'Manage payment provider configuration' },
    ],
  }),
  component: ProvidersPage,
})

// Add a provider here to get a new tab; the sidebar does not change.
const PROVIDERS: { id: string; label: string; component: ComponentType }[] = [
  { id: 'mansa', label: 'Mansa (USD)', component: MansaProvider },
]

function ProvidersPage() {
  const [active, setActive] = useState(PROVIDERS[0].id)
  const Active = PROVIDERS.find((p) => p.id === active)!.component

  return (
    <AdminLayout title="Providers">
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-2xl font-semibold text-ink">Providers</h2>
          <p className="text-slate mt-1">Payment provider setup and onboarding.</p>
        </div>
        <div className="flex gap-1 border-b border-graphite-hairline">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              onClick={() => setActive(p.id)}
              className={`px-4 py-2 text-sm cursor-pointer -mb-px border-b-2 ${
                p.id === active ? 'border-ink text-ink font-medium' : 'border-transparent text-slate hover:text-ink'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <Active />
      </div>
    </AdminLayout>
  )
}
