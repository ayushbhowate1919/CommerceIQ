import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  fallbackTitle?: string;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="card" style={{ margin: '2rem auto', maxWidth: '36rem', textAlign: 'center' }}>
          <h2 style={{ color: '#dc2626', marginTop: 0 }}>
            {this.props.fallbackTitle ?? 'Something went wrong rendering this section'}
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
            {this.state.error?.message ?? 'An unexpected UI error occurred.'}
          </p>
          <button className="btn btn-primary" onClick={this.handleReset} style={{ marginTop: '1rem' }}>
            🔄 Retry Component
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
