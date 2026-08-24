import posthog from 'posthog-js'

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com'

export const isPostHogEnabled = Boolean(POSTHOG_KEY)

export function initPostHog() {
  if (!isPostHogEnabled || typeof window === 'undefined') {
    return
  }

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: false,
    capture_pageleave: true,
    autocapture: true,
    persistence: 'localStorage',
  })
}

export function identifyUser(
  user: {
    id?: string | number
    email?: string | null
    firstName?: string | null
    lastName?: string | null
    role?: string | null
  } | null,
) {
  if (!isPostHogEnabled || typeof window === 'undefined') {
    return
  }

  if (!user) {
    posthog.reset()
    return
  }

  posthog.identify(String(user.id ?? user.email ?? 'anonymous-admin'), {
    email: user.email ?? undefined,
    first_name: user.firstName ?? undefined,
    last_name: user.lastName ?? undefined,
    role: user.role ?? undefined,
    is_admin: true,
  })
}

export function trackPageView(pathname: string) {
  if (!isPostHogEnabled || typeof window === 'undefined') {
    return
  }

  posthog.capture('$pageview', {
    $current_url: pathname,
  })
}

export function captureEvent(eventName: string, properties?: Record<string, unknown>) {
  if (!isPostHogEnabled || typeof window === 'undefined') {
    return
  }

  posthog.capture(eventName, properties)
}
