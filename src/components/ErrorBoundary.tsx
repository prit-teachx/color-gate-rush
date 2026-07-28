'use client'

import React, { Component, type ErrorInfo, type ReactNode } from 'react'
import styles from './ErrorBoundary.module.css'

type Props = { children: ReactNode }
type State = { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Color Gate Rush crashed:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className={styles.root}>
          <h1 className={styles.title}>Something went wrong</h1>
          <p className={styles.msg}>{this.state.error.message}</p>
          <button
            type="button"
            className={styles.btn}
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
