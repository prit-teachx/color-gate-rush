import {
  DUAL_GATE_BASE,
  DUAL_GATE_MAX,
  FACES,
  GATE_SPAWN_DEPTH,
  ALL_FACES,
  type Face,
} from './constants'

export interface GateData {
  id: string
  /** Required face for the primary (outer) ring. */
  face: Face
  /** If set, a dual gate: inner ring requires this face after outer clears. */
  innerFace: Face | null
  /** Dual stage: 0 = outer active, 1 = inner active, 2 = fully cleared. */
  stage: 0 | 1 | 2
  depth: number
  resolved: boolean
  wasPerfect: boolean
  passed: boolean
  isDual: boolean
}

export function createRunSeed(): number {
  return (Math.random() * 0xffffffff) >>> 0
}

export function makeRand(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

let gateSeq = 0

export function resetGateSeq() {
  gateSeq = 0
}

function pickFace(rand: () => number, avoid: Face | null, flipBias: number): Face {
  if (avoid == null) {
    return ALL_FACES[Math.floor(rand() * ALL_FACES.length)]!
  }
  if (rand() < flipBias) {
    const others = ALL_FACES.filter((f) => f !== avoid)
    return others[Math.floor(rand() * others.length)]!
  }
  return avoid
}

/**
 * Spawn next gate:
 * - Prefer color changes so the player must cycle
 * - Occasional same-color rests
 * - Dual gates more common as difficulty rises
 */
export function createGate(
  rand: () => number,
  prevFace: Face | null,
  difficulty01: number
): GateData {
  gateSeq += 1
  const flipBias = 0.58 + difficulty01 * 0.28
  const face = pickFace(rand, prevFace, flipBias)

  const dualChance =
    DUAL_GATE_BASE + difficulty01 * (DUAL_GATE_MAX - DUAL_GATE_BASE)
  // Dual gates after player has learned single matching
  const isDual = difficulty01 > 0.18 && rand() < dualChance

  let innerFace: Face | null = null
  if (isDual) {
    // ~60% different inner color (forces a second cycle)
    if (rand() < 0.62) {
      const others = ALL_FACES.filter((f) => f !== face)
      innerFace = others[Math.floor(rand() * others.length)]!
    } else {
      innerFace = face
    }
  }

  return {
    id: `g${gateSeq}`,
    face,
    innerFace,
    stage: 0,
    depth: GATE_SPAWN_DEPTH,
    resolved: false,
    wasPerfect: false,
    passed: false,
    isDual,
  }
}

/** Active required face for current dual stage. */
export function activeRequiredFace(g: GateData): Face {
  if (g.isDual && g.stage === 1 && g.innerFace != null) return g.innerFace
  return g.face
}
