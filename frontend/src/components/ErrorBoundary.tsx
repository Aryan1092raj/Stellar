'use client';

import { Component, ReactNode } from 'react';

type Props = {
  children: ReactNode;
  label?: string;
};

type State = {
  hasError: boolean;
};

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('UI boundary caught error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary" role="alert">
          {this.props.label || 'This section could not load'}
        </div>
      );
    }

    return this.props.children;
  }
}
