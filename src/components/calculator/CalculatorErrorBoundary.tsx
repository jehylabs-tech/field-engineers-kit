"use client";

import React, { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

type State = {
  hasError: boolean;
  error?: Error;
};

export default class CalculatorErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Calculator error caught by boundary:", error, errorInfo);
  }

  public reset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex w-full min-w-0 flex-col items-center justify-center rounded-xl border border-amber-300 bg-amber-50/80 p-6 text-center shadow-xs dark:border-amber-900/60 dark:bg-amber-950/30">
          <div className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-base font-black text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
            !
          </div>
          <h3 className="text-base font-bold text-amber-900 dark:text-amber-200">
            Invalid calculation parameters
          </h3>
          <p className="mt-1 max-w-sm text-xs leading-relaxed text-amber-700 dark:text-amber-400">
            One or more input values are out of calculation limits (e.g., non-numeric, zero, or negative value). Please check and adjust your design parameters.
          </p>
          <button
            type="button"
            onClick={this.reset}
            className="mt-4 rounded-lg bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600"
          >
            Reset View
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
