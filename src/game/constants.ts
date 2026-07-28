/**
 * Color Gate Rush ? shared game constants
 */

/** Active cube face colors (3 faces). */
export const FACES = {
  CYAN: 0,
  MAGENTA: 1,
  GOLD: 2,
} as const

export type Face = (typeof FACES)[keyof typeof FACES]

export const FACE_COUNT = 3

export const FACE_NAMES: Record<Face, string> = {
  [FACES.CYAN]: 'CYAN',
  [FACES.MAGENTA]: 'MAGENTA',
  [FACES.GOLD]: 'GOLD',
}

export const START_FACE: Face = FACES.CYAN

export const ALL_FACES: Face[] = [FACES.CYAN, FACES.MAGENTA, FACES.GOLD]

/** Depth along the tunnel: 0 = far spawn, 1 = player hit plane. */
export const GATE_SPAWN_DEPTH = 0
export const GATE_HIT_DEPTH = 1
export const GATE_DESPAWN_DEPTH = 1.12

/** Approach rate (depth units per second). */
export const BASE_APPROACH = 0.36
export const MAX_APPROACH = 0.9
export const APPROACH_RAMP = 0.011

/** Beat / BPM. */
export const BASE_BPM = 104
export const MAX_BPM = 180
export const BPM_RAMP = 0.52

/** Spawn spacing in beats. */
export const SPAWN_BEATS_START = 2.5
export const SPAWN_BEATS_MIN = 0.9

/** Perfect / judge windows. */
export const PERFECT_DEPTH = 0.055
export const JUDGE_EARLY = 0.045
export const JUDGE_LATE = 0.03

/** Score. */
export const SURVIVAL_SCORE_RATE = 12
export const GATE_PASS_POINTS = 100
export const DUAL_PASS_BONUS = 50
export const PERFECT_BONUS = 80
export const COMBO_STEP_BONUS = 18
export const MAX_COMBO_MULT = 10

export const DEATH_HOLD_DURATION = 0.9
export const SPAWN_PROTECT = 1.15

/** Dual-gate chance ramps with difficulty. */
export const DUAL_GATE_BASE = 0.04
export const DUAL_GATE_MAX = 0.32

export const COLORS = {
  bg: '#050512',
  fog: '#0a0a20',
  cyan: '#00f0ff',
  cyanSoft: '#00f0ff88',
  cyanGlow: '#00ffcc',
  magenta: '#ff00aa',
  magentaSoft: '#ff00aa88',
  magentaGlow: '#ff44cc',
  gold: '#ffd700',
  goldSoft: '#ffd70088',
  goldGlow: '#ffee66',
  white: '#e8ffff',
  danger: '#ff3366',
  road: '#12122a',
  panel: 'rgba(8, 12, 32, 0.82)',
} as const

export type GameStatus =
  | 'start'
  | 'playing'
  | 'paused'
  | 'dying'
  | 'gameover'

export type DeathCause = 'wrong_color' | 'unknown'

export const GAME_OVER_TIPS = [
  'Three faces ? cycle through Cyan, Magenta, Gold. Don?t overshoot.',
  'Watch far gates. Plan one cycle ahead when colors chain.',
  'Perfects need a clutch cycle in the thin glow band.',
  'Dual rings: match outer first, then inner if different.',
  'Already matching? Stay. Extra cycles break combos.',
  '? / A cycles back. Use it when you overshoot by one face.',
] as const

export function faceColor(face: Face, soft = false): string {
  switch (face) {
    case FACES.CYAN:
      return soft ? COLORS.cyanSoft : COLORS.cyan
    case FACES.MAGENTA:
      return soft ? COLORS.magentaSoft : COLORS.magenta
    default:
      return soft ? COLORS.goldSoft : COLORS.gold
  }
}

export function faceGlow(face: Face): string {
  switch (face) {
    case FACES.CYAN:
      return COLORS.cyanGlow
    case FACES.MAGENTA:
      return COLORS.magentaGlow
    default:
      return COLORS.goldGlow
  }
}

export function nextFace(face: Face): Face {
  return ((face + 1) % FACE_COUNT) as Face
}

export function prevFace(face: Face): Face {
  return ((face + FACE_COUNT - 1) % FACE_COUNT) as Face
}
