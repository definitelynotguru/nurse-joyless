# Architecture

Nurse Joyless is a competitive Pokémon Showdown team clinic: structure analysis, matchup diagnosis, KO risk, replay evidence, and hidden-information reasoning. It answers four questions about a pasted team:

1. What is this team trying to be?
2. What structural flaws stop that plan from working?
3. How does the team perform into common opposing archetypes?
4. What exact changes would improve it while preserving the user's favorites?

## Repository layout

```text
web/                  Vite + React + strict TypeScript app (v4)
  src/engine/         DOM-free reasoning engine (pure functions, no document/window/localStorage)
  src/                React UI (components consume engine results)
  tests/              vitest specs (*.spec.ts)
  public/             static assets
index.html            legacy entry point — still serves the v3 app
src/*.js              legacy engine monolith + IIFE patch files (frozen)
test-*.js             legacy node test harnesses (vm sandbox + fake DOM)
server.js             legacy static file server
examples/*.txt        sample team imports
assets/*.png          art assets
deploy/               optional BYOK cloud worker
.github/workflows/    CI (legacy suite + web suite) and GitHub Pages deploy
```

## The v4 web app

`web/` is a self-contained Vite project (`web/package.json`, `web/tsconfig*.json`, `web/vite.config.ts`). The React UI owns all rendering and DOM interaction; every legacy `renderX`/`populateX`/`bindX` function is replaced by components rather than ported.

The engine under `web/src/engine/` is deliberately DOM-free so it can run in tests, workers, or a future backend without a browser. Functions that read UI state in the legacy app (e.g. checkbox-driven KO options) now take explicit option objects.

### Engine module map

| Module | Responsibility |
|---|---|
| `types.ts` | Shared contracts (`TeamMon`, `AnalysisResult`, `TeamProfile`, `TriageRow`, `MatchupRow`, `Suggestion`, `ReasoningReport`, …), type chart, natures, and small pure helpers (`mult`, `clamp`, `toId`, `pct`, `evidence`). |
| `dex.ts` | Species/move resolution backed by `@pkmn/dex` (full Gen 9) with curated local tables as fallback/override: `getSpecies`, `getMove`, `stats`, `canLearn`, `warmLearnset`, `grounded`, `hazardPct`, `moveBlockingAbility`, speed-nature helpers. |
| `team.ts` | Showdown import parsing (`parseTeam`), per-mon serialization (`monBlock`, `teamToText`). |
| `analysis.ts` | Team profile extraction and structural/synergy/matchup analysis (Sparring Lab). |
| `identity.ts` | Archetype detection (Dragon Spam, Sun Room, Trick Room, Rain, Hyper Offense, Bulky Offense, Balance, Stall, Hazard Stack…). Identity is gated on multiple signals so a single Stealth Rock user does not make a team Stall. |
| `ko.ts` | KO Actuary: OHKO/2HKO/3HKO estimates with hazard chip, Tera, and reverse-KO risk. |
| `replay.ts` | Replay Observer: parses Showdown replay logs into structured per-target evidence. |
| `detective.ts` | Hidden Info Detective: hard eliminations vs soft clues for items, abilities, natures, spreads, and damage ranges. |
| `suggest.ts` | Team Builder Assistant: gap-driven suggestions by strategic lane (matchup patch, field control, win condition, defensive glue, speed control, identity fit) with sample sets and swap support. |
| `validate.ts` | Conservative validation: confirmed illegal sets flagged invalid; uncertain learnset data surfaced as warnings, never false positives. |
| `tera.ts` | Tera planning: offensive/defensive Tera reads per team member. |
| `report.ts` | Reasoning report assembly and Markdown/JSON export. |
| `data-*.ts` | Curated local tables: species overrides, move metadata, sample/regression sets, type data. `data-extra.ts` already folds in every data mutation the legacy patch files made (`P.X`, `MOVES.X`, `FALLBACK_ABILITIES.X`, `REPLAY_MOVE_HINTS.X`) — never re-extract them. |
| `index.ts` | Public engine surface (`export *` barrel). |

## The strangler boundary

The v3 app still ships in the same repository while v4 reaches parity:

- `src/app.js` is a ~2400-line monolith of loose globals (`const P = {...}`, `function analyze(...)`).
- `src/*.js` patch files are IIFEs loaded via `<script>` tags in `index.html` order. Each patch captures `const legacyX = root.X` and reassigns `root.X = function(...)`, so the effective implementation is the **last** assignment in script order; earlier versions are reachable only through captured locals.
- When porting a patched function, compose the patches in script order — the final behavior is the outermost wrapper.
- **Do not edit legacy files.** Ports live in `web/src/engine/`; the legacy tree stays untouched until it is deleted.

## Reasoning model

The engine separates three score families rather than emitting one blended grade:

- **Identity Confidence** — how strongly the team resembles an archetype.
- **Structural Quality** — how coherent the build is (role compression, overloaded slots, redundant coverage).
- **Battle Reliability** — how repeatable the win path looks across matchups.

Field control is scored as separate subscores — hazard setting, hazard removal, removal denial (Magic Bounce, Good as Gold, Ghost spinblock, Taunt), chip abuse, pivot abuse, and setter-overload risk — because "has Stealth Rock" is not a hazard plan.

Matchups are evaluated against common structures (Rain, Sun, Stall, Hazard Stack, Hyper Offense, Bulky Balance, Trick Room, Dragon mirrors) and are contextual: Trick Room teams are not punished for lacking conventional speed control.

Validation stays conservative: confirmed violations are issues, uncertain learnset data is a warning, and full learnset confidence comes from Dex data when available.

## Testing

Two suites, run independently:

- **Legacy suite** — `npm test` at the repo root. Pure Node `vm`-sandbox harnesses (`test-*.js`) that concat the legacy sources with a fake DOM and assert on globals. It covers syntax checks, smoke tests, identity/weather/hidden-info reasoning, replay parsing, validation, and a 320-team adversarial gauntlet that penalizes fake archetypes, score inflation, and missing suggestions. The gauntlet is a regression audit, not proof of ladder win rate.
- **Web suite** — `cd web && npx vitest run` (or `npm run test:web` from the root). Vitest specs import engine functions directly; there is no fake DOM because the engine has none.

## CI and Pages

`.github/workflows/ci.yml` runs two jobs on pushes and PRs to `main`:

- `test` — Node 24, `npm test` (the legacy suite above).
- `web` — Node 24 with npm caching (`web/package-lock.json`), then `npm ci`, `tsc -b`, `vitest run`, and `npm run build` inside `web/`.

`.github/workflows/pages.yml` deploys on pushes to `main`: it installs and builds `web/`, uploads `web/dist` as the Pages artifact, and deploys it. The build passes `--base=./` so asset URLs stay relative under the project-pages subpath.

Useful root scripts: `npm run dev:web` (Vite dev server), `npm run build:web`, `npm run test:web`, `npm run typecheck:web`.
