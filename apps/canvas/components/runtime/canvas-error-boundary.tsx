'use client'

import React from 'react'

/**
 * Wraps the runtime `<Frame>` so a malformed canvas JSON, a missing
 * resolver entry, or a widget that throws mid-render can't white-screen the
 * whole promotion page.
 *
 * Failure mode: the player sees a friendly fallback with a Reload action.
 * Engineering sees the error in console + (if wired) whatever monitoring
 * the host provides. We deliberately DON'T try to recover in-place —
 * Craft.js state after a thrown render is unreliable, so a full reload is
 * the safest path back.
 *
 * This is class-based by necessity: React has no hooks-based error
 * boundary API yet.
 */
interface Props {
  children: React.ReactNode
  /** Optional CSS vars so the fallback picks up the campaign theme. */
  accentColor?: string
}

interface State {
  hasError: boolean
  message: string | null
}

export class CanvasErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, message: null }
  }

  static getDerivedStateFromError(err: unknown): State {
    return {
      hasError: true,
      message: err instanceof Error ? err.message : 'Unknown render error',
    }
  }

  componentDidCatch(err: unknown, info: React.ErrorInfo) {
    // Surface in console for operators/devs. When a monitoring SDK
    // (Sentry, etc.) gets wired up, forward here too.
    // eslint-disable-next-line no-console
    console.error('[canvas] render failed:', err, info.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div
        role="alert"
        style={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ maxWidth: 420 }}>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.5 }}>⚠︎</div>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
            Something went wrong loading this promotion.
          </h2>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20, lineHeight: 1.5 }}>
            We've logged the issue. Try reloading — if it keeps happening, the promotion may be misconfigured.
          </p>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') window.location.reload()
            }}
            style={{
              padding: '10px 24px',
              background: this.props.accentColor ?? '#7c3aed',
              color: '#fff',
              borderRadius: 999,
              border: 'none',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 13,
              letterSpacing: '0.04em',
            }}
          >
            Reload
          </button>
          {process.env.NODE_ENV !== 'production' && this.state.message && (
            <pre
              style={{
                marginTop: 20,
                fontSize: 11,
                textAlign: 'left',
                background: '#f3f4f6',
                padding: 10,
                borderRadius: 6,
                overflow: 'auto',
                maxHeight: 160,
              }}
            >
              {this.state.message}
            </pre>
          )}
        </div>
      </div>
    )
  }
}
