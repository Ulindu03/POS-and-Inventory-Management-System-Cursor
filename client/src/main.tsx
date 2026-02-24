// This file is the main entry point for the React app.
// It sets up global styles, language support, data fetching, error handling, and shows the main App component on the page.
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';  // Important! Global styles and Tailwind CSS
import './styles/theme.css'; // Theme CSS variables (dark/light)
import './styles/print.css'; // Print-specific styles for receipts and reports
import './config/i18n'; // Internationalization setup for multiple languages
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; // Data fetching and caching
import { ErrorBoundary } from '@/components/common/ErrorBoundary'; // Catches and handles React errors
import { Toaster } from 'sonner'; // Toast notifications for user feedback

// Configure React Query for API data management
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Don't refetch data when user switches browser tabs
      retry: 1, // Only retry failed requests once
    },
  },
});

// Render the entire application to the DOM
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* Provide React Query context to all components */}
    <QueryClientProvider client={queryClient}>
      {/* Catch any JavaScript errors and show fallback UI */}
      <ErrorBoundary>
        {/* Toast notifications appear in top-right corner, expanded so they don't overlap */}
        <Toaster position="top-right" richColors expand visibleToasts={5} gap={8} />
        {/* Main application component */}
        <App />
      </ErrorBoundary>
    </QueryClientProvider>
  </React.StrictMode>
);