# Nurse Joyless

![JavaScript](https://img.shields.io/badge/language-JavaScript-yellow)
![HTML5](https://img.shields.io/badge/language-HTML5-orange)
![Status](https://img.shields.io/badge/status-MVP-green)

**Nurse Joyless** is a fan-made, retro pixel-art Pokémon Showdown team clinic. Paste a Showdown import and it diagnoses team structure, calculates KO odds, parses replay evidence, detects hidden-info clues, suggests additions, validates sets, and exports a shareable report.

> Nurse Joy heals Pokémon. Nurse Joyless heals bad decisions.

## What is new in this build

The project now treats **Sparring Lab** as the main analytical engine rather than a simple archetype card grid.

### Sparring Lab v2

Sparring Lab now builds a structured report with:

- **Team Identity detection**: Dragon Spam, Sun Room, Trick Room, Hyper Offense, Balance, Stall, Hazard Stack, Weather teams, and more.
- **Evidence-based archetype classification**: scoring uses type stacking, speed tiers, Trick Room setters, weather setters, offensive items, recovery, hazards, removal, pivots, and wallbreakers.
- **Structural diagnosis**: identifies repeated weaknesses, missing roles, shallow defensive cores, overstacked archetypes, and dependency risks.
- **Matchup Matrix**: evaluates performance into Rain, Sun, Stall, Hazard Stack, Hyper Offense, Bulky Balance, Trick Room mirrors, and Dragon Spam mirrors.
- **Synergy scoring**: rates type synergy, role balance, offensive coverage, defensive backbone, hazard plan, speed control, and win conditions.
- **Precision prescriptions**: suggests Pokémon that patch actual structural gaps, not generic meta picks.

### Team Builder Assistant

The assistant ranks additions by:

- gap coverage
- archetype fit
- matchup improvement
- role compression
- synergy with the current team

Suggested additions include exportable Showdown sets where available.

### Move Validation

Validation checks:

- EV total and per-stat caps
- unknown species, moves, abilities, and Tera types
- Assault Vest + status-move conflicts
- move count limits
- learnset confidence when full Dex learnset data is available

Learnset validation is intentionally conservative: if full learnset data is unavailable, it warns instead of pretending certainty.

### KO Calculator Upgrades

The KO calculator now includes:

- OHKO odds
- 2HKO probability
- 3HKO probability
- hazard chip
- defensive Tera toggle
- reverse KO risk table

The damage engine remains a simplified modern singles calculator. It is not a perfect Pokémon Showdown simulator.

### Export Formats

Reports can be exported as:

- Markdown summary
- JSON report

The JSON output is useful for debugging, building demos, or wiring the analysis into another agent/tool.

## Running locally

```bash
cd nurse-joyless
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

No build step is required.

## Testing

```bash
npm test
```

Equivalent individual checks:

```bash
npm run check
npm run smoke
npm run dom-smoke
```

The test suite checks:

- JS syntax
- Dex-backed species and move lookup
- damage calculation using Dex-only species/moves
- Dragon Spam detection
- Sun Room / Trick Room detection
- Replay Observer evidence extraction
- KO panel 3HKO rendering
- Markdown report generation
- team validation processing

## Data and scope

The app uses `@pkmn/dex` from the browser when available, with local fallback data for offline tests and demos. It is best described as:

> **Modern singles-focused MVP with full Dex lookup and simplified battle math.**

It should not be marketed as a perfect all-generation simulator, legality validator, or live battle bot.

## Fan-project disclaimer

Fan-made prototype. Not affiliated with Nintendo, Game Freak, Creatures, The Pokémon Company, Pokémon Showdown, Foul Play, Nous Research, or Kimi. Inspired by battle-state inference concepts; no Foul Play code copied.

## V3.2 Local Run Note

Opening `index.html` directly still works for the offline deterministic demo. For online PokeAPI enrichment in the Team Builder Assistant, run a local server:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`. The app does not fetch remote data on startup; online suggestions are requested only when you press **Suggest Additions** / **Use Online Pokédex**.
