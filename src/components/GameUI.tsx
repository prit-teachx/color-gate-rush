'use client'

import React, { memo } from 'react'
import type { GameSnapshot } from '../game/engine'
import {
  FACE_NAMES,
  FACES,
  GAME_OVER_TIPS,
  type DeathCause,
  type Face,
} from '../game/constants'
import styles from './GameUI.module.css'

type Props = {
  snap: GameSnapshot
  muted: boolean
  onStart: () => void
  onResume: () => void
  onPause: () => void
  onRestart: () => void
  onToggleMute: () => void
}

function deathCauseLabel(cause: DeathCause | null): string {
  switch (cause) {
    case 'wrong_color':
      return 'Wrong face at the gate. Cycle earlier ? or reverse with A / ?.'
    default:
      return 'Run ended'
  }
}

function closeCallLine(
  scoreDeltaToBest: number,
  isNewHighScore: boolean
): string | null {
  if (isNewHighScore) return null
  if (scoreDeltaToBest >= 0) return null
  const short = Math.abs(scoreDeltaToBest)
  if (short <= 0) return null
  if (short <= 80) return `So close! Only ${short} pts from a new record.`
  if (short <= 300) return `${short} pts shy of your best. One more run!`
  return null
}

function formatTime(sec: number): string {
  const s = Math.floor(sec)
  const m = Math.floor(s / 60)
  const r = s % 60
  return m > 0 ? `${m}:${r.toString().padStart(2, '0')}` : `${r}s`
}

function faceClass(face: Face): string {
  if (face === FACES.CYAN) return styles.faceCyan
  if (face === FACES.MAGENTA) return styles.faceMagenta
  return styles.faceGold
}

function GameUIInner({
  snap,
  muted,
  onStart,
  onResume,
  onPause,
  onRestart,
  onToggleMute,
}: Props) {
  const showHud =
    snap.status === 'playing' ||
    snap.status === 'paused' ||
    snap.status === 'dying' ||
    snap.status === 'gameover'

  const showPauseControls =
    snap.status === 'playing' || snap.status === 'paused'

  const tip =
    GAME_OVER_TIPS[snap.tipIndex % GAME_OVER_TIPS.length] ?? GAME_OVER_TIPS[0]
  const closeCall = closeCallLine(snap.scoreDeltaToBest, snap.isNewHighScore)
  const faceName = FACE_NAMES[snap.face]

  return (
    <div className={styles.root}>
      {showHud && (
        <div className={styles.hud} aria-live="polite">
          <div className={styles.scoreLabel}>SCORE</div>
          <div className={styles.scoreValue}>{Math.floor(snap.score)}</div>
          <div className={styles.hudRow}>
            <span className={styles.pill}>? {Math.round(snap.bpm)} BPM</span>
            <span className={`${styles.pill} ${styles.pillHot}`}>
              ?{Math.max(1, snap.combo)} combo
            </span>
            <span className={styles.pill}>?? {snap.highScore}</span>
          </div>
          {(snap.status === 'playing' || snap.status === 'paused') && (
            <>
              <div className={`${styles.layerBadge} ${faceClass(snap.face)}`}>
                {faceName}
              </div>
              {snap.nextRequired != null && (
                <div className={styles.nextHint}>
                  NEXT{' '}
                  <span className={faceClass(snap.nextRequired)}>
                    {FACE_NAMES[snap.nextRequired]}
                  </span>
                  {snap.nextIsDual ? ' ? DUAL' : ''}
                </div>
              )}
              <div className={styles.comboPop}>
                {snap.combo >= 3 ? `${snap.combo} STREAK` : ''}
                {snap.perfectFlash > 0.4 ? '  ?  PERFECT' : ''}
              </div>
            </>
          )}
        </div>
      )}

      {showPauseControls && (
        <div className={styles.topRight}>
          <button
            type="button"
            className={styles.iconBtn}
            aria-label={snap.status === 'paused' ? 'Resume' : 'Pause'}
            onClick={snap.status === 'paused' ? onResume : onPause}
          >
            <span className={styles.pauseIcon}>
              {snap.status === 'paused' ? '?' : '??'}
            </span>
          </button>
          <button
            type="button"
            className={styles.iconBtn}
            aria-label={muted ? 'Unmute sound' : 'Mute sound'}
            onClick={onToggleMute}
          >
            <span className={styles.iconBtnText}>{muted ? '??' : '??'}</span>
          </button>
        </div>
      )}

      {snap.status === 'dying' && (
        <div className={styles.dyingFlash} aria-hidden>
          <div className={styles.dyingLabel}>WRONG FACE</div>
        </div>
      )}

      {snap.status === 'start' && (
        <div className={styles.overlay}>
          <div className={styles.panel}>
            <h1 className={styles.title}>COLOR GATE RUSH</h1>
            <p className={styles.subtitle}>
              3-face cube ? neon tunnel ? offline
            </p>
            <div className={styles.controlsList}>
              <p className={styles.controlLine}>
                Tap / Space / ? &nbsp; cycle forward
              </p>
              <p className={styles.controlLine}>
                ? / A &nbsp; cycle back
              </p>
              <p className={styles.controlLine}>
                Left half of screen = back ? right = forward
              </p>
              <p className={styles.controlLine}>P / Esc &nbsp; pause</p>
            </div>

            <div className={styles.tipCard}>
              <div className={styles.tipCardTitle}>THE HOOK</div>
              <p className={styles.tipCardBody}>
                Match your cube face to each gate: Cyan, Magenta, or Gold.
                Dual rings need two matches ? cycle twice if the colors differ.
              </p>
            </div>

            {snap.highScore > 0 && (
              <p className={styles.highScore}>Best: {snap.highScore}</p>
            )}
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={onStart}
            >
              TAP TO START
            </button>
          </div>
        </div>
      )}

      {snap.status === 'paused' && (
        <div className={styles.overlay}>
          <div className={styles.panel}>
            <h1 className={styles.title}>PAUSED</h1>
            <p className={styles.subtitle}>Game on hold</p>
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={onResume}
            >
              ? RESUME
            </button>
          </div>
        </div>
      )}

      {snap.status === 'gameover' && (
        <div
          className={styles.overlay}
          role="button"
          tabIndex={0}
          onClick={onRestart}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onRestart()
            }
          }}
          aria-label="Restart run"
        >
          <div className={styles.panel}>
            <h1 className={`${styles.title} ${styles.titleDanger}`}>
              GAME OVER
            </h1>
            <p className={styles.deathLine}>
              {deathCauseLabel(snap.deathCause)}
            </p>
            <div className={styles.finalLabel}>Final Score</div>
            <div className={styles.finalValue}>{Math.floor(snap.score)}</div>
            <div className={styles.statsRow}>
              <span className={styles.stat}>
                Time {formatTime(snap.timeSurvived)}
              </span>
              <span className={styles.stat}>Gates {snap.gatesCleared}</span>
              <span className={styles.stat}>Perfects {snap.perfects}</span>
              <span className={styles.stat}>Duals {snap.dualsCleared}</span>
            </div>
            {snap.isNewHighScore && (
              <p className={styles.newRecord}>? NEW HIGH SCORE ?</p>
            )}
            {!snap.isNewHighScore && snap.highScore > 0 && (
              <p className={styles.highScore}>Best: {snap.highScore}</p>
            )}
            {closeCall && <p className={styles.closeCall}>{closeCall}</p>}
            <p className={styles.rotateTip}>{tip}</p>
            <button
              type="button"
              className={`${styles.btnPrimary} ${styles.btnRetry}`}
              onClick={onRestart}
            >
              RETRY
            </button>
            <p className={styles.tapAnywhere}>tap anywhere to retry</p>
          </div>
        </div>
      )}

      {snap.status === 'playing' && (
        <p className={styles.hint}>
          Cycle face ? match gate ? dual rings need two colors
        </p>
      )}
    </div>
  )
}

export const GameUI = memo(GameUIInner)
