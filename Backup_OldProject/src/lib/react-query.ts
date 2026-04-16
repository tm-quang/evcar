import { QueryClient } from '@tanstack/react-query'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { get, set, del } from 'idb-keyval'

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 10 * 60 * 1000,         // 10 minutes (Tin tưởng cache tuyệt đối trong 10 phút để giảm tải lại củ)
            gcTime: 24 * 60 * 60 * 1000,       // 24 hours (Thời gian lưu rác trước khi xóa)
            retry: 1,
            refetchOnWindowFocus: true,        // Will refetch in background if stale
            refetchOnMount: true,
        },
    },
})

// Create an IndexedDB storage adapter for React Query Persister
const idbValidKey = {
    getItem: async (key: string) => {
        const val = await get(key)
        return val === undefined ? null : val
    },
    setItem: async (key: string, value: string) => {
        await set(key, value)
    },
    removeItem: async (key: string) => {
        await del(key)
    },
}

export const persister = createAsyncStoragePersister({
    storage: idbValidKey,
    key: 'bofin_react_query_offline_cache',
})

