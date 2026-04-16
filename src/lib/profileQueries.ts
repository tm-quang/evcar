import { useQuery } from '@tanstack/react-query'
import { getCurrentProfile } from './profileService'

export const profileKeys = {
  current: ['getCurrentProfile'] as const,
}

export function useProfile() {
  return useQuery({
    queryKey: profileKeys.current,
    queryFn: () => getCurrentProfile(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}
