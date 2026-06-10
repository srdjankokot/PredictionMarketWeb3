'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  label?: string;
}
interface State {
  hasError: boolean;
}

/**
 * Component-level error boundary so one widget (e.g. the TradingPanel or chart)
 * can fail without taking the whole page down.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: unknown): void {
    console.error('[ErrorBoundary]', this.props.label ?? '', error);
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="card p-4 text-sm text-muted">
            Something went wrong loading this section.
          </div>
        )
      );
    }
    return this.props.children;
  }
}
