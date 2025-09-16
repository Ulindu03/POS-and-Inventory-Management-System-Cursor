// Error boundary component that catches JavaScript errors anywhere in the component tree
import React from 'react';

type Props = { children: React.ReactNode };
type State = { hasError: boolean; error?: any };

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    // Initialize state - no error at start
    this.state = { hasError: false };
  }
  
  // This method is called when an error occurs in any child component
  static getDerivedStateFromError(error: any) {
    // Update state to show error UI instead of crashing the app
    return { hasError: true, error };
  }
  
  // Log error details to console for debugging
  componentDidCatch(error: any, info: any) {
    console.error('App crashed:', error, info);
  }
  
  render() {
    if (this.state.hasError) {
      // Show error page instead of the broken component
      return (
        <div style={{ padding: 24, color: '#fff', background: '#111', minHeight: '100vh' }}>
          <h1 style={{ fontSize: 20, marginBottom: 8 }}>Something went wrong.</h1>
          <pre style={{ whiteSpace: 'pre-wrap', opacity: 0.8 }}>{String(this.state.error)}</pre>
        </div>
      );
    }
    // If no error, render children normally
    return this.props.children;
  }
}
