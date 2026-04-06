# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the Games

These are static HTML/JS games — no build step or dependencies. Open directly in a browser:

```bash
open tictactoe.html
open shooter/index.html
```

## Git Workflow

After every meaningful change, commit with a descriptive message and push to `origin main` (GitHub: `29jparker/ClaudeCodeTest`). Do this continuously throughout work — not just at the end — so progress is never lost and any change can be reverted. Each commit should be atomic and its message should clearly describe what changed and why.

## Project Structure

Two standalone browser games, each fully self-contained:

### `tictactoe.html`
Single-file game. All HTML, CSS, and JS are inline. State is held in plain variables (`board`, `current`, `over`, `score`). No frameworks.

### `shooter/`
Top-down wave-based shooter on an 800×600 canvas. Split into two files:

- **`art.js`** — Pure drawing module. Exports a single `Art` object with functions for every visual element (arena, player, enemies, bullets, particles, HUD, menus). All rendering is procedural pixel-art using `ctx.fillRect`. Loaded first.
- **`game.js`** — Game logic, entity classes (`Player`, `Bullet`, `Enemy`, `Particle`), state machine (`MENU → PLAYING → TRANSITION → GAME_OVER`), spawn system, collision detection, and the `requestAnimationFrame` loop. Calls `Art.*` for all drawing.

**Enemy types** (defined in `ENEMY_STATS`): `walker`, `runner`, `tank` — each with distinct speed, HP, radius, and point value.

**Level progression**: `getLevelConfig(lvl)` defines waves and enemy counts per level. Levels 4+ scale counts by a `1.3^(lvl-3)` multiplier.
