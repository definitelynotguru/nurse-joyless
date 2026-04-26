# Nurse Joyless

![JavaScript](https://img.shields.io/badge/language-JavaScript-yellow)
![HTML5](https://img.shields.io/badge/language-HTML5-orange)
![Status](https://img.shields.io/badge/status-MVP-green)

**Nurse Joyless** is a fan-made, retro pixel-art Pokémon Showdown team clinic. Paste a Showdown import and it diagnoses team structure, calculates KO odds, parses replay evidence, detects hidden-info clues, suggests additions, validates sets, and exports a shareable report.

> Nurse Joy heals Pokémon. Nurse Joyless heals bad decisions.

## 🚀 Features

### 🧪 Sparring Lab v2
The core analytical engine that transforms imports into structured reports:
- **Team Identity Detection**: Automatically identifies archetypes like Dragon Spam, Sun Room, Trick Room, Hyper Offense, Balance, Stall, Hazard Stack, and more.
- **Evidence-Based Classification**: Uses a scoring system based on type stacking, speed tiers, weather setters, and offensive items.
- **Structural Diagnosis**: Detects repeated weaknesses, missing roles, and dependency risks.
- **Matchup Matrix**: Evaluates performance against common meta-archetypes.
- **Synergy Scoring**: Rates type synergy, role balance, and win conditions.
- **Precision Prescriptions**: Suggests Pokémon to patch structural gaps based on data, not just meta trends.

### 🛠️ Team Builder Assistant
Ranks suggested additions based on:
- Gap coverage & archetype fit.
- Matchup improvement & role compression.
- Synergy with existing team members.
- *Includes exportable Showdown sets.*

### ✅ Move & Set Validation
Ensures your team is viable by checking:
- EV totals and per-stat caps.
- Species, moves, abilities, and Tera types.
- Item conflicts (e.g., Assault Vest + status moves).
- Learnset confidence using full Dex data.

### 💥 KO Calculator
A simplified modern singles damage engine featuring:
- OHKO, 2HKO, and 3HKO probabilities.
- Hazard chip and defensive Tera toggles.
- Reverse KO risk tables.

## 📦 Export Formats
Reports can be exported as:
- **Markdown summary**: For quick sharing and documentation.
- **JSON report**: For debugging or integration into other tools/agents.

## 💻 Getting Started

### Running Locally
Since this is a frontend-driven application, no build step is required.

```bash
# Start a simple python server
python3 -m http.server 8000
```
Then open: `http://localhost:8000`

*Note: For online Pokédex enrichment in the Team Builder Assistant, running a local server is required.*

### Testing
```bash
npm test
```
Individual checks:
- `npm run check`: JS syntax & basic lookups.
- `npm run smoke`: Core engine smoke tests.
- `npm run dom-smoke`: UI rendering checks.

## 📊 Data & Scope
The app leverages `@pkmn/dex` for comprehensive data. 

**Key Disclaimer:** This is a modern singles-focused MVP. It uses simplified battle math and is not intended to be a perfect all-generation simulator or a legality validator.

## ⚖️ Fan-Project Disclaimer
Fan-made prototype. Not affiliated with Nintendo, Game Freak, Creatures, The Pokémon Company, Pokémon Showdown, Foul Play, Nous Research, or Kimi. Inspired by battle-state inference concepts; no Foul Play code copied.
