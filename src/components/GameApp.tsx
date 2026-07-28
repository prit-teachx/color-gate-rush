'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ErrorBoundary } from './ErrorBoundary'
import { GameCanvas } from './GameCanvas'
import { GameUI } from './GameUI'
import { sounds } from '../audio/sounds'
import { GameEngine, type GameSnapshot } from '../game/engine'
import { loadHighScore, saveHighScore } from '../storage/highScore'
import {
  loadAudioSettings,
  saveAudioSettings,
} from '../storage/audioSettings'
import styles from './GameApp.module.css'

/** Offline Color Gate Rush shell ? no backend. */
export function GameApp() {
  const engine = useMemo(() => new GameEngine(), [])
  const [snap, setSnap] = useState<GameSnapshot>(() => engine.snapshot())
  const [muted, setMuted] = useState(false)
  const [audioReady, setAudioReady] = useState(false)

  useEffect(() => {
    void sounds.load()
    return () => {
      sounds.dispose()
    }
  }, [])

  useEffect(() => {
    const sync = () => setMuted(sounds.getMuted())
    sync()
    return sounds.onChange(sync)
  }, [])

  useEffect(() => {
    let mounted = true
    loadAudioSettings()
      .then((s) => {
        if (!mounted) return
        sounds.setMuted(s.muted)
        sounds.setVolume(s.volume)
        setAudioReady(true)
      })
      .catch(() => {
        if (mounted) setAudioReady(true)
      })
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!audioReady) return
    saveAudioSettings({ muted, volume: sounds.getVolume() }).catch(() => {})
  }, [muted, audioReady])

  useEffect(() => {
    let mounted = true
    loadHighScore()
      .then((hs) => {
        if (!mounted) return
        engine.setHighScore(hs)
      })
      .catch(() => {})

    const unsub = engine.onChange((s) => {
      setSnap(s)
      if (s.status === 'gameover' && s.isNewHighScore) {
        saveHighScore(s.highScore).catch(() => {})
      }
      if (s.status === 'playing') {
        sounds.setBpm(s.bpm)
      }
    })

    const unsubEvents = engine.onEvent((event) => {
      switch (event.type) {
        case 'cycle':
          sounds.play('cycle')
          try {
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              navigator.vibrate(10)
            }
          } catch {
            /* ignore */
          }
          break
        case 'gatePass':
          if (event.dual) sounds.play('dual')
          else sounds.play(event.perfect ? 'perfect' : 'pass')
          if (event.perfect) sounds.play('perfect')
          break
        case 'nearMiss':
          try {
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              navigator.vibrate(14)
            }
          } catch {
            /* ignore */
          }
          break
        case 'crash':
          sounds.play('crash')
          try {
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              navigator.vibrate([30, 40, 30])
            }
          } catch {
            /* ignore */
          }
          break
        case 'beat':
          sounds.play('beat')
          break
        case 'runStart':
          sounds.startRun()
          break
        case 'runStop':
          sounds.stopRun()
          break
        default:
          break
      }
    })

    const onVis = () => {
      if (document.visibilityState !== 'visible') {
        sounds.stopRun()
        if (engine.status === 'playing') engine.pauseGame()
      } else if (engine.status === 'playing') {
        sounds.startRun()
      }
    }
    document.addEventListener('visibilitychange', onVis)

    return () => {
      mounted = false
      unsub()
      unsubEvents()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [engine])

  const unlockAnd = useCallback(async (fn: () => void) => {
    await sounds.unlock().catch(() => {})
    fn()
  }, [])

  const onStart = useCallback(() => {
    void unlockAnd(() => engine.startGame())
  }, [engine, unlockAnd])

  const onResume = useCallback(() => {
    void unlockAnd(() => engine.resumeGame())
  }, [engine, unlockAnd])

  const onPause = useCallback(() => engine.pauseGame(), [engine])
  const onRestart = useCallback(() => {
    void unlockAnd(() => engine.startGame())
  }, [engine, unlockAnd])
  const onToggleMute = useCallback(() => {
    void unlockAnd(() => sounds.toggleMute())
  }, [unlockAnd])

  return (
    <ErrorBoundary>
      <div className={styles.root}>
        <GameCanvas engine={engine} />
        <GameUI
          snap={snap}
          muted={muted}
          onStart={onStart}
          onResume={onResume}
          onPause={onPause}
          onRestart={onRestart}
          onToggleMute={onToggleMute}
        />
      </div>
    </ErrorBoundary>
  )
}
