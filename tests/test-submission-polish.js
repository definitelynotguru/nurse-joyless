const fs = require('fs');
const vm = require('vm');

function fakeElement(value = '') {
  return {
    value,
    innerHTML: '',
    innerText: value,
    textContent: value,
    style: {},
    className: '',
    dataset: {},
    children: [],
    appendChild(node) { this.children.push(node); },
    querySelector() { return null; },
    closest() { return null; }
  };
}

const elements = {
  teamInput: fakeElement('Great Tusk @ Leftovers'),
  status: fakeElement('Ready'),
  statusText: fakeElement('Warnings only'),
  validationResults: fakeElement('WARNING\nmove exists but legality is unconfirmed; manual verification recommended'),
  detective: fakeElement('Replay clues suggest Leftovers with medium confidence'),
  replayResults: fakeElement('No replay loaded yet'),
  archetypeResults: fakeElement('Tera Plan: defensive pivot'),
  synergyResults: fakeElement('Tera Plan lines stay coherent'),
  diagnosis: fakeElement('Minor speed pressure issue'),
  assistantResults: fakeElement('Consider a scarfer'),
  agentOutput: fakeElement('Select an agent to analyze your data.')
};

let copiedText = '';
const context = {
  console,
  team: [],
  validateTeamAdvanced(sourceTeam) {
    return [
      {
        species: 'Volcanion',
        warnings: [],
        issues: ['move exists but legality is unconfirmed'],
        confidence: 'low'
      },
      {
        species: 'Kingambit',
        warnings: [],
        issues: ['invalid ability'],
        confidence: 'low'
      }
    ];
  },
  navigator: {
    clipboard: {
      writeText(text) {
        copiedText = text;
        return Promise.resolve();
      }
    }
  },
  document: {
    readyState: 'complete',
    getElementById(id) { return elements[id] || null; },
    querySelector(selector) {
      if (selector === '.hero-copy .actions' || selector === '.hero-copy') return fakeElement();
      return null;
    },
    createElement() { return fakeElement(); },
    addEventListener() {}
  },
  window: null,
  MutationObserver: function(){ this.observe = function(){}; },
  setTimeout(fn) { if (typeof fn === 'function') fn(); return 0; },
  clearTimeout() {}
};
context.window = context;

vm.createContext(context);
vm.runInContext(fs.readFileSync('src/submission-polish.js', 'utf8'), context, {
  filename: 'submission-polish.js',
  timeout: 10000
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const index = fs.readFileSync('index.html', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
assert(index.includes('src/submission-polish.js'), 'index.html must load submission-polish.js');
assert(pkg.scripts['submission-polish'], 'package.json must expose npm run submission-polish');
assert(pkg.scripts.test.includes('submission-polish'), 'npm test must include submission-polish');

const rows = context.validateTeamAdvanced([]);
assert(rows[0].status === 'WARNING', 'soft validation issues should downgrade to warnings');
assert(rows[0].hardIssueCount === 0, 'soft validation issues should not stay in hard counts');
assert(rows[0].warningCount === 1, 'soft validation issues should count as warnings');
assert(rows[0].validationState === 'warning-only', 'soft-only rows should advertise warning-only state');
assert(/fallback|manual confirmation/i.test(rows[0].validationReasoning), 'soft-only rows should explain why they remain warnings');
assert(rows[0].confidence === 'medium', 'soft-only rows should not keep low confidence');

assert(rows[1].status !== 'VALID', 'hard blockers should not be cleared');
assert(rows[1].hardIssueCount === 1, 'hard blockers should stay in hard counts');
assert(rows[1].validationState === 'hard-blocker', 'hard blocker rows should advertise blocker state');

context.navigator.clipboard.writeText('# Nurse Joyless Team Report');
assert(copiedText.includes('## Confidence Notes'), 'markdown export should include confidence notes');
assert(copiedText.includes('Validation is warning-only right now'), 'markdown export should explain warning-only validation states');
assert(copiedText.includes('Hidden-info output is replay-backed here'), 'markdown export should explain clue-driven detective reads');
assert(copiedText.includes('No replay evidence is attached yet'), 'markdown export should say when replay evidence is missing');
assert(copiedText.includes('**Patient Status:** Ready - Warnings only'), 'markdown export should keep patient status in the snapshot');

assert(String(elements.agentOutput.innerHTML).includes('Local agents ready'), 'agent honesty should steer the judged path toward local mode');
assert(context.NURSE_JOYLESS_SUBMISSION_POLISH, 'submission polish flag should be set');

console.log('[OK] submission polish passed');