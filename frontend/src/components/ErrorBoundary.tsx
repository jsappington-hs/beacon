import { Component, ErrorInfo, ReactNode } from 'react';
import * as Sentry from '@sentry/react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Report to Sentry if configured
    if (import.meta.env.VITE_SENTRY_DSN) {
      Sentry.captureException(error, {
        extra: {
          componentStack: errorInfo.componentStack,
        },
      });
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          textAlign: 'center',
          background: '#f9fafb',
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '24px',
          }}>
            <span style={{ fontSize: '32px', color: 'white' }}>!</span>
          </div>
          <h1 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: '#1a202c',
            marginBottom: '12px',
          }}>
            Something went wrong
          </h1>
          <p style={{
            fontSize: '16px',
            color: '#6b7280',
            marginBottom: '24px',
            maxWidth: '400px',
          }}>
            We're sorry, but something unexpected happened. Please try refreshing the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Refresh Page
          </button>
          {import.meta.env.DEV && this.state.error && (
            <pre style={{
              marginTop: '24px',
              padding: '16px',
              background: '#fee2e2',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#991b1b',
              textAlign: 'left',
              maxWidth: '600px',
              overflow: 'auto',
            }}>
              {this.state.error.toString()}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
