import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';  // Important!
import './styles/print.css';
import './config/i18n';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Toaster } from 'sonner';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
  <Toaster position="top-right" richColors />
        <App />
      </ErrorBoundary>
    </QueryClientProvider>
  </React.StrictMode>
);