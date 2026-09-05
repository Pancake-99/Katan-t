# Katan'T — Project Brief

> Context handoff for a second Claude session managing the project's kanban/scrum board.
> Written 2026-08-31. Reflects the repo at that date.

## What we're building

**Katan'T** — a from-scratch online Catan clone, built to be played with friends.

The motivation is dissatisfaction with the existing Catan ports and alternatives online. The reference point is **colonist.io** (solid gameplay, weak presentation); the goal is to match its function while beating it on **UI polish, graphics, and feel**. Visual quality is a first-class requirement, not a finishing touch.

Development leans heavily on AI, with the project owner (solo dev) driving direction and reviewing each increment.

## Working style — important for board design

The owner works **one reviewable slice at a time** and wants to approve each layer before the next begins. Early in the project a large speculative scaffold was rejected and deleted.

For the board, this means:
- Prefer **small, vertically-sliced, demoable cards** over large horizontal epics.
- Cards should be independently reviewable — "working lobby screen" beats "all UI components".
- Don't pre-plan the whole backlog in detail. Depth is warranted for the next 1–2 slices; further out, titles are enough.
- Expect scope to be re-decided between slices. The board should be cheap to re-order.

## Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Vite + React 19, **plain JavaScript** (not TypeScript) | |
| Hosting (frontend) | Vercel | Temporary; owner not committed to it |
| Realtime | **Cloudflare Workers + Durable Objects** | One DO per lobby/match, WebSocket Hibernation API |
| Database | **Cloudflare D1** (SQLite) | |
| File storage | **Cloudflare R2** | Planned, for avatar uploads |
| Auth | Google + Discord OAuth | Not built yet |
| Lint | oxlint | Came with the Vite template |

**Key architectural constraint:** Vercel's serverless functions cannot hold persistent WebSocket connections. That is *why* the backend is split across two providers — the React app is on Vercel, all realtime lives on Cloudflare. Cards that assume a single host will be wrong.

Everything is chosen to fit **free tiers**. Relevant gotcha: Durable Objects on the Workers free plan must be SQLite-backed (`new_sqlite_classes` in migrations).

## Fonts (chosen, wired up)

| Variable | Font | Role |
|---|---|---|
| `--font-display` | Press Start 2P | logo, headings, UI chrome |
| `--font-ui` | Roboto | buttons, labels, numbers |
| `--font-body` | Open Sans | rules text, chat, tooltips |
| `--font-print` | Jacquard 12 | cards/tokens — the "printed component" look |

Loaded from the Google Fonts CDN. Possible later task: self-host via `@fontsource` to kill the external request and font flash.

---

## Done

### 1. Project scaffold
Vite + React 19, plain JS. Scripts: `dev`, `build`, `preview`, `lint`, `lint:fix`, `dev:server`, `deploy:server`.

### 2. Typography
All four fonts loading, exposed as the CSS variables above (`src/index.css`).

### 3. Realtime lobby foundation — working and tested
- `server/src/index.js` — Worker router; maps a lobby code to its Durable Object.
- `server/src/LobbyRoom.js` — the room: join, roster broadcast, chat, disconnect handling. Uses the Hibernation API so idle lobbies cost nothing.
- `server/src/protocol.js` — wire format, re-exported by `src/net/protocol.js` so client and server can't drift.
- `src/net/useLobby.js` — React hook; currently a pure relay, holds no game state.
- Vite dev proxy sends `/api` (including the websocket upgrade) to the Worker on :8787, so dev and prod share one origin.

Verified with two live clients against `wrangler dev`: roster grows and shrinks correctly, chat fans out to all participants.

### 4. Database schema — written, applied locally, constraint-tested
`server/migrations/0001_init.sql`. Normalised to 3NF. Six tables, three views.

| Table | Key |
|---|---|
| `users` | `id` (UUID surrogate) |
| `user_identities` | `(provider, provider_user_id)` |
| `friendships` | `(user_a_id, user_b_id)`, canonical order |
| `friend_requests` | `(sender_id, recipient_id)`, directional |
| `games` | `id` (UUID) |
| `game_players` | `(game_id, seat)` |

Views: `user_profiles`, `friendships_bidirectional`, `user_game_stats`.

Design invariants worth preserving:
- **Surrogate UUID PKs, not email.** Email is nullable + UNIQUE — Discord's email scope is optional, so an account may have none.
- **OAuth logins are rows, not columns**, so one user can link both Google and Discord.
- **Friendships stored once per pair**, canonical order enforced by CHECK.
- **Nothing derivable is stored** — no `games.winner_id` (winner is `placement = 1`), no cached win counts (that's the `user_game_stats` view).
- **`game_players` is seat-keyed and snapshots `display_name`**, so deleting an account nulls `user_id` without destroying other players' match history.
- **Avatars are pointers, never bytes**: `avatar_key` (R2, custom upload) wins over `avatar_provider_url` (Google/Discord picture).

Tested against a local D1: eight invalid-write cases correctly rejected, and account deletion verified to cascade identities/friendships while preserving game history.

---

## Not done

**There is no UI yet.** `src/App.jsx` is a throwaway font specimen. No routing, no screens, no components. `useLobby` is written but not used anywhere.

**There is no game logic yet.** No board representation, hex math, rules engine, or turn state. (An early draft existed and was deliberately deleted as premature.)

Also outstanding:
- **Auth** — OAuth flows for Google and Discord, plus a sessions table (separate migration, no rework needed to `0001`). Needs the owner to register OAuth apps and supply credentials.
- **Remote D1** — `database_id` in `server/wrangler.jsonc` is a placeholder. Needs `wrangler d1 create katan-t`. Local dev is unaffected.
- **R2 bucket + avatar upload path** — schema supports it, nothing built.
- **Persistence wiring** — the Durable Object and D1 do not talk to each other yet; lobbies are entirely in-memory.
- **Deployment** — nothing deployed. Vercel project not set up, Worker never deployed.
- **Testing / CI** — none. No test runner chosen.
- **Game history recording** — schema exists, nothing writes to it.

## Natural epics

Offered as a starting point only — the owner will re-prioritise.

1. **Auth & identity** — OAuth (Google, Discord), sessions, account linking, profile editing
2. **Avatars & storage** — R2 bucket, upload, moderation/size limits
3. **Lobby UX** — create/join by code, roster screen, chat UI, ready-up, start game
4. **Game engine** — board generation, hex math, placement rules, turn cycle, trading, dev cards, victory conditions
5. **Game UI & graphics** — board rendering, pieces, animations, the visual-quality goal
6. **Social** — friends list, requests, invites, match history, stats
7. **Infrastructure** — remote D1, deployment, CI, monitoring
8. **Polish** — sound, mobile/responsive, accessibility, spectator mode

Rough dependency order: auth and lobby UX unblock most things; the game engine is the largest and most independent chunk; graphics polish trails the engine.

## Repo notes

- Working dir: `c:\Users\aleja\Katan-t`, branch `main`.
- Only one commit so far (`Initial commit`); all the work above is **uncommitted**.
- Local D1 is migrated and empty. Apply migrations with:
  `npx wrangler d1 migrations apply katan-t --local --config server/wrangler.jsonc`
- Windows gotcha: a backgrounded `wrangler dev` isn't killed by a shell `kill`; its `workerd` children keep file locks on the local D1. Kill the process tree via PowerShell before deleting `.wrangler` state.
