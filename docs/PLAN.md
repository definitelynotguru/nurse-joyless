# Nurse Joyless Project Plan

## North Star

Nurse Joyless should feel like an expert competitive team doctor, not a static weakness calculator. The product should answer four questions:

1. What is this team trying to be?
2. What structural flaws stop that plan from working?
3. How does the team perform into common opposing archetypes?
4. What exact changes would improve it while preserving the user's favorites?

## Current architecture

The project remains a dependency-free static web app:

```text
index.html
src/styles.css
src/app.js
assets/*.png
examples/*.txt
```

The deterministic engine performs the mechanical work. The agent-style layer explains the facts, rather than inventing battle math.

## Advanced Reasoning Model

### 1. Team Profile

The profile layer extracts signals:

- type counts
- fast and slow members
- priority and Choice Scarf
- setup sweepers
- recovery
- hazards and removal
- Magic Bounce
- pivots
- status / disruption
- Trick Room setters
- weather setters and abusers
- wallbreakers
- physical / special / mixed attacker distribution
- Heavy-Duty Boots and Leftovers usage
- win conditions
- offensive coverage types

### 2. Identity Detection

Supported identities include:

- Dragon Spam Offense
- Sun Room
- Trick Room Offense
- Sun Offense
- Rain Offense
- Hyper Offense
- Bulky Offense
- Balance
- Stall
- Hazard Stack

Important rule: identities must be detected from multiple signals. For example, Stall cannot score highly just because a team has Stealth Rock and one recovery move. Stall requires many defensive, recovery, status, and attrition signals while penalizing setup-heavy and Choice/Life Orb-heavy teams.

### 3. Synergy Checker

Synergy scores:

- Type synergy
- Role balance
- Offensive coverage
- Defensive backbone
- Hazard plan
- Speed control
- Win conditions

The checker should explain why each score exists and avoid vague labels.

### 4. Matchup Matrix

Matchups are evaluated against:

- Rain
- Sun
- Stall
- Hazard Stack
- Hyper Offense
- Bulky Balance
- Trick Room mirror
- Dragon Spam mirror

Scores should be contextual. Example: Trick Room teams should not be punished as if they have no speed control.

### 5. Team Builder Assistant

Suggestions should be based on concrete gaps:

- Fairy resist
- Ice resist
- Water resist
- Ground immunity
- hazard removal
- special wall
- physical wall
- speed control
- wallbreaker
- pivot
- status absorber

Suggestions should include reasons and sample sets.

### 6. Move Validation

Validation checks should be conservative:

- hard-invalid rules should be flagged as issues
- uncertain learnset data should be flagged as warnings
- full learnset confidence should use Dex data when available

### 7. Reports

Exports should include:

- identity
- synergy scores
- structural findings
- matchup matrix
- suggested additions
- validation summary

## Remaining future upgrades

High-value next steps:

1. Official damage-calculator parity or a proper calc backend.
2. Format selector: Gen 9 OU, NatDex, Ubers, etc.
3. Stronger learnset integration with cached full learnsets.
4. Replay-to-KO evidence automation: click a replay turn and prefill Hidden Info Detective.
5. Tera offense toggle that changes attacker STAB/type behavior more explicitly.
6. Better item-specific damage handling: Plates, Choice modifiers, boosting abilities, terrain, screens, burn, weather, and critical hits.
7. Team replacement mode: “replace weakest slot” with before/after score deltas.

## Demo flow

Recommended demo:

1. Load Dragon Spam team.
2. Run Sparring Lab.
3. Show identity: Dragon Spam Offense, not Stall.
4. Show matchup matrix and Synergy Checker.
5. Suggest a Pokémon to patch Fairy/Ice pressure.
6. Run KO calculator with 2HKO/3HKO and Tera toggle.
7. Paste replay log and show Boots/Assault Vest evidence.
8. Export Markdown/JSON report.

