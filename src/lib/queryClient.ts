import { QueryClient } from '@tanstack/react-query'
import { logger } from '@/lib/logger'

// Erros do PostgREST/Supabase chegam com code/details além de message — não são
// Error puro, mas também não têm shape garantido, daí os campos opcionais.
interface QueryError {
  message?: string
  code?: string
  details?: string
}

// Configure TanStack Query v5 with optimized settings for pre-launch
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 minutes - conforme especificação
      gcTime: 10 * 60 * 1000,       // 10 minutes - conforme especificação
      retry: (failureCount, error: QueryError) => {
        // Log failed queries for monitoring
        logger.warn('Query retry attempt', { 
          failureCount, 
          error: error?.message,
          code: error?.code 
        })
        
        // Don't retry on auth errors or permission errors
        if (error?.code === '42501' || error?.code === 'PGRST301') {
          return false
        }
        
        // Max 2 retries for other errors
        return failureCount < 2
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: false, // Don't retry mutations by default
      onError: (error: QueryError) => {
        logger.error('Mutation failed', {
          error: error?.message,
          code: error?.code,
          details: error?.details
        })
      }
    }
  }
})

// Add global error handling
queryClient.setMutationDefaults(['default'], {
  onError: (error: QueryError) => {
    logger.error('Global mutation error', {
      error: error?.message,
      code: error?.code
    })
  }
})

// Optional: Add query cache monitoring in development
if (process.env.NODE_ENV === 'development') {
  queryClient.getQueryCache().subscribe((event) => {
    if (event.type === 'added') {
      logger.debug('Query added to cache', { queryKey: event.query.queryKey })
    }
    if (event.type === 'removed') {
      logger.debug('Query removed from cache', { queryKey: event.query.queryKey })
    }
  })
}