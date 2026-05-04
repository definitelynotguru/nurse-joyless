const fs = require('fs');

const source = fs.readFileSync('src/submission-polish.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(index.includes('src/submission-polish.js'), 'index.html must load submission-polish.js');
assert(source.includes('submissionSnapshotMarkdown'), 'submission polish must enhance Markdown exports');
assert(source.includes('installValidationConfidenceGuard'), 'submission polish must install validation confidence guard');
assert(source.includes('installAgentHonesty'), 'submission polish must make BYOK agent modes explicit');
assert(source.includes('installTeraPlanReminder'), 'submission polish must explain one-Tera resource handling');
assert(pkg.scripts['submission-polish'], 'package.json must expose npm run submission-polish');
assert(pkg.scripts.test.includes('submission-polish'), 'npm test must include submission-polish');

console.log('[OK] submission polish smoke passed');
