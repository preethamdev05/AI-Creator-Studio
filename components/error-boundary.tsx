'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      let parsedError: any = null;
      try {
        if (this.state.error?.message) {
          parsedError = JSON.parse(this.state.error.message);
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-50 p-4">
          <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-red-500 mb-4">
              <AlertTriangle className="h-8 w-8" />
              <h2 className="text-xl font-semibold">Something went wrong</h2>
            </div>
            
            <div className="space-y-4">
              <p className="text-zinc-400 text-sm">
                An unexpected error occurred in the application.
              </p>
              
              {parsedError ? (
                <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 font-mono text-xs overflow-auto max-h-64">
                  <div className="text-red-400 mb-2">Firestore Error</div>
                  <div className="text-zinc-300">Operation: {parsedError.operationType}</div>
                  <div className="text-zinc-300">Path: {parsedError.path}</div>
                  <div className="text-zinc-500 mt-2">{parsedError.error}</div>
                </div>
              ) : (
                <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 font-mono text-xs overflow-auto max-h-64 text-zinc-400">
                  {this.state.error?.toString()}
                </div>
              )}
              
              <button
                onClick={() => window.location.reload()}
                className="w-full py-2 px-4 bg-zinc-100 text-zinc-900 hover:bg-white rounded-md font-medium transition-colors"
              >
                Reload Application
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
