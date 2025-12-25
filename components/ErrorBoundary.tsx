
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
            <div className="max-w-md w-full p-8 bg-white/10 backdrop-blur-xl rounded-3xl border border-white/10 text-center shadow-2xl relative overflow-hidden">
                {/* Background Decoration */}
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-purple-500/10 pointer-events-none" />
                
                <div className="relative z-10">
                    <div className="w-24 h-24 mx-auto mb-6 bg-red-500/20 rounded-full flex items-center justify-center border-4 border-red-500/30 animate-pulse">
                        <span className="text-5xl">😵</span>
                    </div>
                    
                    <h1 className="text-3xl font-black mb-3 text-white tracking-tight">Oh no! Glitch in the Matrix</h1>
                    
                    <p className="text-gray-300 mb-8 leading-relaxed">
                        Something unexpected happened. Don't worry, your data is safe! We just need a quick refresh to get things back on track.
                    </p>

                    <button 
                        onClick={this.handleReload}
                        className="flex items-center justify-center gap-3 w-full px-6 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-2xl font-bold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <RestartIcon className="w-6 h-6" /> 
                        <span>Refresh & Recover 🔄</span>
                    </button>
                    
                    <div className="mt-6 text-[10px] text-gray-500 font-mono uppercase tracking-widest">
                        Error Code: {this.state.error?.name || 'UNKNOWN_ERROR'}
                    </div>
                </div>
            </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
