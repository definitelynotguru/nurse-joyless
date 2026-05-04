# Nurse Joyless

<p align="center">
  <img alt="Project status" src="https://img.shields.io/badge/status-hackathon%20prototype-111827?style=flat-square">
  <img alt="Version" src="https://img.shields.io/badge/version-v3.5-6d28d9?style=flat-square">
  <img alt="Runtime" src="https://img.shields.io/badge/runtime-static%20web%20app-0f766e?style=flat-square">
  <img alt="JavaScript" src="https://img.shields.io/badge/javascript-vanilla-f7df1e?style=flat-square&logo=javascript&logoColor=111827">
  <img alt="Tests" src="https://img.shields.io/badge/tests-reasoning%20gauntlet-2563eb?style=flat-square">
</p>

<p align="center">
  <strong>A competitive Pokémon Showdown team clinic for structure analysis, matchup diagnosis, KO risk, replay evidence, and hidden-information reasoning.</strong>
</p>

<p align="center">
  Nurse Joy heals Pokémon. Nurse Joyless heals bad decisions.
</p>

---

## Hackathon pitch

Nurse Joyless is a fan-made, retro-styled battle intelligence dashboard for Pokémon Showdown teams. Paste a team import, run the clinic, and the app turns raw sets into a structured strategic report: what the team is trying to be, where the structure breaks, how matchups look, what the reliable win paths are, which Pokémon could patch the problem, and what hidden information can be inferred from replay evidence.

The project is designed to feel less like a type-chart toy and more like an agentic competitive assistant. It combines deterministic battle mechanics, metagame-inspired heuristics, Smogon-aware suggestions, replay parsing, and hidden-info detective logic into one demoable workflow.

## What makes it interesting

Most team analyzers stop at weaknesses. Nurse Joyless goes deeper by connecting several layers of reasoning:

| Layer | What it does | Why it matters |
|---|---|---|
| Team structure | Detects archetype intent, execution risk, role compression, and overloaded slots | A team can have good Pokémon and still be strategically incoherent |
| Field control | Separates hazard setting, removal, removal denial, chip abuse, pivot abuse, and overload risk | Hazard stack is not just having Stealth Rock |
| Matchup matrix | Scores common structures like Rain, Sun, Hyper Offense, Stall, Hazard Stack, Bulky Balance, Trick Room, and Dragon mirrors | The app explains dependency risk instead of giving blind confidence |
| KO Actuary | Estimates OHKO, 2HKO, and 3HKO lines with hazard chip, Tera toggles, and reverse-KO risk | Decisions become risk-managed instead of vibes-based |
| Replay Observer | Parses replay logs into structured evidence | Battle history becomes usable data |
| Hidden Info Detective | Separates hard eliminations from soft clues for items, abilities, natures, spreads, and damage ranges | The assistant can say what is impossible, what is likely, and what is still ambiguous |
| Team Builder Assistant | Suggests additions by strategic lane and supports quick swaps into the team import | Recommendations become actionable instead of generic glue spam |

## Demo flow for judges

1. Paste a Pokémon Showdown team import.
2. Click the main analysis action and review the identity card.
3. Open Sparring Lab to inspect structural quality, battle reliability, field control, and matchup dependencies.
4. Use KO Actuary to test a real attacking line and the reverse-KO risk.
5. Paste a short replay log into Replay Observer and send evidence into Hidden Info Detective.
6. Use Suggested Additions to compare patch lanes, open the three-dot action menu, and swap a suggested set into the team.
7. Export the final Markdown report for a shareable scouting sheet.

## Final submission demo script

For the judged demo, lead with the deterministic reasoning engine. The recommended path is:

1. Load one curated test team: Dragon Spam, Hazard Stack, or Sun Room.
2. Click **Analyze Patient** and call out the patient status.
3. Run **Advanced Lab** and show Identity, Matchup Matrix, Synergy, and Tera Plan.
4. Run **Validate Team** to show confidence-based validation instead of false hard-invalid spam.
5. Open **Suggest Additions** and show a targeted patch lane plus quick-swap behavior.
6. Use **KO Actuary** for OHKO / 2HKO / 3HKO risk and reverse-KO danger.
7. Paste replay evidence into **Replay Observer**, then use **Hidden Info Detective** for hard eliminations vs soft clues.
8. Copy the **Markdown Export** as the final shareable scouting report.

Kimi and Ollama Cloud are optional BYOK paths. The app is designed to remain fully demoable without external model keys.

## Core features

### Sparring Lab

Sparring Lab is the main reasoning engine. It classifies the team by intent and execution instead of only counting surface traits. It is tuned to avoid common bad reads such as calling every Dondozo team stall, every fast team hyper offense, or every Stealth Rock team hazard stack.

It reports three different score families:

| Score family | Meaning |
|---|---|
| Identity Confidence | How strongly the team resembles an archetype |
| Structural Quality | How well the roles, defensive glue, field control, and win paths fit together |
| Battle Reliability | How likely the structure is to hold up across common matchup families |

### Team Builder Assistant

The suggestion system is organized by strategic lanes instead of a single repetitive ranked list. It can recommend candidates for matchup patching, field control, win condition improvement, defensive glue, speed control, and identity preservation.

Suggestion cards include suggested Showdown sets, reasoning notes, copy actions, and quick swap actions. The three-dot action menu lets you switch a suggested Pokémon with a specific current team member directly inside the import.

### KO Actuary

The KO calculator is a simplified singles damage engine for decision support. It supports hazard chip, offensive and defensive Tera context, item modifiers, weather, screens, OHKO odds, 2HKO odds, 3HKO odds, and reverse-KO tables.

It is built for hackathon-grade tactical reasoning, not as a full replacement for Pokémon Showdown's official simulator.

### Replay Observer

Replay Observer parses battle logs into evidence targets. Recent improvements preserve evidence across switches, keep same-species mirror targets separate by side, carry item-only and ability-only clues into the detective, and preserve multiple detective-ready branches when a target has several relevant observations.

### Hidden Info Detective

Hidden Info Detective turns battle clues into an uncertainty-aware read. It distinguishes hard eliminations from soft clues.

Examples:

| Evidence | Detective interpretation |
|---|---|
| Took hazard chip | Heavy-Duty Boots is ruled out for the current item state |
| Used a status move | Assault Vest is ruled out |
| Revealed item | Non-matching item lines are eliminated |
| Revealed ability | Non-matching ability lines are eliminated |
| Repeated one damaging move | Choice item is suggested, not proven |
| Moved first | Fast nature or Choice Scarf lines are boosted, not guaranteed |
| Damage range fits | Candidate spread/item/nature gains weight |
| Damage range misses | Candidate line is heavily penalized |

The output shows likely items, natures, spreads, abilities, top candidates, hard eliminations, and a confidence-graded verdict.

### Export system

Nurse Joyless can export both Markdown and JSON. The Markdown report is intended to read like a scouting document, including the team import, executive verdict, identity analysis, score explanations, field-control breakdown, type triage, matchup matrix, Pokémon-by-Pokémon notes, suggested additions, and validation notes.

## Architecture

Nurse Joyless is intentionally simple to run: it is a static frontend app with no build system required.

```text
nurse-joyless/
├── index.html
├── src/
│   ├── app.js
│   └── styles.css
├── assets/
├── docs/
├── test-smoke.js
├── test-dom-smoke.js
├── test-v33-reasoner.js
├── test-v35-gauntlet.js
├── test-v35-legacy-and-suggestions.js
└── test-hidden-info-reasoning.js
```

The app is dependency-light by design. Most of the hackathon logic lives in the browser so the demo remains easy to run, inspect, and share.

## Run locally

```bash
npm run serve
```

Then open:

```text
http://localhost:8000
```

A local server is recommended for online enrichment and browser-origin consistency. Opening `index.html` directly can work for offline features, but browser security rules may block some fetch-based flows.

`npm run serve` also provides the same-origin `/api/ollama/chat` proxy required for Ollama Cloud API keys. The pure static fallback (`npm run serve:static`) cannot test or call Ollama Cloud because `https://ollama.com/api/chat` does not allow browser CORS preflight requests with `Authorization`.

On GitHub Pages, deploy `deploy/ollama-cloud-worker.js` as a plain Cloudflare Worker and paste the Worker URL into the app's Ollama Proxy URL field. GitHub Pages cannot run runtime API routes, so a worker or other serverless proxy is required for Ollama Cloud. The Worker file is classic `addEventListener` syntax and does not need any Cloudflare bindings.

## Test suite

Run the complete suite:

```bash
npm test
```

Individual checks:

```bash
npm run check
npm run smoke
npm run dom-smoke
npm run v33-audit
npm run v35-gauntlet
npm run v35-legacy
npm run hidden-info
```

The tests cover syntax, DOM smoke behavior, team reasoning, gauntlet-style adversarial teams, legacy entrypoints, suggestion behavior, replay parsing, and hidden-info detective reasoning.

## Current scope

Nurse Joyless is strongest as a modern singles-focused hackathon prototype. It is built to demonstrate reasoning quality and product vision, not to perfectly replace battle simulators, official legality checkers, or ladder statistics tools.

Known simplifications include:

| Area | Current limitation |
|---|---|
| Damage engine | Simplified compared with the official simulator |
| Legality validation | Conservative confidence model; unknown data should be treated as warnings |
| Replay parsing | Supports common Showdown log patterns, not every possible edge case |
| Ability interactions | Handles selected important inference cases; not a complete mechanics engine |
| Metagame suggestions | Uses local and online-enriched reasoning, but still benefits from human review |

## Project status

V3.5 is the current line. Future improvements should stay on V3.5 unless there is a major architecture rewrite.

High-value next steps:

| Priority | Improvement |
|---|---|
| High | Feed more Replay Observer evidence directly into Hidden Info Detective |
| High | Add richer Choice-lock contradictions and item-loss timeline tracking |
| Medium | Extract Replay Parser, Hidden Info Detective, and damage logic into separate modules |
| Medium | Improve Smogon-backed set selection and replacement-target scoring |
| Medium | Add more replay fixtures for weather, terrain, ability suppression, and item removal |
| Low | Add a hosted demo link and screenshots once deployment is stable |

## Disclaimer

This is a fan-made prototype. It is not affiliated with Nintendo, Game Freak, Creatures, The Pokémon Company, Pokémon Showdown, Foul Play, Nous Research, Kimi, or Smogon. Pokémon names and mechanics belong to their respective owners. The project is inspired by competitive battle-state inference concepts, but no Foul Play code is copied.
