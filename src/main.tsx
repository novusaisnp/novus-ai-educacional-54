
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import './index.css';
import { tapRuntimeErrors } from '@/lib/runtimeErrorTap';
import { AppErrorBoundary } from '@/components/errors/AppErrorBoundary';
import { initPerfVitals } from '@/utils/perfVitals';

// Initialize runtime error tracking
tapRuntimeErrors();

// Initialize performance telemetry (idle)
if (typeof window !== 'undefined') {
  ;(window.requestIdleCallback || setTimeout)(() => {
    initPerfVitals({ sampleRate: 0.25 })
  })
}

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <AppErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </AppErrorBoundary>
);
