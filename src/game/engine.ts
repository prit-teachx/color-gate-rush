import {
  APPROACH_RAMP,
  BASE_APPROACH,
  BASE_BPM,
  BPM_RAMP,
  COMBO_STEP_BONUS,
  DEATH_HOLD_DURATION,
  DUAL_PASS_BONUS,
  GATE_DESPAWN_DEPTH,
  GATE_HIT_DEPTH,
  GATE_PASS_POINTS,
  GAME_OVER_TIPS,
  JUDGE_EARLY,
  JUDGE_LATE,
  MAX_APPROACH,
  MAX_BPM,
  MAX_COMBO_MULT,
  PERFECT_BONUS,
  PERFECT_DEPTH,
  SPAWN_BEATS_MIN,
  SPAWN_BEATS_START,
  SPAWN_PROTECT,
  START_FACE,
  SURVIVAL_SCORE_RATE,
  nextFace,
  prevFace,
  type DeathCause,
  type Face,
  type GameStatus,
} from './constants'
import {
  activeRequiredFace,
  createGate,
  createRunSeed,
  makeRand,
  resetGateSeq,
  type GateData,
} from './spawn'

export interface GameSnapshot {
  status: GameStatus
  score: number
  highScore: number
  isNewHighScore: boolean
  runId: number
  face: Face
  combo: number
  maxCombo: number
  gatesCleared: number
  perfects: number
  dualsCleared: number
  bpm: number
  beatPhase: number
  timeSurvived: number
  deathCause: DeathCause | null
  scoreDeltaToBest: number
  tipIndex: number
  switchFlash: number
  perfectFlash: number
  /** Next unresolved gate required face (for HUD preview). */
  nextRequired: Face | null
  nextIsDual: boolean
}

export type SnapshotListener = (snap: GameSnapshot) => void

export type GameEvent =
  | { type: 'cycle'; face: Face; dir: 1 | -1 }
  | { type: 'gatePass'; perfect: boolean; combo: number; dual: boolean }
  | { type: 'nearMiss' }
  | { type: 'crash'; cause: DeathCause }
  | { type: 'beat' }
  | { type: 'runStart' }
  | { type: 'runStop' }

export type GameEventListener = (event: GameEvent) => void

/**
 * Pure Color Gate Rush simulation ? no React / canvas.
 */
export class GameEngine {
  status: GameStatus = 'start'
  score = 0
  highScore = 0
  isNewHighScore = false
  runId = 0
  face: Face = START_FACE
  combo = 0
  maxCombo = 0
  gatesCleared = 0
  perfects = 0
  dualsCleared = 0
  bpm = BASE_BPM
  beatPhase = 0
  timeSurvived = 0
  approach = BASE_APPROACH
  gates: GateData[] = []
  deathCause: DeathCause | null = null
  deathHoldLeft = 0
  tipIndex = 0
  switchFlash = 0
  perfectFlash = 0

  private highScoreAtRunStart = 0
  private runSeed = 0
  private rand: () => number = () => Math.random()
  private lastSpawnFace: Face | null = null
  private beatsUntilSpawn = 1.2
  private beatCarry = 0
  private spawnProtectLeft = 0
  private lastBeatIndex = -1
  private lastCycleAt = -999

  private listeners = new Set<SnapshotListener>()
  private eventListeners = new Set<GameEventListener>()
  private lastEmit = 0

  onChange(fn: SnapshotListener) {
    this.listeners.add(fn)
    fn(this.snapshot())
    return () => {
      this.listeners.delete(fn)
    }
  }

  onEvent(fn: GameEventListener) {
    this.eventListeners.add(fn)
    return () => {
      this.eventListeners.delete(fn)
    }
  }

  private emitEvent(event: GameEvent) {
    for (const fn of this.eventListeners) fn(event)
  }

  setHighScore(value: number) {
    this.highScore = Math.max(0, Math.floor(value))
    this.emit(true)
  }

  private peekNext(): GateData | null {
    let best: GateData | null = null
    for (const g of this.gates) {
      if (g.resolved) continue
      if (!best || g.depth > best.depth) best = g
    }
    return best
  }

  snapshot(): GameSnapshot {
    const prevBest = this.highScoreAtRunStart || this.highScore
    const next = this.peekNext()
    return {
      status: this.status,
      score: this.score,
      highScore: this.highScore,
      isNewHighScore: this.isNewHighScore,
      runId: this.runId,
      face: this.face,
      combo: this.combo,
      maxCombo: this.maxCombo,
      gatesCleared: this.gatesCleared,
      perfects: this.perfects,
      dualsCleared: this.dualsCleared,
      bpm: this.bpm,
      beatPhase: this.beatPhase,
      timeSurvived: this.timeSurvived,
      deathCause: this.deathCause,
      scoreDeltaToBest: Math.floor(this.score) - prevBest,
      tipIndex: this.tipIndex,
      switchFlash: this.switchFlash,
      perfectFlash: this.perfectFlash,
      nextRequired: next ? activeRequiredFace(next) : null,
      nextIsDual: next?.isDual ?? false,
    }
  }

  private emit(force = false) {
    const now = Date.now()
    if (!force && now - this.lastEmit < 50) return
    this.lastEmit = now
    const snap = this.snapshot()
    for (const fn of this.listeners) fn(snap)
  }

  startGame() {
    this.runId += 1
    this.highScoreAtRunStart = this.highScore
    this.isNewHighScore = false
    this.score = 0
    this.face = START_FACE
    this.combo = 0
    this.maxCombo = 0
    this.gatesCleared = 0
    this.perfects = 0
    this.dualsCleared = 0
    this.bpm = BASE_BPM
    this.beatPhase = 0
    this.timeSurvived = 0
    this.approach = BASE_APPROACH
    this.gates = []
    this.deathCause = null
    this.deathHoldLeft = 0
    this.tipIndex = Math.floor(Math.random() * GAME_OVER_TIPS.length)
    this.switchFlash = 0
    this.perfectFlash = 0
    this.runSeed = createRunSeed()
    this.rand = makeRand(this.runSeed)
    this.lastSpawnFace = null
    this.beatsUntilSpawn = 1.0
    this.beatCarry = 0
    this.spawnProtectLeft = SPAWN_PROTECT
    this.lastBeatIndex = -1
    this.lastCycleAt = -999
    resetGateSeq()
    this.status = 'playing'
    this.emitEvent({ type: 'runStart' })
    this.emit(true)
  }

  pauseGame() {
    if (this.status !== 'playing') return
    this.status = 'paused'
    this.emitEvent({ type: 'runStop' })
    this.emit(true)
  }

  resumeGame() {
    if (this.status !== 'paused') return
    this.status = 'playing'
    this.emitEvent({ type: 'runStart' })
    this.emit(true)
  }

  /** Cycle cube face forward (0?1?2?0). */
  cycleForward() {
    this.cycle(1)
  }

  /** Cycle cube face backward. */
  cycleBack() {
    this.cycle(-1)
  }

  private cycle(dir: 1 | -1) {
    if (this.status !== 'playing') return
    this.face = dir === 1 ? nextFace(this.face) : prevFace(this.face)
    this.lastCycleAt = this.timeSurvived
    this.switchFlash = 1
    this.emitEvent({ type: 'cycle', face: this.face, dir })
    this.tryPassGatesInWindow()
    this.emit(true)
  }

  tick(dt: number) {
    if (dt <= 0 || dt > 0.1) {
      if (dt > 0.1) dt = 1 / 60
      else return
    }

    if (this.status === 'dying') {
      this.deathHoldLeft -= dt
      this.switchFlash = Math.max(0, this.switchFlash - dt * 3)
      this.perfectFlash = Math.max(0, this.perfectFlash - dt * 3)
      if (this.deathHoldLeft <= 0) this.finishGameOver()
      this.emit()
      return
    }

    if (this.status !== 'playing') return

    this.timeSurvived += dt
    this.spawnProtectLeft = Math.max(0, this.spawnProtectLeft - dt)
    this.switchFlash = Math.max(0, this.switchFlash - dt * 4)
    this.perfectFlash = Math.max(0, this.perfectFlash - dt * 3.5)

    const t = this.timeSurvived
    // Breathing intensity: valleys every ~12s
    const wave = 0.5 + 0.5 * Math.sin((t / 12) * Math.PI * 2)
    const calm = t % 14 >= 11
    const rampScale = calm ? 0.35 : 0.55 + 0.45 * wave

    this.bpm = Math.min(MAX_BPM, BASE_BPM + t * BPM_RAMP * rampScale)
    this.approach = Math.min(
      MAX_APPROACH,
      BASE_APPROACH + t * APPROACH_RAMP * rampScale
    )
    const difficulty01 = Math.min(
      1,
      (this.bpm - BASE_BPM) / (MAX_BPM - BASE_BPM)
    )

    const beatsPerSec = this.bpm / 60
    this.beatCarry += dt * beatsPerSec
    this.beatPhase = this.beatCarry % 1
    const beatIndex = Math.floor(this.beatCarry)
    if (beatIndex !== this.lastBeatIndex) {
      this.lastBeatIndex = beatIndex
      this.emitEvent({ type: 'beat' })
    }

    this.beatsUntilSpawn -= dt * beatsPerSec
    const spawnInterval =
      SPAWN_BEATS_START -
      difficulty01 * (SPAWN_BEATS_START - SPAWN_BEATS_MIN)

    while (this.beatsUntilSpawn <= 0) {
      const gate = createGate(this.rand, this.lastSpawnFace, difficulty01)
      this.lastSpawnFace = gate.face
      this.gates.push(gate)
      this.beatsUntilSpawn += spawnInterval
    }

    for (const g of this.gates) {
      if (g.resolved) {
        g.depth += this.approach * dt * 1.15
        continue
      }
      g.depth += this.approach * dt
    }

    this.tryPassGatesInWindow()
    for (const g of this.gates) {
      if (g.resolved) continue
      if (g.depth > GATE_HIT_DEPTH + JUDGE_LATE) {
        this.resolveGate(g)
      } else if (
        g.depth >= GATE_HIT_DEPTH &&
        this.face !== activeRequiredFace(g) &&
        this.spawnProtectLeft <= 0
      ) {
        this.resolveGate(g)
      }
    }

    this.gates = this.gates.filter((g) => g.depth < GATE_DESPAWN_DEPTH)
    this.score += SURVIVAL_SCORE_RATE * dt * (1 + this.combo * 0.05)
    this.emit()
  }

  private tryPassGatesInWindow() {
    for (const g of this.gates) {
      if (g.resolved) continue
      if (g.depth < GATE_HIT_DEPTH - JUDGE_EARLY) continue
      if (g.depth > GATE_HIT_DEPTH + JUDGE_LATE) continue
      if (this.face === activeRequiredFace(g)) {
        this.resolveGate(g)
      }
    }
  }

  private resolveGate(g: GateData) {
    if (g.resolved) return

    if (this.spawnProtectLeft > 0) {
      g.resolved = true
      g.passed = true
      g.stage = 2
      return
    }

    const required = activeRequiredFace(g)
    if (this.face !== required) {
      g.resolved = true
      g.passed = false
      this.beginDeath('wrong_color')
      return
    }

    // Dual gate: first stage (outer) then need second pass for inner
    if (g.isDual && g.stage === 0 && g.innerFace != null) {
      g.stage = 1
      // Outer cleared ? if same color as inner, auto-continue next tick;
      // if different, player must cycle while still in window
      if (this.face === g.innerFace) {
        // same face: complete immediately
        this.completeGate(g, false)
      }
      // else leave unresolved at stage 1 for more cycles in window
      return
    }

    this.completeGate(g, g.isDual)
  }

  private completeGate(g: GateData, wasDual: boolean) {
    if (g.resolved) return
    g.resolved = true
    g.passed = true
    g.stage = 2

    const clutch =
      this.timeSurvived - this.lastCycleAt <= 0.45 &&
      g.depth >= GATE_HIT_DEPTH - PERFECT_DEPTH * 3
    const perfect = clutch
    g.wasPerfect = perfect

    this.gatesCleared += 1
    if (wasDual || g.isDual) this.dualsCleared += 1
    this.combo += 1
    this.maxCombo = Math.max(this.maxCombo, this.combo)
    if (perfect) this.perfects += 1

    const mult = Math.min(MAX_COMBO_MULT, 1 + Math.floor(this.combo / 3))
    let pts = GATE_PASS_POINTS * mult
    pts += Math.min(this.combo, 20) * COMBO_STEP_BONUS
    if (g.isDual) pts += DUAL_PASS_BONUS * mult
    if (perfect) {
      pts += PERFECT_BONUS * mult
      this.perfectFlash = 1
      this.emitEvent({ type: 'nearMiss' })
    }
    this.score += pts
    this.emitEvent({
      type: 'gatePass',
      perfect,
      combo: this.combo,
      dual: g.isDual,
    })
  }

  private beginDeath(cause: DeathCause) {
    if (this.status === 'dying' || this.status === 'gameover') return
    this.status = 'dying'
    this.deathCause = cause
    this.deathHoldLeft = DEATH_HOLD_DURATION
    this.combo = 0
    this.emitEvent({ type: 'crash', cause })
    this.emitEvent({ type: 'runStop' })
    this.emit(true)
  }

  private finishGameOver() {
    this.status = 'gameover'
    const final = Math.floor(this.score)
    if (final > this.highScore) {
      this.highScore = final
      this.isNewHighScore = true
    }
    this.emit(true)
  }
}
