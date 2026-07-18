import { createFileRoute } from '@tanstack/react-router'
import { LoginPage } from '../components/LoginPage'
import { APP_NAME } from '../lib/constants'

export const Route = createFileRoute('/login')({
  head: () => ({
    meta: [
      { title: `Login - ${APP_NAME}` },
    ],
  }),
  component: LoginPage,
})
