'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { GameEngine } from '../game/engine'
import { GateRenderer } from '../game/renderer'
import { sounds } from '../audio/sounds'
import styles from './GameCanvas.module.css'

type Props = {
  engine: GameEngine
}

/**
 * Full-screen Canvas 2D + pointer/keyboard controls.
 * Tap / Space cycles face forward; A/? cycles back.
 */
export function GameCanvas({ engine }: Props) {
  const engineRef = useRef(engine)
  engineRef.current = engine

  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rendererRef = useRef<GateRenderer | null>(null)
  const rafRef = useRef<number | null>(null)
  const lastTsRef = useRef(0)
  const disposedRef = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  const stopLoop = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  useEffect(() => {
    disposedRef.current = false
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    let cancelled = false

    try {
      const ctx = canvas.getContext('2d', { alpha: false })
      if (!ctx) {
        setError('Canvas 2D is not available in this browser.')
        return
      }

      const renderer = new GateRenderer(ctx)
      rendererRef.current = renderer

      const resize = () => {
        if (cancelled || disposedRef.current) return
        const w = Math.max(1, container.clientWidth)
        const h = Math.max(1, container.clientHeight)
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        canvas.width = Math.floor(w * dpr)
        canvas.height = Math.floor(h * dpr)
        canvas.style.width = `${w}px`
        canvas.style.height = `${h}px`
        renderer.setSize(w, h, dpr)
      }

      resize()
      setError(null)

      const ro = new ResizeObserver(() => resize())
      ro.observe(container)

      lastTsRef.current = performance.now()

      const loop = (ts: number) => {
        if (cancelled || disposedRef.current) return
        const raw = (ts - lastTsRef.current) / 1000
        lastTsRef.current = ts
        const dt = Math.min(0.05, Math.max(0, raw))

        const eng = engineRef.current
        eng.tick(dt)
        renderer.draw(eng, dt)

        rafRef.current = requestAnimationFrame(loop)
      }
      rafRef.current = requestAnimationFrame(loop)

      const unsub = engEvents(engineRef, renderer, container)

      return () => {
        cancelled = true
        disposedRef.current = true
        stopLoop()
        unsub()
        ro.disconnect()
        renderer.dispose()
        rendererRef.current = null
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start renderer')
      return () => {
        cancelled = true
        stopLoop()
      }
    }
  }, [retryKey, stopLoop])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const eng = engineRef.current
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if (
        e.code === 'Space' ||
        e.code === 'ArrowUp' ||
        e.code === 'KeyW' ||
        e.code === 'ArrowRight' ||
        e.code === 'KeyD'
      ) {
        e.preventDefault()
        void sounds.unlock().then(() => {
          if (eng.status === 'start' || eng.status === 'gameover') {
            eng.startGame()
            return
          }
          if (eng.status === 'playing') eng.cycleForward()
        })
        return
      }
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault()
        if (eng.status === 'playing') {
          void sounds.unlock().then(() => eng.cycleBack())
        }
        return
      }
      if (e.code === 'KeyP' || e.code === 'Escape') {
        e.preventDefault()
        if (eng.status === 'playing') eng.pauseGame()
        else if (eng.status === 'paused') {
          void sounds.unlock().then(() => eng.resumeGame())
        }
      }
      if (e.code === 'Enter' || e.code === 'KeyR') {
        if (eng.status === 'start' || eng.status === 'gameover') {
          e.preventDefault()
          void sounds.unlock().then(() => eng.startGame())
        } else if (eng.status === 'paused') {
          e.preventDefault()
          void sounds.unlock().then(() => eng.resumeGame())
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const eng = engineRef.current
    if (eng.status !== 'playing') return
    e.preventDefault()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = e.clientX - rect.left
    const mid = rect.width * 0.5
    void sounds.unlock().then(() => {
      if (x < mid * 0.85) eng.cycleBack()
      else eng.cycleForward()
    })
  }, [])

  if (error) {
    return (
      <div className={styles.root}>
        <div className={styles.error}>
          <p>{error}</p>
          <button
            type="button"
            className={styles.retry}
            onClick={() => setRetryKey((k) => k + 1)}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className={styles.root}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        onPointerDown={onPointerDown}
        aria-label="Color Gate Rush playfield. Tap to cycle cube face."
      />
    </div>
  )
}

function engEvents(
  engineRef: React.MutableRefObject<GameEngine>,
  renderer: GateRenderer,
  container: HTMLElement
) {
  const eng = engineRef.current
  return eng.onEvent((event) => {
    if (event.type === 'gatePass' && event.perfect) {
      const w = container.clientWidth
      const h = container.clientHeight
      renderer.burst(w * 0.5, h * 0.55, eng.face, 18)
    }
    if (event.type === 'cycle') {
      const w = container.clientWidth
      const h = container.clientHeight
      renderer.burst(w * 0.5, h * 0.55, event.face, 8)
    }
  })
}
