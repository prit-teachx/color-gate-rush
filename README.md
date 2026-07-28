# Color Gate Rush

Neon **3-color cube gate** reflex game. Offline, no backend, no accounts.

You are a cube with three faces ? **Cyan**, **Magenta**, **Gold**. Gates rush toward you down a tunnel. Cycle your face to match before impact. Chain perfects for multipliers. Dual rings force quick double-cycles late-game.

## Stack

- **Next.js** (App Router) + React
- Pure TypeScript game engine
- Canvas 2D neon tunnel renderer
- Web Audio procedural SFX (no asset files)
- Local high score in `localStorage`

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Controls

| Action | Input |
|--------|--------|
| Cycle color forward | Click / tap / Space / ? / W / ? / D |
| Cycle color back | ? / A |
| Pause | P / Esc |
| Start / Restart | Buttons or Space on menu |

## Gameplay

- Three faces: **Cyan ? Magenta ? Gold**
- Match the gate color at the hit plane or die
- **Perfect** = clutch cycle in the thin window ? combo + score bonus
- **Dual gates** (later): outer then inner ring ? cycle if colors differ
- Speed and spawn density ramp up
- Score = survival + gates cleared + combo multipliers

## Architecture

```
src/
  app/           # Next.js shell
  components/    # Canvas, HUD, app shell
  game/          # constants, spawn, engine, renderer
  audio/         # procedural Web Audio
  storage/       # localStorage high score + mute
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm start` | Serve production build |

## Notes

- Clearing site data resets the local high score
- First sound unlocks after a user gesture
- No accounts, leaderboard, or network calls
