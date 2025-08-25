'use client'

import { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    
    // Here you could send error to logging service
    // logErrorToService(error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <Card className="p-8 text-center max-w-md mx-auto mt-8">
          <div className="flex flex-col items-center space-y-4">
            <div className="p-3 bg-red-50 rounded-full">
              <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
            </div>
            
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Something went wrong
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                We're sorry, but an unexpected error occurred. Please try refreshing the page or contact support if the problem persists.
              </p>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="text-left text-xs text-gray-500 mt-4">
                  <summary className="cursor-pointer font-medium">Error details</summary>
                  <pre className="mt-2 p-2 bg-gray-50 rounded overflow-auto">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </div>
            
            <div className="flex space-x-3">
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
              >
                Refresh Page
              </Button>
              <Button
                onClick={() => this.setState({ hasError: false, error: undefined })}
              >
                Try Again
              </Button>
            </div>
          </div>
        </Card>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary

// Hook for functional components to handle errors
export function useErrorHandler() {
  return (error: Error, errorInfo?: ErrorInfo) => {
    console.error('Error handled:', error, errorInfo)
    // You can implement custom error handling logic here
    // For example, show a toast notification
    // toast.error('An error occurred. Please try again.')
  }
}