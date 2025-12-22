/**
 * @fileType: component
 * @status: current
 * @updated: 2025-12-22
 * @tags: [error-boundary, error-handling, graph, react-class-component]
 * @related: [CategoryView.tsx, ProjectView.tsx]
 * @priority: high
 * @complexity: low
 * @dependencies: [react, lucide-react]
 */

'use client';

import React, { Component, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

interface ErrorBoundaryProps {
  children: ReactNode;
  onReset?: () => void;
  onNavigateBack?: () => void;
  className?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// =============================================================================
// Error Boundary Component
// =============================================================================

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleNavigateBack = () => {
    if (this.props.onNavigateBack) {
      this.props.onNavigateBack();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className={cn('flex items-center justify-center min-h-[400px] p-8', this.props.className)}>
          <div className="flex flex-col items-center justify-center max-w-md text-center">
            {/* Error Icon */}
            <div className="p-3 mb-4 rounded-full bg-red-500/10">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>

            {/* Error Title */}
            <h2 className="mb-2 text-lg font-semibold text-foreground">
              Something went wrong
            </h2>

            {/* Error Message */}
            <p className="mb-6 text-sm text-muted-foreground">
              {this.state.error?.message || 'An unexpected error occurred while rendering this component.'}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 w-full sm:flex-row sm:justify-center">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 text-sm font-medium text-white bg-ginko-500 rounded-lg hover:bg-ginko-600 focus:outline-none focus:ring-2 focus:ring-ginko-500 focus:ring-offset-2 focus:ring-offset-background transition-colors"
              >
                Try again
              </button>

              {this.props.onNavigateBack && (
                <button
                  onClick={this.handleNavigateBack}
                  className="px-4 py-2 text-sm font-medium text-foreground bg-white/5 border border-border rounded-lg hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-ginko-500 focus:ring-offset-2 focus:ring-offset-background transition-colors"
                >
                  Back to project view
                </button>
              )}
            </div>

            {/* Technical Details (collapsed by default in production) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 w-full text-left">
                <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                  Technical details
                </summary>
                <pre className="mt-2 p-3 text-xs bg-black/20 border border-border rounded-lg overflow-auto max-h-[200px]">
                  <code className="text-red-400">
                    {this.state.error.stack || this.state.error.message}
                  </code>
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// =============================================================================
// Export
// =============================================================================

export default ErrorBoundary;
