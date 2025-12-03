
import React, { ErrorInfo, ReactNode } from 'react';
import { AlertIcon, RestartIcon } from './Icons';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState;
  public props: ErrorBoundaryProps;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReload = () => {
      window.location.reload();
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white p-4">
            <div className="max-w-md w-full p-8 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 text-center shadow-2xl">
                <div className="w-16 h-16 mx-auto mb-6 p-4 bg-red-500/10 rounded-full flex items-center justify-center">
                    <AlertIcon className="w-10 h-10 text-red-500" />
                </div>
                <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
                <p className="text-gray-400 mb-6">
                    An unexpected error occurred. We apologize for the inconvenience.
                </p>
                {this.state.error && (
                    <div className="mb-6 p-3 bg-black/30 rounded text-xs text-left font-mono text-red-300 overflow-auto max-h-32">
                        {this.state.error.toString()}
                    </div>
                )}
                <button 
                    onClick={this.handleReload}
                    className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg font-semibold hover:shadow-lg hover:shadow-cyan-500/20 transition-all"
                >
                    <RestartIcon className="w-5 h-5" /> Reload Application
                </button>
            </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
