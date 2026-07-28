import {
  COLORS,
  FACES,
  GATE_HIT_DEPTH,
  faceColor,
  faceGlow,
  type Face,
} from './constants'
import type { GameEngine } from './engine'
import { activeRequiredFace, type GateData } from './spawn'

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  size: number
}

/**
 * Canvas 2D neon tunnel + 3-face cube for Color Gate Rush.
 */
export class GateRenderer {
  private w = 1
  private h = 1
  private dpr = 1
  private particles: Particle[] = []
  private starField: { x: number; y: number; z: number; s: number }[] = []
  private cubeSpin = 0

  constructor(private ctx: CanvasRenderingContext2D) {
    this.initStars(90)
  }

  setSize(cssW: number, cssH: number, dpr: number) {
    this.w = Math.max(1, cssW)
    this.h = Math.max(1, cssH)
    this.dpr = dpr
  }

  dispose() {
    this.particles = []
  }

  private initStars(n: number) {
    this.starField = []
    for (let i = 0; i < n; i++) {
      this.starField.push({
        x: Math.random() * 2 - 1,
        y: Math.random() * 2 - 1,
        z: Math.random(),
        s: 0.4 + Math.random() * 1.2,
      })
    }
  }

  draw(engine: GameEngine, dt: number) {
    const ctx = this.ctx
    const w = this.w
    const h = this.h
    const cx = w * 0.5
    const cy = h * 0.4

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    ctx.fillStyle = COLORS.bg
    ctx.fillRect(0, 0, w, h)

    const beat = engine.beatPhase
    const pulse = 0.5 + 0.5 * Math.sin(beat * Math.PI * 2)
    const face = engine.face
    const playing =
      engine.status === 'playing' ||
      engine.status === 'dying' ||
      engine.status === 'paused'

    if (playing) this.cubeSpin += dt * (1.2 + engine.approach * 2)

    this.drawVignette(cx, cy, w, h, face, pulse, engine.switchFlash)
    this.drawStars(cx, cy, w, h, engine.approach, dt)
    this.drawTunnel(cx, cy, w, h, pulse, face)
    this.drawHitPlane(cx, cy, w, h, face, pulse)

    const gates = [...engine.gates].sort((a, b) => a.depth - b.depth)
    for (const g of gates) {
      this.drawGate(g, cx, cy, w, h)
    }

    this.drawCube(cx, cy, w, h, face, engine.switchFlash, pulse)

    if (engine.perfectFlash > 0.05) {
      ctx.save()
      ctx.globalAlpha = engine.perfectFlash * 0.22
      ctx.fillStyle = COLORS.gold
      ctx.fillRect(0, 0, w, h)
      ctx.restore()
    }

    if (engine.status === 'dying') {
      ctx.save()
      ctx.globalAlpha = 0.22
      ctx.fillStyle = COLORS.danger
      ctx.fillRect(0, 0, w, h)
      ctx.restore()
    }

    this.updateParticles(dt)
    this.drawParticles()

    const grad = ctx.createLinearGradient(0, h * 0.7, 0, h)
    grad.addColorStop(0, 'rgba(5,5,18,0)')
    grad.addColorStop(1, 'rgba(5,5,18,0.55)')
    ctx.fillStyle = grad
    ctx.fillRect(0, h * 0.7, w, h * 0.3)

    if (!playing && engine.status === 'start') {
      this.drawAttract(cx, cy, w, h, performance.now() / 1000)
    }
  }

  burst(x: number, y: number, face: Face, count = 14) {
    const color = faceColor(face)
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2
      const sp = 40 + Math.random() * 160
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.35 + Math.random() * 0.35,
        maxLife: 0.7,
        color,
        size: 2 + Math.random() * 3,
      })
    }
  }

  private depthScale(depth: number): number {
    // Perspective: far small, near large
    const t = Math.max(0, Math.min(1.2, depth))
    return 0.08 + t * t * 0.92
  }

  private drawVignette(
    cx: number,
    cy: number,
    w: number,
    h: number,
    face: Face,
    pulse: number,
    switchFlash: number
  ) {
    const ctx = this.ctx
    const r = Math.max(w, h) * 0.7
    const g = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r)
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(0.65, 'rgba(0,0,0,0)')
    g.addColorStop(1, 'rgba(0,0,0,0.75)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)

    if (switchFlash > 0.05) {
      ctx.save()
      ctx.globalAlpha = switchFlash * 0.18
      ctx.fillStyle = faceColor(face)
      ctx.fillRect(0, 0, w, h)
      ctx.restore()
    }

    // Subtle ambient tint
    ctx.save()
    ctx.globalAlpha = 0.04 + pulse * 0.03
    ctx.fillStyle = faceColor(face)
    ctx.fillRect(0, 0, w, h)
    ctx.restore()
  }

  private drawStars(
    cx: number,
    cy: number,
    w: number,
    h: number,
    approach: number,
    dt: number
  ) {
    const ctx = this.ctx
    const speed = 0.15 + approach * 0.35
    for (const s of this.starField) {
      s.z += dt * speed
      if (s.z > 1) {
        s.z = 0
        s.x = Math.random() * 2 - 1
        s.y = Math.random() * 2 - 1
      }
      const sc = 0.15 + s.z * s.z * 0.9
      const x = cx + s.x * w * 0.45 * sc
      const y = cy + s.y * h * 0.4 * sc
      ctx.globalAlpha = 0.25 + s.z * 0.55
      ctx.fillStyle = COLORS.white
      ctx.fillRect(x, y, s.s * (0.5 + s.z), s.s * (0.5 + s.z))
    }
    ctx.globalAlpha = 1
  }

  private drawTunnel(
    cx: number,
    cy: number,
    w: number,
    h: number,
    pulse: number,
    face: Face
  ) {
    const ctx = this.ctx
    const rings = 10
    for (let i = 0; i < rings; i++) {
      const t = i / rings
      const depth = t * 0.95
      const sc = this.depthScale(depth)
      const rw = w * 0.55 * sc
      const rh = h * 0.42 * sc
      ctx.save()
      ctx.strokeStyle = faceColor(face, true)
      ctx.globalAlpha = 0.08 + t * 0.12 + pulse * 0.04
      ctx.lineWidth = 1 + t * 2
      ctx.strokeRect(cx - rw, cy - rh, rw * 2, rh * 2)
      ctx.restore()
    }
  }

  private drawHitPlane(
    cx: number,
    cy: number,
    w: number,
    h: number,
    face: Face,
    pulse: number
  ) {
    const ctx = this.ctx
    const sc = this.depthScale(GATE_HIT_DEPTH)
    const rw = w * 0.55 * sc
    const rh = h * 0.42 * sc
    ctx.save()
    ctx.strokeStyle = faceGlow(face)
    ctx.globalAlpha = 0.35 + pulse * 0.25
    ctx.lineWidth = 3
    ctx.shadowColor = faceColor(face)
    ctx.shadowBlur = 12
    this.roundRect(cx - rw, cy - rh, rw * 2, rh * 2, 10)
    ctx.stroke()
    ctx.restore()
  }

  private drawGate(g: GateData, cx: number, cy: number, w: number, h: number) {
    const ctx = this.ctx
    const sc = this.depthScale(g.depth)
    const rw = w * 0.55 * sc
    const rh = h * 0.42 * sc
    const alpha = g.resolved
      ? g.passed
        ? 0.25
        : 0.45
      : 0.55 + g.depth * 0.4

    const outer = g.face
    const color = faceColor(outer)
    const glow = faceGlow(outer)

    ctx.save()
    ctx.globalAlpha = alpha
    ctx.strokeStyle = color
    ctx.lineWidth = 3 + g.depth * 5
    ctx.shadowColor = glow
    ctx.shadowBlur = 8 + g.depth * 14
    this.roundRect(cx - rw, cy - rh, rw * 2, rh * 2, 8 + g.depth * 6)
    ctx.stroke()

    // Corner pips
    const pip = 6 + g.depth * 10
    ctx.fillStyle = color
    ctx.fillRect(cx - rw - 1, cy - rh - 1, pip, 3)
    ctx.fillRect(cx + rw - pip + 1, cy - rh - 1, pip, 3)
    ctx.fillRect(cx - rw - 1, cy + rh - 2, pip, 3)
    ctx.fillRect(cx + rw - pip + 1, cy + rh - 2, pip, 3)

    // Dual inner ring
    if (g.isDual && g.innerFace != null && g.stage < 2) {
      const inner = g.innerFace
      const irw = rw * 0.62
      const irh = rh * 0.62
      const stageDim = g.stage === 1 ? 1 : 0.55
      ctx.globalAlpha = alpha * stageDim
      ctx.strokeStyle = faceColor(inner)
      ctx.lineWidth = 2 + g.depth * 3
      ctx.shadowColor = faceGlow(inner)
      ctx.shadowBlur = 6 + g.depth * 10
      this.roundRect(cx - irw, cy - irh, irw * 2, irh * 2, 6)
      ctx.stroke()

      // Stage indicator
      if (g.stage === 0) {
        ctx.globalAlpha = alpha * 0.9
        ctx.fillStyle = faceColor(outer)
        ctx.font = `bold ${Math.max(10, 12 * sc * 4)}px system-ui`
        ctx.textAlign = 'center'
        ctx.fillText('DUAL', cx, cy - rh - 8 * sc * 4)
      }
    }

    // Active requirement glow when near
    if (!g.resolved && g.depth > 0.65) {
      const req = activeRequiredFace(g)
      ctx.globalAlpha = (g.depth - 0.65) * 1.5 * 0.35
      ctx.strokeStyle = faceGlow(req)
      ctx.lineWidth = 6
      ctx.shadowBlur = 20
      this.roundRect(cx - rw * 1.02, cy - rh * 1.02, rw * 2.04, rh * 2.04, 12)
      ctx.stroke()
    }

    ctx.restore()
  }

  private drawCube(
    cx: number,
    cy: number,
    w: number,
    h: number,
    face: Face,
    switchFlash: number,
    pulse: number
  ) {
    const ctx = this.ctx
    const size = Math.min(w, h) * 0.09 * (1 + switchFlash * 0.15)
    const y = cy + h * 0.14

    // Soft platform ring
    ctx.save()
    ctx.globalAlpha = 0.35 + pulse * 0.15
    ctx.strokeStyle = faceColor(face, true)
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.ellipse(cx, y + size * 0.7, size * 1.1, size * 0.28, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()

    // Isometric-ish cube with 3 visible faces
    const s = size
    const tilt = Math.sin(this.cubeSpin) * 0.08
    const faces: { face: Face; pts: [number, number][] }[] = []

    // Front (active)
    faces.push({
      face,
      pts: [
        [cx - s + tilt * 10, y - s],
        [cx + s + tilt * 10, y - s],
        [cx + s - tilt * 10, y + s],
        [cx - s - tilt * 10, y + s],
      ],
    })

    // Top (next face)
    const topFace = ((face + 1) % 3) as Face
    faces.push({
      face: topFace,
      pts: [
        [cx - s * 0.7, y - s * 1.55],
        [cx + s * 0.7, y - s * 1.55],
        [cx + s + tilt * 10, y - s],
        [cx - s + tilt * 10, y - s],
      ],
    })

    // Side (prev face)
    const sideFace = ((face + 2) % 3) as Face
    faces.push({
      face: sideFace,
      pts: [
        [cx + s + tilt * 10, y - s],
        [cx + s * 1.55, y - s * 0.5],
        [cx + s * 1.55, y + s * 0.5],
        [cx + s - tilt * 10, y + s],
      ],
    })

    // Draw dim faces first
    for (const f of faces) {
      const isFront = f.face === face
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(f.pts[0]![0], f.pts[0]![1])
      for (let i = 1; i < f.pts.length; i++) {
        ctx.lineTo(f.pts[i]![0], f.pts[i]![1])
      }
      ctx.closePath()
      ctx.globalAlpha = isFront ? 0.92 : 0.45
      ctx.fillStyle = faceColor(f.face)
      ctx.fill()
      ctx.strokeStyle = faceGlow(f.face)
      ctx.lineWidth = isFront ? 2.5 : 1.2
      ctx.shadowColor = faceColor(f.face)
      ctx.shadowBlur = isFront ? 16 + switchFlash * 20 : 4
      ctx.stroke()
      ctx.restore()
    }

    // Active face label
    ctx.save()
    ctx.globalAlpha = 0.95
    ctx.fillStyle = COLORS.bg
    ctx.font = `bold ${Math.max(11, s * 0.42)}px system-ui`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const labels = ['C', 'M', 'G'] as const
    ctx.fillText(labels[face] ?? 'C', cx + tilt * 4, y)
    ctx.restore()
  }

  private drawAttract(cx: number, cy: number, w: number, h: number, t: number) {
    const face = (Math.floor(t * 0.7) % 3) as Face
    this.drawCube(cx, cy, w, h, face, 0.3 + 0.3 * Math.sin(t * 3), 0.5)
    for (let i = 0; i < 3; i++) {
      const d = ((t * 0.25 + i / 3) % 1) * 0.95
      const fake: GateData = {
        id: `a${i}`,
        face: ((face + i) % 3) as Face,
        innerFace: i === 2 ? FACES.GOLD : null,
        stage: 0,
        depth: d,
        resolved: false,
        wasPerfect: false,
        passed: false,
        isDual: i === 2,
      }
      this.drawGate(fake, cx, cy, w, h)
    }
  }

  private updateParticles(dt: number) {
    for (const p of this.particles) {
      p.life -= dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vx *= 0.96
      p.vy *= 0.96
    }
    this.particles = this.particles.filter((p) => p.life > 0)
  }

  private drawParticles() {
    const ctx = this.ctx
    for (const p of this.particles) {
      ctx.save()
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife)
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  }

  private roundRect(
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) {
    const ctx = this.ctx
    const rr = Math.min(r, w / 2, h / 2)
    ctx.beginPath()
    ctx.moveTo(x + rr, y)
    ctx.arcTo(x + w, y, x + w, y + h, rr)
    ctx.arcTo(x + w, y + h, x, y + h, rr)
    ctx.arcTo(x, y + h, x, y, rr)
    ctx.arcTo(x, y, x + w, y, rr)
    ctx.closePath()
  }
}
