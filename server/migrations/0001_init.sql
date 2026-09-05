-- Katan'T initial schema (Cloudflare D1 / SQLite), normalised to 3NF.
--
-- Conventions used throughout:
--   * Primary keys are UUID v4 stored as TEXT. SQLite has no UUID type.
--   * Timestamps are INTEGER Unix seconds (UTC). Compact, sortable, no
--     timezone ambiguity, and comparable without parsing.
--   * SQLite has no ENUM, so closed value sets are CHECK constraints.
--   * Nothing derivable is stored. Win counts, friend counts and the like are
--     computed by the views at the bottom, so they can never fall out of sync.

-- ---------------------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------------------

-- One row per human. `id` is a surrogate key on purpose: display_name and
-- email can both change over a user's life, and Discord may never give us an
-- email at all, so neither can be the identity the rest of the schema hangs off.
CREATE TABLE users (
  id             TEXT PRIMARY KEY,

  -- Nullable: a Discord-only signup can legitimately have no email.
  -- Stored lowercased by the application so that UNIQUE behaves the way people
  -- expect an email comparison to behave.
  email          TEXT UNIQUE,
  email_verified INTEGER NOT NULL DEFAULT 0 CHECK (email_verified IN (0, 1)),

  -- What other players see. Freely changeable, hence not a key.
  display_name   TEXT NOT NULL CHECK (length(display_name) BETWEEN 2 AND 24),

  -- Avatar is a pointer, never bytes. `avatar_key` is an R2 object key for a
  -- custom upload; `avatar_provider_url` is the Google/Discord picture we get
  -- for free at signup. A custom upload wins -- see the user_profiles view.
  avatar_key          TEXT,
  avatar_provider_url TEXT,

  created_at     INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at     INTEGER NOT NULL DEFAULT (unixepoch()),
  last_seen_at   INTEGER
);

-- ---------------------------------------------------------------------------
-- OAuth identities
-- ---------------------------------------------------------------------------

-- One row per (provider, account). Modelled as a table rather than
-- google_id / discord_id columns on users so that adding a third provider is
-- data, not a migration, and so one user can link several logins.
CREATE TABLE user_identities (
  user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider         TEXT NOT NULL CHECK (provider IN ('google', 'discord')),

  -- The provider's own immutable ID for the account (the "sub" claim for
  -- Google). Never the email: those get changed and reassigned.
  provider_user_id TEXT NOT NULL,

  -- Useful for display ("linked as @alejandro") but never authoritative.
  provider_username TEXT,
  provider_email    TEXT,

  linked_at        INTEGER NOT NULL DEFAULT (unixepoch()),

  PRIMARY KEY (provider, provider_user_id)
);

-- A user's identity list, and the guard against linking one provider twice.
CREATE UNIQUE INDEX idx_identities_user_provider ON user_identities(user_id, provider);

-- ---------------------------------------------------------------------------
-- Friends
-- ---------------------------------------------------------------------------

-- Friendship is symmetric, so storing it twice (A->B and B->A) would be
-- redundant and would let the two rows disagree. Each pair is stored once in a
-- canonical order enforced by the CHECK: the smaller ID always goes in
-- user_a_id. Query it through the friendships_bidirectional view below.
CREATE TABLE friendships (
  user_a_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),

  PRIMARY KEY (user_a_id, user_b_id),
  CHECK (user_a_id < user_b_id)
);

CREATE INDEX idx_friendships_b ON friendships(user_b_id);

-- Pending invitations. Direction matters here (who asked whom), so unlike
-- friendships these are NOT canonicalised. Resolved requests are kept rather
-- than deleted, so a rejection can be used to suppress repeat spam.
CREATE TABLE friend_requests (
  sender_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at   INTEGER NOT NULL DEFAULT (unixepoch()),
  responded_at INTEGER,

  PRIMARY KEY (sender_id, recipient_id),
  CHECK (sender_id <> recipient_id)
);

CREATE INDEX idx_friend_requests_inbox ON friend_requests(recipient_id, status);

-- ---------------------------------------------------------------------------
-- Games
-- ---------------------------------------------------------------------------

-- One row per match. Note there is no winner_id column: the winner is the
-- player with placement = 1 in game_players, and repeating it here would be a
-- second source of truth for the same fact.
CREATE TABLE games (
  id         TEXT PRIMARY KEY,

  -- The lobby code players joined with, and the name the Durable Object is
  -- addressed by. Reusable once a game ends, so not unique over all time.
  code       TEXT NOT NULL,

  status     TEXT NOT NULL DEFAULT 'lobby'
               CHECK (status IN ('lobby', 'active', 'finished', 'abandoned')),

  -- Seed for the board RNG: enough to reproduce the exact map, so the layout
  -- never has to be stored tile by tile.
  board_seed INTEGER NOT NULL,

  turn_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  started_at INTEGER,
  ended_at   INTEGER
);

CREATE INDEX idx_games_status ON games(status, created_at DESC);

-- Partial index: only in-flight games are ever looked up by code.
CREATE INDEX idx_games_active_code ON games(code) WHERE status IN ('lobby', 'active');

-- One row per seat at a table. Keyed by (game_id, seat) rather than
-- (game_id, user_id) so that user_id can go NULL when an account is deleted
-- without destroying everyone else's match history.
CREATE TABLE game_players (
  game_id        TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  seat           INTEGER NOT NULL CHECK (seat BETWEEN 0 AND 5),

  user_id        TEXT REFERENCES users(id) ON DELETE SET NULL,

  -- The name as it stood at the time of the match. Without this, a later
  -- rename would silently rewrite history and a deleted account would leave a
  -- blank row. It depends on the game, not on the user, so it belongs here.
  display_name   TEXT NOT NULL,

  color          TEXT NOT NULL,

  -- Final standing, 1 = winner. NULL until the game finishes.
  placement      INTEGER CHECK (placement BETWEEN 1 AND 6),
  victory_points INTEGER NOT NULL DEFAULT 0,

  PRIMARY KEY (game_id, seat)
);

-- A user takes at most one seat per game, and one placement is claimed at most
-- once per game. SQLite lets NULLs repeat under a UNIQUE index, which is
-- exactly what these two need (deleted users, unfinished games).
CREATE UNIQUE INDEX idx_game_players_user ON game_players(game_id, user_id);
CREATE UNIQUE INDEX idx_game_players_placement ON game_players(game_id, placement);

-- Drives the "your recent games" list.
CREATE INDEX idx_game_players_history ON game_players(user_id, game_id);

-- ---------------------------------------------------------------------------
-- Views: everything derivable, so no table ever caches a stale count
-- ---------------------------------------------------------------------------

-- Resolves the avatar precedence rule once, instead of in every query.
CREATE VIEW user_profiles AS
SELECT
  u.id,
  u.display_name,
  u.email,
  COALESCE(u.avatar_key, u.avatar_provider_url) AS avatar,
  u.avatar_key IS NOT NULL                      AS avatar_is_custom,
  u.created_at,
  u.last_seen_at
FROM users u;

-- Friendships read in both directions, so a user's friend list is a plain
-- WHERE user_id = ? with no OR / UNION at the call site.
CREATE VIEW friendships_bidirectional AS
SELECT user_a_id AS user_id, user_b_id AS friend_id, created_at FROM friendships
UNION ALL
SELECT user_b_id AS user_id, user_a_id AS friend_id, created_at FROM friendships;

-- Win/loss record, computed rather than counted into a column on users.
CREATE VIEW user_game_stats AS
SELECT
  gp.user_id,
  COUNT(*)                                          AS games_played,
  SUM(CASE WHEN gp.placement = 1 THEN 1 ELSE 0 END) AS games_won,
  AVG(gp.victory_points)                            AS avg_victory_points,
  MAX(g.ended_at)                                   AS last_played_at
FROM game_players gp
JOIN games g ON g.id = gp.game_id
WHERE gp.user_id IS NOT NULL
  AND g.status = 'finished'
GROUP BY gp.user_id;
