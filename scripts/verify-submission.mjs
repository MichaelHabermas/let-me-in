import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DOCS_TO_CHECK = [
  'docs/SUBMISSION.md',
  'docs/BENCHMARKS.md',
  'docs/ACCURACY_RESULTS.md',
  'docs/E10_SCENARIO_RESULTS.md',
  'docs/HUMAN_VALIDATION_REPORT.md',
];

const PLACEHOLDER_TOKEN = /_[^_\n]*(PENDING|TBD)[^_\n]*_/;

function findPlaceholders(content) {
  const lines = content.split('\n');
  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('`')) continue;
    if (PLACEHOLDER_TOKEN.test(line)) {
      hits.push({ line: i + 1, text: line.trim() });
    }
  }
  return hits;
}

let hasFailures = false;

for (const relPath of DOCS_TO_CHECK) {
  const absPath = resolve(process.cwd(), relPath);
  const content = readFileSync(absPath, 'utf8');
  const hits = findPlaceholders(content);
  if (hits.length === 0) continue;

  hasFailures = true;
  console.error(`\n${relPath}`);
  for (const hit of hits) {
    console.error(`  L${hit.line}: ${hit.text}`);
  }
}

if (hasFailures) {
  console.error(
    '\nverify:submission failed: unresolved placeholders found in submission-critical docs.',
  );
  process.exit(1);
}

console.log('verify:submission passed: no unresolved placeholders found.');
