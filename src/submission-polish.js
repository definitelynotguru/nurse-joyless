(function(){
  const root = typeof window !== 'undefined' ? window : globalThis;
  const $ = id => (typeof document !== 'undefined' ? document.getElementById(id) : null);

  const clean = value => String(value || '')
    .replace(/\s+\n/g, '\n')
    .replace(/\n\s+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

  const SOFT_VALIDATION_PATTERNS = [
    /learnset data not loaded/i,
    /learnset check unavailable/i,
    /move exists but legality is unconfirmed/i,
    /manual verification recommended/i,
    /ability data unavailable/i,
    /unknown or unsupported form/i
  ];

  const HARD_VALIDATION_PATTERNS = [
    /unknown move:/i,
    /ev total/i,
    /ev stat/i,
    /assault vest/i,
    /invalid ability/i,
    /invalid tera type/i
  ];

  function isUnknownTera(value) {
    return /^(unknown|none|n\/a|na|\?|\?\?\?)$/i.test(String(value || '').trim());
  }

  function isSoftValidationIssue(issue, mon) {
    const text = String(issue || '');
    if (/invalid tera type/i.test(text) && (isUnknownTera(mon && mon.tera) || /^stellar$/i.test(mon && mon.tera))) return true;
    if (HARD_VALIDATION_PATTERNS.some(pattern => pattern.test(text))) return false;
    return SOFT_VALIDATION_PATTERNS.some(pattern => pattern.test(text));
  }

  function buildValidationReasoning(row, hardCount, warningCount) {
    if (hardCount > 0) {
      return {
        state: 'hard-blocker',
        note: 'Hard validation blockers remain, so this set still needs a direct legality fix.'
      };
    }
    if (warningCount > 0) {
      return {
        state: 'warning-only',
        note: 'Only soft validation warnings remain. The set is still usable, but some checks rely on fallback or manual confirmation.'
      };
    }
    return {
      state: 'clean',
      note: 'No validation blockers remain in the current offline pass.'
    };
  }

  function normalizeValidationRows(rows, sourceTeam) {
    if (!Array.isArray(rows)) return rows;
    return rows.map((row, index) => {
      if (!row || typeof row !== 'object') return row;
      const mon = row.mon || row.set || row.pokemon || (sourceTeam && sourceTeam[index]) || {};
      const warnings = Array.isArray(row.warnings) ? [...row.warnings] : [];

      ['hardIssues', 'hard', 'errors', 'issues'].forEach(key => {
        if (!Array.isArray(row[key])) return;
        const kept = [];
        row[key].forEach(issue => {
          if (isSoftValidationIssue(issue, mon)) warnings.push(issue);
          else kept.push(issue);
        });
        row[key] = kept;
      });

      row.warnings = [...new Set(warnings.filter(Boolean))];
      const hardCount = ['hardIssues', 'hard', 'errors', 'issues']
        .reduce((sum, key) => sum + (Array.isArray(row[key]) ? row[key].length : 0), 0);
      const warningCount = row.warnings.length;
      const reasoning = buildValidationReasoning(row, hardCount, warningCount);

      row.hardIssueCount = hardCount;
      row.warningCount = warningCount;
      row.validationState = reasoning.state;
      row.validationReasoning = reasoning.note;

      if (hardCount === 0) row.status = warningCount ? 'WARNING' : 'VALID';
      if (hardCount === 0 && String(row.confidence || '').toLowerCase() === 'low') {
        row.confidence = warningCount ? 'medium' : 'high';
      }
      return row;
    });
  }

  function installValidationConfidenceGuard() {
    try {
      if (typeof validateTeamAdvanced !== 'function' || validateTeamAdvanced.__submissionPolish) return;
      const original = validateTeamAdvanced;
      validateTeamAdvanced = function submissionPolishValidateTeamAdvanced(sourceTeam) {
        const inputTeam = sourceTeam || (typeof team !== 'undefined' ? team : []);
        const result = original(inputTeam);
        if (result && typeof result.then === 'function') {
          return result.then(rows => normalizeValidationRows(rows, inputTeam));
        }
        return normalizeValidationRows(result, inputTeam);
      };
      validateTeamAdvanced.__submissionPolish = true;
    } catch (err) {
      console.warn('[submission-polish] validation confidence guard skipped:', err.message);
    }
  }

  function panelText(id) {
    const node = $(id);
    return node ? clean(node.innerText || node.textContent || '') : '';
  }

  function currentTeamImport() {
    return clean(($('teamInput') && $('teamInput').value) || '');
  }

  function patientStatusLine() {
    const status = clean(($('status') && $('status').innerText) || '');
    const detail = clean(($('statusText') && $('statusText').innerText) || '');
    if (!status && !detail) return '';
    return `${status}${detail ? ` - ${detail}` : ''}`;
  }

  function sectionBlock(title, body, maxLength = 3600) {
    const text = clean(body);
    if (!text) return '';
    const clipped = text.length > maxLength ? `${text.slice(0, maxLength).trim()}\n...` : text;
    return `\n## ${title}\n\n\`\`\`text\n${clipped}\n\`\`\`\n`;
  }

  function collectConfidenceNotes() {
    const notes = [];
    const validation = panelText('validationResults');
    const detective = panelText('detective');
    const replay = panelText('replayResults');

    if (validation) {
      if (/manual verification|legality is unconfirmed|warning/i.test(validation) && !/unknown move:|invalid ability|ev total|ev stat/i.test(validation)) {
        notes.push('Validation is warning-only right now: the offline pass found ambiguity or fallback-data gaps, not a proven illegal set.');
      } else if (/unknown move:|invalid ability|ev total|ev stat|assault vest|invalid tera type/i.test(validation)) {
        notes.push('Validation still contains hard blockers, so at least one set needs a direct legality fix before the build is clean.');
      } else if (/valid/i.test(validation)) {
        notes.push('Validation is currently clean in the offline pass, with no remaining hard blockers surfaced in the visible panel.');
      }
    }

    if (detective) {
      if (/replay clues/i.test(detective)) {
        notes.push('Hidden-info output is replay-backed here, but it is still clue-driven rather than a full certainty proof.');
      } else if (/blocked/i.test(detective)) {
        notes.push('The hidden-info lane is fully contradicted for at least one modeled line, which is useful negative evidence rather than a blind guess.');
      } else if (/high confidence/i.test(detective)) {
        notes.push('The hidden-info read is currently high confidence, so the export can lean on it as a strong but still model-bounded inference.');
      } else if (/medium confidence|low confidence/i.test(detective)) {
        notes.push('The hidden-info read is still ambiguous, so the export should treat it as a constrained shortlist instead of a solved reveal.');
      }
    } else {
      notes.push('No hidden-info detective snapshot is loaded into this export yet, so opponent-set claims remain outside the current evidence bundle.');
    }

    if (!replay || /paste a replay log|no replay/i.test(replay)) {
      notes.push('No replay evidence is attached yet, so this export is grounded in team and panel analysis rather than battle-log proof.');
    }

    return [...new Set(notes)];
  }

  function confidenceNotesBlock() {
    const notes = collectConfidenceNotes();
    if (!notes.length) return '';
    return [
      '\n## Confidence Notes',
      '',
      ...notes.map(note => `- ${note}`),
      ''
    ].join('\n');
  }

  function submissionSnapshotMarkdown(original) {
    const base = String(original || '').trim();
    if (!base || base.includes('## Submission Snapshot')) return base;

    const teamImport = currentTeamImport();
    const snapshot = [
      '\n---\n',
      '## Submission Snapshot',
      '',
      patientStatusLine() ? `**Patient Status:** ${patientStatusLine()}` : '',
      '',
      '### Judge Demo Path',
      '',
      '1. Load or paste a Showdown team.',
      '2. Run Analyze Patient.',
      '3. Run Advanced Lab and point out Identity, Matchup Matrix, Synergy, and Tera Plan.',
      '4. Run Validate Team to show confidence-based legality checks.',
      '5. Use Suggested Additions for patch lanes and quick swaps.',
      '6. Use KO Actuary for OHKO / 2HKO / 3HKO and reverse-KO risk.',
      '7. Paste replay evidence into Replay Observer and open Hidden Info Detective.',
      '',
      confidenceNotesBlock(),
      '',
      teamImport ? `### Team Import\n\n\`\`\`text\n${teamImport}\n\`\`\`` : '',
      sectionBlock('Sparring Lab Output', panelText('archetypeResults')),
      sectionBlock('Identity Panel', panelText('identityResults')),
      sectionBlock('Synergy Scores', panelText('synergyResults')),
      sectionBlock('Diagnosis', panelText('diagnosis')),
      sectionBlock('Suggested Additions', panelText('assistantResults')),
      sectionBlock('Validation Summary', panelText('validationResults')),
      sectionBlock('Replay Observer Summary', panelText('replayResults')),
      sectionBlock('Hidden Info Detective Summary', panelText('detective')),
      '',
      '### Scope Note',
      '',
      'The deterministic reasoning engine is the core demo. Kimi/Ollama agent modes are optional BYOK workflows; the app remains useful without external model keys.'
    ].filter(Boolean).join('\n');

    return `${base}\n${snapshot}\n`;
  }

  function installMarkdownExportEnhancer() {
    try {
      const clipboard = root.navigator && root.navigator.clipboard;
      if (!clipboard || typeof clipboard.writeText !== 'function' || clipboard.writeText.__submissionPolish) return;
      const originalWriteText = clipboard.writeText.bind(clipboard);
      clipboard.writeText = function submissionPolishWriteText(text) {
        const value = String(text || '');
        const shouldEnhance = /#\s*Nurse Joyless|Nurse Joyless Team Report|Team Report/i.test(value);
        return originalWriteText(shouldEnhance ? submissionSnapshotMarkdown(value) : value);
      };
      clipboard.writeText.__submissionPolish = true;
    } catch (err) {
      console.warn('[submission-polish] markdown export enhancer skipped:', err.message);
    }
  }

  function installDemoBanner() {
    try {
      if (!document || document.querySelector('.submission-demo-banner')) return;
      const host = document.querySelector('.hero-copy .actions') || document.querySelector('.hero-copy');
      if (!host || !host.parentNode || !document.createElement) return;
      const banner = document.createElement('div');
      banner.className = 'submission-demo-banner';
      banner.innerHTML = [
        '<strong>Submission mode:</strong> deterministic Sparring Lab, Tera Plan, validation, KO odds, suggestions, and replay detective are the core demo.',
        '<span>Kimi/Ollama are optional BYOK paths; local reasoning works without API keys.</span>'
      ].join(' ');
      banner.style.cssText = [
        'margin-top:14px',
        'padding:10px 12px',
        'border:1px solid #7c5cff',
        'background:rgba(124,92,255,.12)',
        'box-shadow:0 0 0 1px rgba(255,91,188,.25) inset',
        'font-size:12px',
        'line-height:1.45'
      ].join(';');
      host.parentNode.insertBefore(banner, host.nextSibling);
    } catch (err) {
      console.warn('[submission-polish] demo banner skipped:', err.message);
    }
  }

  function installAgentHonesty() {
    try {
      const output = $('agentOutput');
      if (output && /select an agent/i.test(output.textContent || '')) {
        output.innerHTML = '<div class="agent-welcome"><strong>Local agents ready.</strong><br>Use Local mode for the judged demo. Kimi/Ollama Cloud are optional BYOK paths and may require a proxy on GitHub Pages.</div>';
      }
    } catch (err) {
      console.warn('[submission-polish] agent honesty skipped:', err.message);
    }
  }

  function installCuratedDemoHints() {
    const hints = {
      testDragonSpam: 'Curated demo: shows Dragon pressure, Fairy/Ice liabilities, Tera Plan, and Dragon mirror reasoning.',
      testHazardStack: 'Curated demo: shows Gholdengo-style removal denial, chip loops, field control, and role compression.',
      testSunRoom: 'Curated demo: shows weather + Trick Room identity tension and matchup dependency.'
    };
    Object.entries(hints).forEach(([id, title]) => {
      const button = $(id);
      if (button) button.title = title;
    });
  }

  function installTeraPlanReminder() {
    const addReminder = () => {
      const panels = ['archetypeResults', 'synergyResults'].map($).filter(Boolean);
      panels.forEach(panel => {
        if (!/Tera Plan/i.test(panel.textContent || '')) return;
        if (panel.querySelector && panel.querySelector('.tera-one-resource-note')) return;
        const note = document.createElement('div');
        note.className = 'tera-one-resource-note';
        note.textContent = 'Tera is scored as a single shared resource: one defensive patch or one offensive conversion, not six permanent type changes.';
        note.style.cssText = 'margin:10px 0;padding:8px 10px;border:1px solid #ffd166;color:#ffd166;font-size:11px;';
        panel.appendChild(note);
      });
    };

    try {
      addReminder();
    } catch (_) {}
  }

  function installSubmissionPolish() {
    installValidationConfidenceGuard();
    installMarkdownExportEnhancer();
    installDemoBanner();
    installAgentHonesty();
    installCuratedDemoHints();
    installTeraPlanReminder();
    root.NURSE_JOYLESS_SUBMISSION_POLISH = true;
  }

  if (typeof document !== 'undefined') installSubmissionPolish();
  else installSubmissionPolish();
})();