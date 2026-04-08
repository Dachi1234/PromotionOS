'use client'

import { Component, type ReactNode } from 'react'

interface Props {
  children?: ReactNode
  widgetName?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export class WidgetErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(
      `[WidgetErrorBoundary] ${this.props.widgetName ?? 'Widget'} crashed:`,
      error,
      info.componentStack,
    )
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-center">
          <p className="text-sm font-medium text-red-800">
            {this.props.widgetName ?? 'Widget'} failed to render
          </p>
          <p className="mt-1 text-xs text-red-600">
            {this.state.error?.message ?? 'An unexpected error occurred'}
          </p>
          <button
            className="mt-2 rounded bg-red-100 px-3 py-1 text-xs text-red-700 hover:bg-red-200"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
