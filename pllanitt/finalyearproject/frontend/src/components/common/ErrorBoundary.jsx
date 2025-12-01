import React from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Log error details
    this.setState({
      error,
      errorInfo
    });

    // TODO: Send to error tracking service (e.g., Sentry)
    // logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo } = this.state;
      const { fallback, showDetails = false } = this.props;

      // Use custom fallback if provided
      if (fallback) {
        return fallback(error, errorInfo, this.handleReset);
      }

      // Default error UI
      return (
        <div className="flex items-center justify-center min-h-screen p-5 bg-background">
          <Card className="max-w-[600px] w-full">
            <CardHeader>
              <div className="flex justify-center mb-4">
                <AlertCircle className="w-16 h-16 text-red-500" />
              </div>
              <CardTitle>Something went wrong</CardTitle>
              <CardDescription>
                We're sorry, but something unexpected happened. Please try refreshing the page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 flex-wrap mb-6">
                <Button onClick={this.handleReset} variant="default">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Button onClick={this.handleReload} variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reload Page
                </Button>
                <Button onClick={this.handleGoHome} variant="outline">
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </Button>
              </div>

              {showDetails && error && (
                <div className="mt-6 pt-6 border-t border-border">
                  <details>
                    <summary className="cursor-pointer p-3 bg-muted rounded-md font-medium mb-3 select-none hover:bg-muted/80 transition-colors">
                      Error Details (for developers)
                    </summary>
                    <div className="p-3 bg-muted dark:bg-slate-800 rounded-md text-xs max-h-[400px] overflow-y-auto">
                      <div className="mb-4 text-destructive">
                        <strong>Error:</strong> {error.toString()}
                      </div>
                      {errorInfo && (
                        <div className="mt-4">
                          <strong>Stack Trace:</strong>
                          <pre className="mt-2 p-3 bg-background dark:bg-slate-900 rounded overflow-x-auto text-[11px] leading-relaxed text-foreground">{errorInfo.componentStack}</pre>
                        </div>
                      )}
                    </div>
                  </details>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

