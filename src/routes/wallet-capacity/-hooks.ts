import { useQuery } from '@tanstack/react-query'
import { walletApi } from '../../lib/api'
import type { Tier } from './-types'

export function useTiers() {
  return useQuery({
    queryKey: ['admin-wallet-tiers'],
    queryFn: async () => {
      const response = await walletApi.get('/api/admin/wallet-tiers')
      return response.data.data as Tier[]
    },
  })
}
